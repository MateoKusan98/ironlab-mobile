import type { BarLoading } from '../../services/ai-coach.service';
import { platesPerSide } from '../../utils/plateMath';

/**
 * WARM-UP RAMP — the sets between the empty bar and the first working set.
 *
 * Built the way a lifter actually loads a bar, not the way a percentage table reads.
 * Mateo, 2026-10-07: "nobody is gonna warm up like 67.5, 105, 135 — everything will jump
 * 60, 80, 100, 110 top set". So every warm-up weight is a ROUND number (a multiple of
 * 10) that the venue's plates can build, evenly spaced from 60 up to ~90% of the top
 * set. Percent-of-top precision buys nothing in a warm-up and costs a plate change on
 * every jump.
 *
 * Warm-ups are never logged as sets. They would count as hard sets in the volume
 * budget (an unlogged RPE reads as hard), feed the e1RM walk and could even trip a PR
 * check — so they live only on the card, ticked off locally.
 */

export interface WarmupSet {
  weight: number;
  reps: number;
}

/** Every warm-up jump lands on a multiple of this — loadable without arithmetic. */
const ROUND_KG = 10;
/** Where the ramp starts once the top set is heavy enough: the bar plus a 20 a side. */
const FIRST_JUMP_KG = 60;
/** The last warm-up sits about here, so the top set is a step, not a leap. */
const LAST_JUMP_FRACTION = 0.92;
/** …but always at least this far below it, or it is a working set in disguise. */
const MIN_GAP_TO_TOP_KG = 5;
/** Reps on the empty bar — grooving the pattern, not loading it. */
const EMPTY_BAR_REPS = 10;
/** A top set this long is its own warm-up for the last few kilos. */
const HIGH_REP_TOP_SET = 8;

/** More jumps for heavier tops: a 230 deadlift needs more steps than an 80 row. */
function jumpCount(topKg: number, workReps: number): number {
  const base = topKg <= 60 ? 1 : topKg <= 100 ? 2 : topKg <= 150 ? 3 : topKg <= 200 ? 4 : 5;
  return Math.max(1, workReps >= HIGH_REP_TOP_SET ? base - 1 : base);
}

/** Fewer reps as the bar gets heavier, so the warm-up primes without tiring. */
function repsAt(fractionOfTop: number): number {
  if (fractionOfTop <= 0.5) return 5;
  if (fractionOfTop <= 0.7) return 3;
  if (fractionOfTop <= 0.85) return 2;
  return 1;
}

/**
 * `kg`, or the round step below it, whichever this venue can build; null when neither
 * is. Never a half step: falling back to 135 would break the one rule this file has.
 */
function buildableNear(kg: number, bar: BarLoading | null): number | null {
  if (!bar) return kg;
  return [kg, kg - ROUND_KG].find((c) => platesPerSide(c, bar) != null) ?? null;
}

/**
 * The warm-up ramp to `topKg`, empty bar first. Empty when the top set IS (or barely
 * exceeds) the bar — there is nothing to ramp through.
 */
export function warmupRamp(topKg: number, workReps: number, bar: BarLoading | null): WarmupSet[] {
  const barKg = bar?.barKg ?? 20;
  if (!Number.isFinite(topKg) || topKg <= barKg) return [];
  const ramp: WarmupSet[] = [{ weight: barKg, reps: EMPTY_BAR_REPS }];

  const lastTarget = Math.min(
    Math.floor((topKg * LAST_JUMP_FRACTION) / ROUND_KG) * ROUND_KG,
    topKg - MIN_GAP_TO_TOP_KG,
  );
  const n = jumpCount(topKg, workReps);
  const first = topKg >= 100 ? FIRST_JUMP_KG : Math.floor(topKg / 2 / ROUND_KG) * ROUND_KG;

  const targets = n === 1
    ? [lastTarget]
    : Array.from({ length: n }, (_, i) => first + ((lastTarget - first) * i) / (n - 1));

  for (const target of targets) {
    const weight = buildableNear(Math.round(target / ROUND_KG) * ROUND_KG, bar);
    if (weight == null) continue;
    const previous = ramp[ramp.length - 1].weight;
    if (weight <= previous || weight > topKg - MIN_GAP_TO_TOP_KG) continue;
    ramp.push({ weight, reps: repsAt(weight / topKg) });
  }
  return ramp;
}
