import React, { useMemo, useState } from 'react';
import { Exercise } from '../workoutState';
import { applyTimeCut, minutesLeft, planTimeCut, TimeCutPlan } from '../timeCut';
import { useRestSecsFor } from './useRestSecsFor';

export interface TimeCut {
  /** Estimated minutes for what is left, at the athlete's rest settings; 0 = nothing left. */
  minutesLeft: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The minutes picked in the sheet, and the cut it implies. */
  minutesAvailable: number | null;
  setMinutesAvailable: (minutes: number | null) => void;
  plan: TimeCutPlan | null;
  apply: () => void;
}

/** "Short on time?" — the sheet's state and the cut it applies (rules in timeCut.ts). */
export function useTimeCut(
  exercises: Exercise[],
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>,
): TimeCut {
  const restSecsFor = useRestSecsFor();
  const [open, setOpenState] = useState(false);
  const [minutesAvailable, setMinutesAvailable] = useState<number | null>(null);

  const plan = useMemo(
    () => (minutesAvailable == null ? null : planTimeCut({ exercises, minutesAvailable, restSecsFor })),
    [exercises, minutesAvailable, restSecsFor],
  );

  const setOpen = (next: boolean) => {
    setOpenState(next);
    if (!next) setMinutesAvailable(null);
  };

  const apply = () => {
    // Applied to the list the plan was computed from: `keep` is indexed by exercise.
    if (plan) setExercises(applyTimeCut(exercises, plan.keep));
    setOpen(false);
  };

  return {
    minutesLeft: minutesLeft(exercises, restSecsFor),
    open, setOpen, minutesAvailable, setMinutesAvailable, plan, apply,
  };
}
