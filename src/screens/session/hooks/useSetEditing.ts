import React, { useRef } from 'react';
import { Alert } from 'react-native';
import { sessionService } from '../../../services/session.service';
import { Exercise, LocalSet, nextSetUid } from '../workoutState';
import { loggedAsOf, newClientSetId, patchSetByUid, rememberRemoval } from '../setSync';
import type { PushResult } from './useSetSync';
import { LiftingUnit, unitLabel } from '../../../units/weight';
import * as haptics from '../../../haptics/haptics';
import { useRestSecsFor } from './useRestSecsFor';

export interface SetEditingDeps {
  exercises: Exercise[];
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  removedSetIdsRef: React.MutableRefObject<Set<string>>;
  markActivity: () => void;
  startRest: (secs: number) => void;
  stopRest: () => void;
  maybeSuggestAdjustment: (exIdx: number, ex: Exercise, set: LocalSet) => Promise<void>;
  exName: (name: string) => string;
  pushSet: (located: { exIdx: number; ex: Exercise; set: LocalSet }) => Promise<PushResult>;
  flushPending: () => Promise<boolean>;
  unsyncedCount: number;
  unit: LiftingUnit;
}

/**
 * Everything the athlete does to a set: add, edit, prefill, complete, un-complete,
 * remove — and the server writes each one implies.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export function useSetEditing(deps: SetEditingDeps) {
  const {
    exercises, setExercises, removedSetIdsRef, markActivity, startRest, stopRest, maybeSuggestAdjustment, exName,
    pushSet, flushPending, unsyncedCount, unit,
  } = deps;
  // Remembers which (exercise, field, value) prefill prompts we've already shown,
  // so blurring the same field repeatedly doesn't re-ask for the same value.
  const prefillAskedRef = useRef<Set<string>>(new Set());
  const restSecsFor = useRestSecsFor();

  const addSet = (exIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exIdx] };
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets = [
        ...ex.sets,
        {
          uid: nextSetUid(),
          setNumber: ex.sets.length + 1,
          reps: lastSet?.reps ?? '',
          weight: lastSet?.weight ?? '',
          rpe: '',
          isCompleted: false,
        },
      ];
      updated[exIdx] = ex;
      return updated;
    });
  };

  const updateExerciseField = (exIdx: number, field: 'techniqueRating' | 'exerciseNotes', value: number | string) => {
    setExercises((prev) => prev.map((ex, i) => i === exIdx ? { ...ex, [field]: value } : ex));
  };

  const updateSetField = (exIdx: number, setIdx: number, field: keyof LocalSet, value: string | boolean) => {
    setSetState(exIdx, setIdx, { [field]: value });
  };

  // Merge a partial update into one set. Use this (not updateSetField) when
  // changing multiple fields at once or non-string/boolean fields like `prs`.
  const setSetState = (exIdx: number, setIdx: number, patch: Partial<LocalSet>) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exIdx] };
      ex.sets = ex.sets.map((s, i) => i === setIdx ? { ...s, ...patch } : s);
      updated[exIdx] = ex;
      return updated;
    });
  };

  // Patch a set by its stable uid rather than its index: an index read before an
  // await can point at a different row by the time the promise settles.
  const patchSet = (uid: string, patch: Partial<LocalSet>) =>
    setExercises((prev) => patchSetByUid(prev, uid, patch));

  // After editing one set's weight/RPE, offer to copy that value into the
  // exercise's other not-yet-completed sets (e.g. bump Squat 120→125 and apply
  // 125 to the remaining sets in one tap). Only prompts when there's actually a
  // different value to copy into, and never re-asks for the same value.
  const maybePromptPrefill = (exIdx: number, setIdx: number, field: 'weight' | 'rpe') => {
    const ex = exercises[exIdx];
    const value = ex?.sets[setIdx]?.[field];
    if (!ex || !value) return;

    const targets = ex.sets.filter((s, i) => i !== setIdx && !s.isCompleted && s[field] !== value);
    if (targets.length === 0) return;

    const key = `${exIdx}:${field}:${value}`;
    if (prefillAskedRef.current.has(key)) return;
    prefillAskedRef.current.add(key);

    const isWeight = field === 'weight';
    const display = isWeight ? `${value}${unitLabel(unit)}` : `RPE ${value}`;
    Alert.alert(
      'Apply to other sets?',
      `Use ${display} for the other ${targets.length} ${targets.length > 1 ? 'sets' : 'set'} of ${ex.name}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () =>
            setExercises((prev) => {
              const updated = [...prev];
              const e = { ...updated[exIdx] };
              e.sets = e.sets.map((s, i) =>
                i !== setIdx && !s.isCompleted ? { ...s, [field]: value } : s,
              );
              updated[exIdx] = e;
              return updated;
            }),
        },
      ],
    );
  };

  /**
   * Tick a set. It is ticked NOW, whatever the signal: the save runs behind it, and a save
   * that fails for want of signal leaves the set ticked and queued (useSetSync) instead of
   * un-ticking it and asking the athlete to try again — see setSync.ts.
   *
   * `rpe` is the one-tap path (QuickRpeChips): rate and tick in a single touch. It is
   * folded in here rather than set first and ticked after, because the state update
   * would not have landed by the time this reads the set — the tick would save the
   * set without the rating the athlete just gave it.
   */
  const completeSet = async (exIdx: number, setIdx: number, rpe?: string) => {
    const ex = exercises[exIdx];
    const set = rpe ? { ...ex.sets[setIdx], rpe } : ex.sets[setIdx];
    // Ignore taps while a save is already in flight — otherwise a double-tap can
    // start a second save (or an un-complete) before the first has returned an id,
    // leaving the server and the UI out of sync.
    if (set.isSaving) return;
    if (!set.reps && !set.weight) {
      Alert.alert('Empty set', 'Enter at least reps or weight before marking complete.');
      return;
    }

    haptics.setDone();
    markActivity();
    startRest(restSecsFor(ex.name));

    const ticked: LocalSet = {
      ...set,
      isCompleted: true,
      clientSetId: set.clientSetId ?? newClientSetId(),
      // A row the server already holds keeps the name and time it was saved with.
      ...(set.id ? {} : { performedAt: new Date().toISOString(), loggedAs: loggedAsOf(ex) }),
    };
    patchSet(set.uid, ticked);

    const result = await pushSet({ exIdx, ex, set: ticked });
    if (result.status === 'saved') {
      if (result.prs && result.prs.length > 0) haptics.prEarned();
      // After the set is safely on the server, never before: the suggestion reads the set
      // log server-side, and asking about a set that has not landed would recompute
      // against the previous one.
      maybeSuggestAdjustment(exIdx, ex, ticked);
      // This one got through, so the signal is back — send anything still waiting.
      if (unsyncedCount > 0) flushPending();
    } else if (result.status === 'rejected') {
      Alert.alert('Error', result.message ? `Could not save set: ${result.message}` : 'Could not save set.');
    }
  };

  const uncompleteSet = async (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    // Don't let an un-complete race an in-flight save of the same set.
    if (set.isSaving) return;

    haptics.lightTap();
    stopRest();
    // Un-completing also clears any PR this set earned — the backend drops the
    // PR flag, so mirror that locally to hide the trophy (and keep it out of the
    // end-of-session summary). A set the server never heard of has nothing to undo.
    const everSent = !!(set.id || set.clientSetId);
    const unticked: LocalSet = { ...set, isCompleted: false, prs: undefined, unsynced: everSent && set.unsynced };
    patchSet(set.uid, unticked);
    if (!everSent) return;

    const result = await pushSet({ exIdx, ex, set: unticked });
    if (result.status === 'rejected') {
      Alert.alert('Error', result.message ? `Could not update set: ${result.message}` : 'Could not update set.');
    }
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    // Don't pull a set out from under an in-flight save.
    if (set.isSaving) return;

    const doRemove = () => {
      // Delete the persisted row if this set was already saved; ignore failures
      // so the local UI still updates. Remember it either way — that's what
      // stops a failed delete from resurrecting the set on the next resume.
      const serverId = rememberRemoval(set, removedSetIdsRef.current);
      if (serverId) sessionService.deleteSet(serverId).catch(() => {});
      // If we're deleting the set that kicked off the current rest countdown,
      // stop the rest — there's no set left to rest from.
      if (set.isCompleted) stopRest();
      setExercises((prev) => {
        const updated = [...prev];
        const e = { ...updated[exIdx] };
        // Drop by uid and renumber the survivors to a contiguous 1..N so the
        // display and any subsequently-added set stay in sequence.
        e.sets = e.sets
          .filter((s) => s.uid !== set.uid)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        updated[exIdx] = e;
        return updated;
      });
    };

    // Confirm before deleting a set that holds logged data; drop an empty,
    // never-saved row instantly (nothing to lose).
    if (set.id || set.isCompleted) {
      Alert.alert(
        'Remove set?',
        `This will delete set ${set.setNumber} of ${exName(ex.name)}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: doRemove },
        ],
      );
    } else {
      doRemove();
    }
  };

  return { addSet, updateExerciseField, updateSetField, maybePromptPrefill, completeSet, uncompleteSet, removeSet };
}
