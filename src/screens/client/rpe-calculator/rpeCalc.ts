import type { RpeChart } from '../../../services/session.service';
import type { LiftingUnit } from '../../../units/weight';

/**
 * "I did 160×3 @ 8 — what's 5 @ 7?" (2026-10-09).
 *
 * The chart itself comes from the server (GET /sessions/rpe-chart) — it is the table the
 * engine prices every prescription from, and a second copy here would be a second
 * yardstick. This file only reads it. Inputs are whole reps and half-step RPEs, which
 * land exactly on cells, so no interpolation is done here either.
 *
 * The math happens in the athlete's own unit: everything is a ratio of one max, so kg or
 * lb in means the same unit out, and only the final rounding needs to know which.
 */

export interface CalcSet {
  weight: number;
  reps: number;
  rpe: number;
}

/**
 * The smallest jump a gym loads, per unit — the same steps the engine (2.5kg) and the
 * pound display (5lb, a pair of 2.5s) round prescriptions to.
 */
export const LOAD_STEP: Record<LiftingUnit, number> = { kg: 2.5, lb: 5 };

/** Rep counts the chart covers, 1 → its last row. */
export function chartReps(chart: RpeChart): number[] {
  return chart.pctByReps.map((_, i) => i + 1);
}

/** % of 1RM for an exact cell; null off the chart rather than a clamped guess. */
export function pctOf1RM(chart: RpeChart, reps: number, rpe: number): number | null {
  const row = chart.pctByReps[reps - 1];
  const col = chart.rpe.indexOf(rpe);
  if (!row || col < 0) return null;
  return row[col];
}

/** The max a set implies, read the same RIR-aware way the engine reads it. Unrounded. */
export function estimatedMax(chart: RpeChart, set: CalcSet): number | null {
  if (!(set.weight > 0)) return null;
  const pct = pctOf1RM(chart, set.reps, set.rpe);
  return pct ? (set.weight * 100) / pct : null;
}

/** The bar for `reps @ rpe` off a max, on a step the athlete can load. Nearest, like the engine. */
export function loadFor(chart: RpeChart, max: number, target: { reps: number; rpe: number }, unit: LiftingUnit): number | null {
  const pct = pctOf1RM(chart, target.reps, target.rpe);
  if (!pct || !(max > 0)) return null;
  const step = LOAD_STEP[unit];
  return Math.round((max * pct) / 100 / step) * step;
}

/**
 * The set is far enough from failure that its max is the chart's guess at reps the
 * athlete never did — the same bounds under which the engine refuses to move an anchor
 * on it. The answer is still shown (the athlete asked) but labelled as rough.
 */
export function isExtrapolated(chart: RpeChart, set: CalcSet): boolean {
  return set.rpe < chart.nearFailureRpe || set.reps > chart.nearFailureMaxReps;
}
