import type { ExerciseHistorySession, RepBest } from '../../../services/session.service';
import { LiftingUnit, loggedInUnit } from '../../../units/weight';

/**
 * Below this many sessions with an e1RM, the trend is not drawn. Two points are a line
 * through noise — a single heavy day reads as "+8%" — so the screen says nothing rather
 * than something thin.
 */
export const MIN_TREND_POINTS = 3;

/** The most recent sessions the trend draws; past that the bars are too thin to read. */
export const TREND_WINDOW = 12;

/** Rep counts worth a chip: the records lifters actually talk about. */
const HEADLINE_REPS = [1, 2, 3, 5, 8, 10];

export interface E1rmTrend {
  /** Oldest first, in the athlete's unit. */
  points: number[];
  first: number;
  last: number;
  changePct: number;
}

/** The e1RM line over the last {@link TREND_WINDOW} sessions, or null when too thin to mean anything. */
export function e1rmTrend(sessionsNewestFirst: ExerciseHistorySession[], unit: LiftingUnit): E1rmTrend | null {
  const points = sessionsNewestFirst
    .filter((s) => s.e1rm != null)
    .slice(0, TREND_WINDOW)
    .reverse()
    .map((s) => loggedInUnit(s.e1rm!, unit));
  if (points.length < MIN_TREND_POINTS) return null;
  const first = points[0];
  const last = points[points.length - 1];
  return { points, first, last, changePct: first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0 };
}

/** The rep bests worth showing up top, lightest rep count first. */
export function headlineBests(repBests: RepBest[]): RepBest[] {
  return repBests.filter((b) => HEADLINE_REPS.includes(b.reps));
}
