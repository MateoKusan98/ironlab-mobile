import type { BarLoading } from '../services/ai-coach.service';
import type { PlateSet } from '../utils/plateMath';

/**
 * Bar weights in the athlete's own unit (2026-10-07).
 *
 * Every load the app stores, sends and receives is kilograms — the engine, the volume
 * budget, the e1RM history, the PR checks. Pounds exist only at the two edges: the number
 * the athlete reads, and the number they type. Converting anywhere in between is how one
 * screen ends up a plate apart from another.
 *
 * The server writes a few strings itself (PR push); its twin of this rule lives in
 * ironlab-backend src/modules/users/lifting-unit.ts — keep the rounding the same.
 */

export type LiftingUnit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;

/**
 * A prescription shown in pounds lands on a 5lb step — a pair of 2.5s, the smallest jump
 * a pound gym loads. Nearest, not floor: the engine already rounds its kg loads to the
 * nearest plate, and flooring here would turn an empty-bar 20kg prescription (44.1lb)
 * into a 40lb bar that does not exist. The cost is at most 2.5lb (1.1kg) either way —
 * under the engine's own 2.5kg step.
 */
const LB_PRESCRIPTION_STEP = 5;

/**
 * A logged weight shown in pounds keeps a tenth: 225lb is stored as 102.06kg (two
 * decimals), and a tenth is what brings it back as 225 rather than 225.004.
 */
const LB_LOGGED_PRECISION = 10;

/** The kg column keeps two decimals; round there so a resend compares equal. */
const KG_STORED_PRECISION = 100;

const roundTo = (n: number, perUnit: number) => Math.round(n * perUnit) / perUnit;

export const unitLabel = (unit: LiftingUnit): string => (unit === 'lb' ? 'lb' : 'kg');

/** What the athlete typed, in their unit → the kg the server stores. */
export function toKg(value: number, unit: LiftingUnit): number {
  return unit === 'lb' ? roundTo(value * KG_PER_LB, KG_STORED_PRECISION) : value;
}

/** A weight the athlete LIFTED (logged, a record), in their unit. */
export function loggedInUnit(kg: number, unit: LiftingUnit): number {
  const n = Number(kg);
  return unit === 'lb' ? roundTo(n / KG_PER_LB, LB_LOGGED_PRECISION) : n;
}

/** A weight the engine PRESCRIBED, in their unit — on a step they can load. */
export function prescribedInUnit(kg: number, unit: LiftingUnit): number {
  const n = Number(kg);
  return unit === 'lb' ? Math.round(n / KG_PER_LB / LB_PRESCRIPTION_STEP) * LB_PRESCRIPTION_STEP : n;
}

/**
 * The prescription as DELIVERED, in kg — what gets recorded as the set's targetWeight.
 *
 * In pounds the athlete is shown the engine's load rounded to 5lb (102.5kg → 225lb) and
 * loads exactly that, which logs as 102.06kg. The engine judges a set by `weightUsed <
 * targetWeight` in three places (earned-step, the variation-anchor evidence, the comp-lift
 * residual), so recording the UNROUNDED 102.5 would mark every such set "prescription not
 * met" and a pound lifter would never earn a step. Recording what they were told makes a
 * set done as shown match to the gram. kg lifters are untouched.
 */
export function deliveredPrescriptionKg(kg: number, unit: LiftingUnit): number {
  return unit === 'lb' ? toKg(prescribedInUnit(kg, unit), unit) : kg;
}

/** "160", "162.5" — never "160.00". */
export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** 102.06 → "225lb" or "102.06kg". The default reads a logged weight; pass `prescribed` for an engine load. */
export function formatWeight(kg: number, unit: LiftingUnit, opts: { prescribed?: boolean } = {}): string {
  const value = opts.prescribed ? prescribedInUnit(kg, unit) : loggedInUnit(kg, unit);
  return `${formatNumber(value)}${unitLabel(unit)}`;
}

/** How much a record beat the previous one, in the athlete's unit: "2.5". */
export function formatGain(nowKg: number, beforeKg: number, unit: LiftingUnit): string {
  return formatNumber(Math.round((loggedInUnit(nowKg, unit) - loggedInUnit(beforeKg, unit)) * 10) / 10);
}

/**
 * Total weight moved (sets × reps × load). Past a tonne, or 1000lb, the exact figure
 * stops meaning anything: "12.4 t", "27.4k lb".
 */
export function formatVolume(kg: number, unit: LiftingUnit): string {
  const total = unit === 'lb' ? Number(kg) / KG_PER_LB : Number(kg);
  if (total < 1000) return `${Math.round(total)} ${unitLabel(unit)}`;
  const thousands = (Math.floor(total / 100) / 10).toFixed(1);
  return unit === 'lb' ? `${thousands}k lb` : `${thousands} t`;
}

/**
 * Re-express a weight the athlete typed (not yet confirmed by the server) when the unit
 * changed under it — a workout started in kg and resumed after switching to pounds. At
 * logged precision, not the prescription step: a set may already have been lifted at it.
 */
export function convertTyped(text: string, from: LiftingUnit, to: LiftingUnit): string {
  if (from === to || !text) return text;
  const n = parseFloat(text);
  if (!Number.isFinite(n)) return text;
  return formatNumber(loggedInUnit(toKg(n, from), to));
}

/**
 * The athlete's bar and plates, in the unit their weights are shown in. A pound lifter
 * gets the pound venue (45lb bar, pound plates) — never kg plates converted to 20.41s.
 * Null when there is nothing to draw, including a server too old to send the pound
 * ladder: no drawing beats a kg drawing next to a pound number.
 */
export function plateSetFor(loading: BarLoading | null | undefined, unit: LiftingUnit): PlateSet | null {
  if (!loading) return null;
  if (unit === 'lb') return loading.lb ? { bar: loading.lb.bar, plates: loading.lb.plates } : null;
  return { bar: loading.barKg, plates: loading.plates };
}
