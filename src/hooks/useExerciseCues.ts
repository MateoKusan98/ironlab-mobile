import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { exerciseCueService, exerciseCueKey, ExerciseCue } from '../services/exerciseCue.service';

export interface CueReminder {
  name: string;
  cues: ExerciseCue[];
}

export interface ExerciseCues {
  /** The athlete's saved cues, keyed by normalized exercise name. */
  cuesByKey: Map<string, ExerciseCue[]>;
  /** The reminder currently popped up, or null when nothing is showing. */
  cueReminder: CueReminder | null;
  dismissReminder: () => void;
  savingCue: boolean;
  /** Returns false when the save failed, so the caller can surface the error. */
  saveCue: (exerciseName: string, text: string) => Promise<boolean>;
  /**
   * Optimistic delete; returns false (and restores) when the server rejects it.
   * Refuses form-check cues outright — they are derived, not stored.
   */
  deleteCue: (cue: ExerciseCue) => Promise<boolean>;
}

/**
 * The athlete's exercise cues and the reminder that pops them up at the right
 * moment: both the ones they wrote themselves ("keep elbows tucked") and the
 * corrections their last AI form check on that movement raised, which the server
 * derives and returns in the same list.
 *
 * Cues are kept in a map keyed by normalized exercise name rather than merged onto
 * the exercise list, so adding/deleting a cue and matching it to the current
 * exercise stay simple and never fight the set-logging state.
 *
 * `currentExerciseName` is the exercise the athlete is about to do — pass the first
 * one with an incomplete set. When it becomes an exercise that has cues, the
 * reminder fires once per session; already-reminded keys are persisted to disk
 * (keyed by session) so resuming mid-workout stays quiet.
 *
 * @param ready pass false while the session is still loading, to hold the reminder
 *   back until the real exercise list has arrived.
 */
export function useExerciseCues(
  sessionId: string,
  currentExerciseName: string | null,
  ready: boolean,
): ExerciseCues {
  const [cuesByKey, setCuesByKey] = useState<Map<string, ExerciseCue[]>>(new Map());
  const [cueReminder, setCueReminder] = useState<CueReminder | null>(null);
  const [savingCue, setSavingCue] = useState(false);

  // Exercise keys already reminded about this session, so completing sets (or
  // resuming the workout) doesn't pop the same reminder twice.
  const remindedRef = useRef<Set<string>>(new Set());
  const cueRemindedKey = `cueReminded:${sessionId}`;

  const persistReminded = useCallback(() => {
    AsyncStorage.setItem(cueRemindedKey, JSON.stringify([...remindedRef.current])).catch(() => {});
  }, [cueRemindedKey]);

  // Load saved cues, and which reminders already fired this session.
  useEffect(() => {
    AsyncStorage.getItem(cueRemindedKey)
      .then((raw) => {
        if (raw) {
          try {
            for (const k of JSON.parse(raw) as string[]) remindedRef.current.add(k);
          } catch {
            /* ignore malformed cache */
          }
        }
      })
      .catch(() => {});

    exerciseCueService.getCues()
      .then((cues) => {
        const map = new Map<string, ExerciseCue[]>();
        for (const c of cues) {
          const list = map.get(c.exerciseKey) ?? [];
          list.push(c);
          map.set(c.exerciseKey, list);
        }
        setCuesByKey(map);
      })
      .catch(() => {});
  }, [cueRemindedKey]);

  // Pop the reminder for the exercise the athlete is about to do. Fires on load
  // when that exercise is first, and again each time completing the prior exercise
  // makes a new cued exercise current.
  useEffect(() => {
    if (!ready) return;
    if (cueReminder) return; // don't stack reminders
    if (cuesByKey.size === 0) return;
    if (!currentExerciseName) return;
    const key = exerciseCueKey(currentExerciseName);
    const cues = cuesByKey.get(key);
    if (cues?.length && !remindedRef.current.has(key)) {
      remindedRef.current.add(key);
      persistReminded();
      setCueReminder({ name: currentExerciseName, cues });
    }
  }, [currentExerciseName, cuesByKey, ready, cueReminder, persistReminded]);

  const dismissReminder = useCallback(() => setCueReminder(null), []);

  const saveCue = useCallback(async (exerciseName: string, text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || savingCue) return false;
    setSavingCue(true);
    try {
      const saved = await exerciseCueService.addCue({ exerciseName, text: trimmed });
      setCuesByKey((prev) => {
        const next = new Map(prev);
        next.set(saved.exerciseKey, [saved, ...(next.get(saved.exerciseKey) ?? [])]);
        return next;
      });
      // Don't turn around and remind them of a cue they just wrote this session.
      remindedRef.current.add(saved.exerciseKey);
      persistReminded();
      return true;
    } catch {
      return false;
    } finally {
      setSavingCue(false);
    }
  }, [savingCue, persistReminded]);

  const deleteCue = useCallback(async (cue: ExerciseCue): Promise<boolean> => {
    // A form-check cue is derived from the verdict record, not a row: there is
    // nothing to delete, and the server would 404. It leaves on its own when the
    // verdict ages out or the athlete re-films the lift clean.
    if (cue.source === 'form-check') return false;

    // Snapshot from the closure, not from inside the updater: the updater runs at
    // render time, so anything it assigns is still unset when the await resumes.
    const prev = cuesByKey;
    setCuesByKey((p) => {
      const next = new Map(p);
      const list = (next.get(cue.exerciseKey) ?? []).filter((c) => c.id !== cue.id);
      if (list.length) next.set(cue.exerciseKey, list);
      else next.delete(cue.exerciseKey);
      return next;
    });
    try {
      await exerciseCueService.deleteCue(cue.id);
      return true;
    } catch {
      setCuesByKey(prev); // restore on failure
      return false;
    }
  }, [cuesByKey]);

  return { cuesByKey, cueReminder, dismissReminder, savingCue, saveCue, deleteCue };
}
