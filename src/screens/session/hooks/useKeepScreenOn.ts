import { useEffect } from 'react';
import { requireOptionalNativeModule } from 'expo';

const KEEP_AWAKE_TAG = 'active-workout';

/**
 * Keeps the screen on while the workout screen is open. Between sets the phone used to
 * lock itself, and every set started with unlocking it with chalk on the fingers.
 *
 * Released on unmount, so minimising the workout hands the screen timeout back to the
 * phone. expo-keep-awake's JS throws at import on a binary without its native module
 * (an OTA can reach one, see haptics.ts), so it is only required once the module is
 * known to exist — without it the screen simply locks as it always did.
 */
export function useKeepScreenOn(): void {
  useEffect(() => {
    if (!requireOptionalNativeModule('ExpoKeepAwake')) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
    const keepAwake = require('expo-keep-awake') as typeof import('expo-keep-awake');
    keepAwake.activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      keepAwake.deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, []);
}
