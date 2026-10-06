import React, { useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { aiCoachService, InSessionAdjustment } from '../../../services/ai-coach.service';
import { Exercise, LocalSet, shouldAskForAdjustment } from '../workoutState';

/**
 * The live in-session load cut: asked for after an overshoot, offered under the
 * exercise it applies to, applied to that exercise's remaining sets on accept.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export function useLoadAdjustment(
  sessionId: string,
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>,
) {
  // The live in-session load cut, and the exercise it belongs to. At most one is on
  // screen at a time — a workout is not the place for a queue of decisions.
  const [adjustment, setAdjustment] = useState<{ exIdx: number; data: InSessionAdjustment } | null>(null);
  // Sets we've already asked about. A set is one observation and gets one question.
  const adjustAskedRef = useRef<Set<string>>(new Set());

  /**
   * IN-SESSION AUTOREGULATION. A set came back harder than the plan asked for, and there
   * are more of them queued up — ask whether the rest should come down.
   *
   * Fires only on a real overshoot and only once per set, so an ordinary workout costs
   * zero requests. The backend owns the decision and every gate in it (and can only ever
   * answer with a LIGHTER weight); this side just asks the question and renders the
   * answer.
   *
   * Wrapped and silent on failure. A load suggestion is a side feature, and a completed
   * set must never fail because one could not be generated.
   */
  const maybeSuggestAdjustment = async (exIdx: number, ex: Exercise, set: LocalSet) => {
    if (!shouldAskForAdjustment(set)) return;

    const key = `${ex.name}:${set.uid}`;
    if (adjustAskedRef.current.has(key)) return;
    adjustAskedRef.current.add(key);

    try {
      const data = await aiCoachService.getInSessionAdjustment(sessionId, ex.name);
      if (data) setAdjustment({ exIdx, data });
    } catch {
      // Silent by design — see above.
    }
  };

  /**
   * Take the cut. Rewrites the WEIGHT INPUT of every set of this exercise the athlete has
   * not done yet, and the plate stack along with it, while leaving targetWeight (the
   * prescription, and what the API is told) untouched — the debrief should still see that
   * this session went under what was asked for, because it did.
   */
  const applyAdjustment = () => {
    if (!adjustment) return;
    const { exIdx, data } = adjustment;
    setExercises((prev) => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s) => s.isCompleted
        ? s
        : { ...s, weight: String(data.suggestedWeight), adjustedWeight: data.suggestedWeight }),
    }));
    setAdjustment(null);
    Vibration.vibrate(30);
  };

  const dismissAdjustment = () => setAdjustment(null);

  return { adjustment, maybeSuggestAdjustment, applyAdjustment, dismissAdjustment };
}
