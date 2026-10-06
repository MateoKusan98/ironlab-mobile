import React, { useRef } from 'react';
import { Alert, Vibration } from 'react-native';
import { sessionService } from '../../../services/session.service';
import { useSettingsStore } from '../../../stores/settings.store';
import { classifyExercise } from '../../../utils/exerciseType';
import { Exercise, LocalSet, nextSetUid } from '../workoutState';

export interface SetEditingDeps {
  sessionId: string;
  exercises: Exercise[];
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  removedSetIdsRef: React.MutableRefObject<Set<string>>;
  markActivity: () => void;
  startRest: (secs: number) => void;
  stopRest: () => void;
  maybeSuggestAdjustment: (exIdx: number, ex: Exercise, set: LocalSet) => Promise<void>;
  exName: (name: string) => string;
}

/**
 * Everything the athlete does to a set: add, edit, prefill, complete, un-complete,
 * remove — and the server writes each one implies.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export function useSetEditing(deps: SetEditingDeps) {
  const { sessionId, exercises, setExercises, removedSetIdsRef, markActivity, startRest, stopRest, maybeSuggestAdjustment, exName } = deps;
  // Remembers which (exercise, field, value) prefill prompts we've already shown,
  // so blurring the same field repeatedly doesn't re-ask for the same value.
  const prefillAskedRef = useRef<Set<string>>(new Set());
  const compoundRestSecs = useSettingsStore((s) => s.compoundRestSecs);
  const isolationRestSecs = useSettingsStore((s) => s.isolationRestSecs);

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

  // Patch a set by its stable uid rather than its index. Use this from async
  // callbacks (e.g. after a save resolves): by the time the promise settles the
  // set may have shifted position — or been removed — so an index would be stale
  // and could clobber the wrong row.
  const patchSetByUid = (exIdx: number, uid: string, patch: Partial<LocalSet>) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exIdx] };
      ex.sets = ex.sets.map((s) => s.uid === uid ? { ...s, ...patch } : s);
      updated[exIdx] = ex;
      return updated;
    });
  };

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
    const display = isWeight ? `${value}kg` : `RPE ${value}`;
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

  const completeSet = async (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    // Ignore taps while a save is already in flight — otherwise a double-tap can
    // start a second save (or an un-complete) before the first has returned an id,
    // leaving the server and the UI out of sync.
    if (set.isSaving) return;
    if (!set.reps && !set.weight) {
      Alert.alert('Empty set', 'Enter at least reps or weight before marking complete.');
      return;
    }

    Vibration.vibrate(40);
    markActivity();
    const restDuration = classifyExercise(ex.name) === 'compound' ? compoundRestSecs : isolationRestSecs;
    startRest(restDuration);
    patchSetByUid(exIdx, set.uid, { isCompleted: true, isSaving: true });

    try {
      if (set.id) {
        await sessionService.updateSet(set.id, {
          repsCompleted: set.reps ? parseInt(set.reps) : undefined,
          weightUsed: set.weight ? parseFloat(set.weight) : undefined,
          rpe: set.rpe ? parseFloat(set.rpe) : undefined,
          isCompleted: true,
        });
        patchSetByUid(exIdx, set.uid, { isSaving: false });
      } else {
        const saved = await sessionService.addSet(sessionId, {
          exerciseName: ex.name,
          exerciseOrder: ex.order,
          setNumber: set.setNumber,
          ...(ex.substitutedFor ? { substitutedFor: ex.substitutedFor } : {}),
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
          targetRpe: set.targetRpe,
          repsCompleted: set.reps ? parseInt(set.reps) : undefined,
          weightUsed: set.weight ? parseFloat(set.weight) : undefined,
          rpe: set.rpe ? parseFloat(set.rpe) : undefined,
          isCompleted: true,
        });
        if (saved.prs && saved.prs.length > 0) {
          Vibration.vibrate([0, 60, 40, 60]);
        }
        patchSetByUid(exIdx, set.uid, { id: saved.id, prs: saved.prs, isSaving: false });
      }
      // After the set is safely on the server, never before: the suggestion reads the set
      // log server-side, and asking about a set that failed to save would recompute
      // against the previous one.
      maybeSuggestAdjustment(exIdx, ex, set);
    } catch {
      patchSetByUid(exIdx, set.uid, { isCompleted: false, isSaving: false });
      Alert.alert('Error', 'Could not save set. Check connection.');
    }
  };

  const uncompleteSet = async (exIdx: number, setIdx: number) => {
    const set = exercises[exIdx].sets[setIdx];
    // Don't let an un-complete race an in-flight save of the same set.
    if (set.isSaving) return;
    const prevPrs = set.prs;

    Vibration.vibrate(30);
    stopRest();
    // Un-completing also clears any PR this set earned — the backend drops the
    // PR flag, so mirror that locally to hide the trophy (and keep it out of the
    // end-of-session summary).
    patchSetByUid(exIdx, set.uid, { isCompleted: false, prs: undefined });

    if (set.id) {
      try {
        await sessionService.updateSet(set.id, { isCompleted: false });
      } catch {
        patchSetByUid(exIdx, set.uid, { isCompleted: true, prs: prevPrs });
        Alert.alert('Error', 'Could not update set. Check connection.');
      }
    }
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    const ex = exercises[exIdx];
    const set = ex.sets[setIdx];
    // Don't pull a set out from under an in-flight save.
    if (set.isSaving) return;

    const doRemove = () => {
      // Delete the persisted row if this set was already saved; ignore failures
      // so the local UI still updates. Remember the id either way — that's what
      // stops a failed delete from resurrecting the set on the next resume.
      if (set.id) {
        removedSetIdsRef.current.add(set.id);
        sessionService.deleteSet(set.id).catch(() => {});
      }
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
