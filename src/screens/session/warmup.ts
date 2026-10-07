import { platesPerSide, PlateSet } from '../../utils/plateMath';
import type { LiftingUnit } from '../../units/weight';

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
 * In pounds the same rule reads the way a pound gym loads: 135, 185, 225, 275 — a 45 a
 * side, then a 25 on top, then another 45. Never 132.3, which is 60kg in a costume.
 *
 * Warm-ups are never logged as sets. They would count as hard sets in the volume
 * budget (an unlogged RPE reads as hard), feed the e1RM walk and could even trip a PR
 * check — so they live only on the card, ticked off locally.
 */

export interface WarmupSet {
  weight: number;
  reps: number;
}

/** Reps on the empty bar — grooving the pattern, not loading it. */
const EMPTY_BAR_REPS = 10;
/** A top set this long is its own warm-up for the last few kilos. */
const HIGH_REP_TOP_SET = 8;
/** The last warm-up sits about here, so the top set is a step, not a leap. */
const LAST_JUMP_FRACTION = 0.92;

/** How one unit's gym spells "a round number". */
interface RampScale {
  emptyBar: number;
  /** Where the ramp starts once the top set is heavy enough… */
  firstJump: number;
  /** …which is from this top set up. */
  firstJumpFrom: number;
  /** The last warm-up is always at least this far below the top, or it is a working set in disguise. */
  minGapToTop: number;
  /** Top-set weights past which one more jump is added: a 230 deadlift needs more steps than an 80 row. */
  jumpBreaks: number[];
  /** The round load at or below `w`. */
  roundDown: (w: number) => number;
  /** Round loads to try for a target, preferred first. Never a half step. */
  candidates: (target: number) => number[];
}

/** Every kg warm-up jump lands on a multiple of this — loadable without arithmetic. */
const ROUND_KG = 10;

const KG: RampScale = {
  emptyBar: 20,
  // The bar plus a 20 a side.
  firstJump: 60,
  firstJumpFrom: 100,
  minGapToTop: 5,
  jumpBreaks: [60, 100, 150, 200],
  roundDown: (w) => Math.floor(w / ROUND_KG) * ROUND_KG,
  candidates: (target) => {
    const round = Math.round(target / ROUND_KG) * ROUND_KG;
    return [round, round - ROUND_KG];
  },
};

/**
 * The loads a pound gym warms up through: 10s, 25s, then 45s a side with at most a 25 on
 * top. The pound twin of "a multiple of 10".
 */
const LB_ROUND_LOADS = [65, 95, 135, 185, 225, 275, 315, 365, 405, 455, 495, 545, 585, 635, 675, 725, 765, 815];

const LB: RampScale = {
  emptyBar: 45,
  // A 45 a side — "one plate".
  firstJump: 135,
  firstJumpFrom: 225,
  minGapToTop: 10,
  // ≈ the kg breaks: 61 / 102 / 143 / 184kg.
  jumpBreaks: [135, 225, 315, 405],
  roundDown: (w) => [...LB_ROUND_LOADS].reverse().find((l) => l <= w) ?? 0,
  candidates: (target) => {
    // A tie goes UP: halfway between 185 and 225 a pound lifter loads two plates.
    const nearest = LB_ROUND_LOADS.reduce((best, l) => (Math.abs(l - target) <= Math.abs(best - target) ? l : best));
    const below = [...LB_ROUND_LOADS].reverse().find((l) => l < nearest);
    return below != null ? [nearest, below] : [nearest];
  },
};

function jumpCount(top: number, workReps: number, scale: RampScale): number {
  const base = 1 + scale.jumpBreaks.filter((b) => top > b).length;
  return Math.max(1, workReps >= HIGH_REP_TOP_SET ? base - 1 : base);
}

/** Fewer reps as the bar gets heavier, so the warm-up primes without tiring. */
function repsAt(fractionOfTop: number): number {
  if (fractionOfTop <= 0.5) return 5;
  if (fractionOfTop <= 0.7) return 3;
  if (fractionOfTop <= 0.85) return 2;
  return 1;
}

/** The first round load near `target` this venue can build; null when none is. */
function buildableNear(target: number, scale: RampScale, bar: PlateSet | null): number | null {
  const candidates = scale.candidates(target);
  if (!bar) return candidates[0];
  return candidates.find((c) => platesPerSide(c, bar) != null) ?? null;
}

/**
 * The warm-up ramp to `top`, empty bar first, all in `unit` (the unit `bar` is in too).
 * Empty when the top set IS (or barely exceeds) the bar — there is nothing to ramp through.
 */
export function warmupRamp(top: number, workReps: number, bar: PlateSet | null, unit: LiftingUnit = 'kg'): WarmupSet[] {
  const scale = unit === 'lb' ? LB : KG;
  const emptyBar = bar?.bar ?? scale.emptyBar;
  if (!Number.isFinite(top) || top <= emptyBar) return [];
  const ramp: WarmupSet[] = [{ weight: emptyBar, reps: EMPTY_BAR_REPS }];

  const lastTarget = Math.min(scale.roundDown(top * LAST_JUMP_FRACTION), top - scale.minGapToTop);
  const n = jumpCount(top, workReps, scale);
  const first = top >= scale.firstJumpFrom ? scale.firstJump : scale.roundDown(top / 2);

  const targets = n === 1
    ? [lastTarget]
    : Array.from({ length: n }, (_, i) => first + ((lastTarget - first) * i) / (n - 1));

  for (const target of targets) {
    const weight = buildableNear(target, scale, bar);
    if (weight == null) continue;
    const previous = ramp[ramp.length - 1].weight;
    if (weight <= previous || weight > top - scale.minGapToTop) continue;
    ramp.push({ weight, reps: repsAt(weight / top) });
  }
  return ramp;
}
