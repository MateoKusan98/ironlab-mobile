import { Vibration } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * The workout's taps and buzzes, named by what they MEAN rather than how long they
 * vibrate, so every screen that ticks a set feels the same.
 *
 * expo-haptics is a native module added 2026-10-08. `runtimeVersion` is the app
 * version, so an over-the-air update can reach a binary built before it existed —
 * there the module is absent and every call falls back to the raw vibration the app
 * used before (a buzzy motor pulse on Android, close to nothing on iOS).
 */
type HapticsModule = typeof import('expo-haptics');

let cached: HapticsModule | null | undefined;

function haptics(): HapticsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
    cached = requireOptionalNativeModule('ExpoHaptics') ? (require('expo-haptics') as HapticsModule) : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Runs the haptic, or the old vibration where the module is missing. Never throws. */
function play(withHaptics: (h: HapticsModule) => Promise<void>, fallback: number | number[]): void {
  const h = haptics();
  if (!h) {
    Vibration.vibrate(fallback);
    return;
  }
  withHaptics(h).catch(() => Vibration.vibrate(fallback));
}

/** A set ticked off — one firm, short knock. */
export function setDone(): void {
  play((h) => h.impactAsync(h.ImpactFeedbackStyle.Medium), 40);
}

/** A set un-ticked, a load cut accepted — a light acknowledgement. */
export function lightTap(): void {
  play((h) => h.impactAsync(h.ImpactFeedbackStyle.Light), 30);
}

/** The set was a record. */
export function prEarned(): void {
  play((h) => h.notificationAsync(h.NotificationFeedbackType.Success), [0, 60, 40, 60]);
}

const REST_DONE_PATTERN = [0, 200, 100, 200, 100, 400];

/**
 * Rest is over. A single haptic is too subtle to notice through a pocket between
 * sets, so the long motor pattern stays; the haptic only adds a crisp lead-in.
 */
export function restDone(): void {
  const h = haptics();
  h?.notificationAsync(h.NotificationFeedbackType.Warning).catch(() => {});
  Vibration.vibrate(REST_DONE_PATTERN);
}
