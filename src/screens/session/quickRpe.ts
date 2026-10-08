/**
 * The RPE choices offered as one-tap chips under the next set (QuickRpeChips).
 *
 * The chips exist so rating a set costs one touch instead of a keyboard — NOT so the
 * rating can be skipped. Nothing is pre-selected and nothing is filled in for the
 * athlete: an RPE they did not give would count as a hard set in the weekly volume
 * budget and feed the e1RM and PR checks, the same reason warm-ups are never logged.
 *
 * Five half-point steps centred on the prescription, because that is where an honest
 * rating lands almost every time; anything further out still goes through the RPE box.
 */

/** How many chips to show — enough for ±1 RPE around the target in half steps. */
const CHIP_COUNT = 5;
const RPE_STEP = 0.5;
// Below RPE 5 a set is not a working set the app reasons about; above 10 is not a rating.
const RPE_MIN = 5;
const RPE_MAX = 10;
// A set added mid-workout has no prescription to centre on: whole points cover the
// working range without making the athlete read ten chips.
const UNTARGETED_CHIPS = [6, 7, 8, 9, 10];

export function quickRpeOptions(targetRpe: number | undefined): number[] {
  if (targetRpe == null || !Number.isFinite(targetRpe)) return UNTARGETED_CHIPS;
  const centre = Math.round(targetRpe / RPE_STEP) * RPE_STEP;
  const half = Math.floor(CHIP_COUNT / 2) * RPE_STEP;
  // Slide the window rather than cut it at the ends, so a target of 9.5 still gets five
  // chips (8–10) instead of three.
  const low = Math.min(Math.max(centre - half, RPE_MIN), RPE_MAX - (CHIP_COUNT - 1) * RPE_STEP);
  return Array.from({ length: CHIP_COUNT }, (_, i) => low + i * RPE_STEP);
}

/** "8", "8.5" — how the RPE box would show the same number. */
export function formatRpe(rpe: number): string {
  return Number.isInteger(rpe) ? String(rpe) : rpe.toFixed(1);
}
