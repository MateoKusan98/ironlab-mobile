import type { Exercise } from './workoutState';
import { KEY_EXERCISE_PATTERN } from './exerciseCatalog';

/**
 * "Running late — I have 45 minutes." Fits what is left of today's session into the
 * time the athlete has, by cutting sets they have not done yet.
 *
 * The coaching rule, in order:
 *   1. The main work is untouchable: the competition lifts and their variations, and
 *      whatever the session opens with (the plan leads with its priority). If the main
 *      work alone does not fit, say so — do not shave a squat to fit a lunch break.
 *   2. Trim accessories ONE SET AT A TIME, always from the one with the most sets
 *      left, down to two sets each. Two sets of everything keeps the muscle coverage
 *      the session was built for — the currency of a hypertrophy day, and harmless on
 *      a strength day where the accessories were support work anyway.
 *   3. Only then drop accessories whole, from the end of the session forward.
 *
 * Load is never touched: being short on time is a reason to do less, not lighter.
 * Logged sets are history and are never removed; neither is a set the server already
 * holds (it would need a delete, and a cut is meant to be instant and offline-safe).
 */

// The working part of a set — unrack, reps, rerack. Most sets are 20–60 s; 45 errs
// toward over-estimating so a cut lands inside the time, not just past it.
const SET_WORK_SECS = 45;
// Walking to the next station, loading it, and its warm-ups. A barbell lift's warm-up
// ramp alone is several minutes, a machine's is one; 2 minutes is the honest middle.
const EXERCISE_CHANGEOVER_SECS = 120;
// Below two sets an accessory has stopped training anything; past that, drop it whole.
const MIN_ACCESSORY_SETS = 2;

export interface TimeCutChange {
  exIdx: number;
  name: string;
  /** Sets still to do, before and after the cut. `to` 0 = dropped. */
  from: number;
  to: number;
}

export interface TimeCutPlan {
  /** Sets still to do per exercise index after the cut. */
  keep: number[];
  changes: TimeCutChange[];
  /** What is left, in minutes, before and after the cut. */
  minutesBefore: number;
  minutesAfter: number;
  /** Main work alone, in minutes — shown when even that does not fit. */
  mainWorkMinutes: number;
  fits: boolean;
}

export interface TimeCutInput {
  exercises: Exercise[];
  minutesAvailable: number;
  /** Rest after a set of this movement, in seconds (the athlete's own rest settings). */
  restSecsFor: (exerciseName: string) => number;
}

/** Sets not done yet. */
const openSets = (ex: Exercise) => ex.sets.filter((s) => !s.isCompleted).length;
/** Open sets the cut may remove: never a set the server already holds. */
const removableSets = (ex: Exercise) => ex.sets.filter((s) => !s.isCompleted && !s.id).length;

function isMainWork(ex: Exercise, exIdx: number): boolean {
  return exIdx === 0 || KEY_EXERCISE_PATTERN.test(ex.substitutedFor ?? ex.name);
}

/** Seconds left for one exercise with `sets` still to do. */
function exerciseSecs(ex: Exercise, sets: number, restSecsFor: TimeCutInput['restSecsFor']): number {
  if (sets <= 0) return 0;
  // An exercise already under way has had its changeover.
  const changeover = ex.sets.some((s) => s.isCompleted) ? 0 : EXERCISE_CHANGEOVER_SECS;
  return changeover + sets * (SET_WORK_SECS + restSecsFor(ex.name));
}

function totalSecs(exercises: Exercise[], keep: number[], restSecsFor: TimeCutInput['restSecsFor']): number {
  return exercises.reduce((sum, ex, i) => sum + exerciseSecs(ex, keep[i], restSecsFor), 0);
}

/** Estimated minutes for what is left of the session, with nothing cut. */
export function minutesLeft(exercises: Exercise[], restSecsFor: TimeCutInput['restSecsFor']): number {
  return Math.round(totalSecs(exercises, exercises.map(openSets), restSecsFor) / 60);
}

export function planTimeCut({ exercises, minutesAvailable, restSecsFor }: TimeCutInput): TimeCutPlan {
  const budget = minutesAvailable * 60;
  const before = exercises.map(openSets);
  // The floor each exercise can be cut to: main work keeps everything, and nothing
  // goes below the sets the cut is not allowed to remove.
  const floor = exercises.map((ex, i) => (isMainWork(ex, i) ? before[i] : before[i] - removableSets(ex)));
  const keep = [...before];
  const over = () => totalSecs(exercises, keep, restSecsFor) > budget;

  trimAccessorySets(keep, floor, over);
  dropAccessories(keep, floor, over);

  const mainOnly = exercises.map((ex, i) => (isMainWork(ex, i) ? before[i] : floor[i]));
  return {
    keep,
    changes: exercises
      .map((ex, exIdx) => ({ exIdx, name: ex.name, from: before[exIdx], to: keep[exIdx] }))
      .filter((c) => c.to !== c.from),
    minutesBefore: Math.round(totalSecs(exercises, before, restSecsFor) / 60),
    minutesAfter: Math.round(totalSecs(exercises, keep, restSecsFor) / 60),
    mainWorkMinutes: Math.round(totalSecs(exercises, mainOnly, restSecsFor) / 60),
    fits: !over(),
  };
}

/** Rule 2: one set at a time from the accessory with the most left, down to two. */
function trimAccessorySets(keep: number[], floor: number[], over: () => boolean): void {
  while (over()) {
    let pick = -1;
    keep.forEach((sets, i) => {
      const trimFloor = Math.max(floor[i], MIN_ACCESSORY_SETS);
      // Ties go to the later exercise: the plan front-loads what matters.
      if (sets > trimFloor && (pick === -1 || sets >= keep[pick])) pick = i;
    });
    if (pick === -1) return;
    keep[pick] -= 1;
  }
}

/** Rule 3: drop whole accessories, last first. */
function dropAccessories(keep: number[], floor: number[], over: () => boolean): void {
  for (let i = keep.length - 1; i >= 0 && over(); i--) {
    keep[i] = Math.min(keep[i], floor[i]);
  }
}

/**
 * The exercise list with the cut applied: each exercise keeps its first `keep[i]` open
 * sets, removable sets are dropped from the end, and an exercise left with no sets at
 * all is removed. Pure — the caller puts it into state.
 */
export function applyTimeCut(exercises: Exercise[], keep: number[]): Exercise[] {
  return exercises
    .map((ex, i) => {
      let toRemove = openSets(ex) - keep[i];
      if (toRemove <= 0) return ex;
      const sets = [...ex.sets];
      for (let s = sets.length - 1; s >= 0 && toRemove > 0; s--) {
        if (!sets[s].isCompleted && !sets[s].id) {
          sets.splice(s, 1);
          toRemove--;
        }
      }
      return { ...ex, sets: sets.map((set, n) => ({ ...set, setNumber: n + 1 })) };
    })
    .filter((ex) => ex.sets.length > 0)
    .map((ex, order) => ({ ...ex, order }));
}
