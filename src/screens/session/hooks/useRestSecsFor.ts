import { useCallback } from 'react';
import { useSettingsStore } from '../../../stores/settings.store';
import { classifyExercise } from '../../../utils/exerciseType';

/**
 * The rest after a set of this movement, from the athlete's own rest settings. One rule
 * for the rest timer AND the "short on time" estimate, so the minutes the cut promises
 * are the minutes the timer will actually run.
 */
export function useRestSecsFor(): (exerciseName: string) => number {
  const compoundRestSecs = useSettingsStore((s) => s.compoundRestSecs);
  const isolationRestSecs = useSettingsStore((s) => s.isolationRestSecs);
  return useCallback(
    (exerciseName: string) => (classifyExercise(exerciseName) === 'compound' ? compoundRestSecs : isolationRestSecs),
    [compoundRestSecs, isolationRestSecs],
  );
}
