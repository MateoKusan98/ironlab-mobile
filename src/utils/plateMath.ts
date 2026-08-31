/**
 * Turning a prescribed weight into the plates that make it.
 *
 * The one place an athlete still does mental arithmetic between our number and
 * the thing in front of them is at the bar: "152.5 — so that's a 25, a 10, a 5
 * and a 2.5 a side, right?" This computes that, and only that.
 *
 * The venue itself (bar weight, which plates exist) is NOT decided here — it is
 * resolved server-side from the equipment capability model and arrives as
 * `BarLoading`. This file owns nothing but the arithmetic, so there is no second
 * opinion anywhere about what plates an athlete owns.
 *
 * The fill is EXACT or nothing. A greedy pass that ends with 0.75kg stranded must
 * not round, and must not draw the closest stack it managed — the whole point of
 * the picture is that it agrees with the number printed next to it, and a
 * silently-off drawing is worse than no drawing at all.
 */

import type { BarLoading } from '../services/ai-coach.service';

/**
 * Plate weights carry quarter-kilo change plates, and 0.1 + 0.2 arithmetic strands
 * exact matches that are exact in reality. Everything below works in integer
 * hundredths of a kilo.
 */
const toHundredths = (kg: number) => Math.round(kg * 100);

/**
 * A side of the bar this deep is ~500kg of total load — past any real lift, and
 * the bound that keeps a pathological plate set from searching forever.
 */
const MAX_PLATES_PER_SIDE = 20;

/**
 * The plates to hang on ONE side, largest first, for a total bar weight.
 *
 * Returns `[]` for a weight that is exactly the empty bar (a real prescription on
 * a technique or warm-up set), and `null` when the weight cannot be built exactly
 * from this venue's plates — including anything at or below the bar, and any
 * odd remainder the plate set cannot close.
 */
export function platesPerSide(totalKg: number, bar: BarLoading): number[] | null {
  if (!Number.isFinite(totalKg) || !bar?.plates?.length) return null;

  const total = toHundredths(totalKg);
  const barWeight = toHundredths(bar.barKg);
  if (total < barWeight) return null;

  // An odd number of hundredths per pair can never be split evenly across two
  // sides, so it is unbuildable before a single plate is considered.
  const remainder = total - barWeight;
  if (remainder % 2 !== 0) return null;
  const perSide = remainder / 2;
  if (perSide === 0) return [];

  const sizes = [...bar.plates].map(toHundredths).sort((a, b) => b - a);

  // Descending order means the first path explored is the greedy one, which is
  // the stack a human loads (and almost always exact). `dead` remembers the
  // (plate index, remaining) states already proven unreachable, so a plate set
  // that strands the greedy pass — e.g. a 1.25 in a set whose floor is 0.5 —
  // backtracks in bounded time instead of exploring the same subtree repeatedly.
  const dead = new Set<string>();

  const fill = (remaining: number, from: number, depth: number): number[] | null => {
    if (remaining === 0) return [];
    if (depth >= MAX_PLATES_PER_SIDE) return null;

    const key = `${from}:${remaining}`;
    if (dead.has(key)) return null;

    for (let i = from; i < sizes.length; i++) {
      const size = sizes[i];
      if (size > remaining) continue;
      // Pass `i`, not `i + 1`: plate counts are unbounded, so the same size may be
      // taken again — but never a LARGER one, which is what keeps each stack
      // enumerated once and in loading order.
      const rest = fill(remaining - size, i, depth + 1);
      if (rest) return [size, ...rest];
    }

    dead.add(key);
    return null;
  };

  const solution = fill(perSide, 0, 0);
  return solution ? solution.map((p) => p / 100) : null;
}

/** `[25, 10, 2.5]` → `"25 / 10 / 2.5"`. Trailing `.0` is noise on a plate. */
export function formatPlates(plates: number[]): string {
  return plates.map((p) => String(Number(p.toFixed(2)))).join(' / ');
}
