import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { View } from 'react-native';

/**
 * react-native-view-shot resolves its native module with getEnforcing at IMPORT time,
 * so importing it on a build that predates the module throws — and an OTA update can
 * reach exactly such a build (runtimeVersion follows appVersion). Hence: check first,
 * require lazily, and let the caller hide the button when this says no.
 */
export function isImageShareAvailable(): boolean {
  try {
    return TurboModuleRegistry.get('RNViewShot') != null || NativeModules.RNViewShot != null;
  } catch {
    return false;
  }
}

/** Renders the view to a PNG file and returns its uri. */
export async function captureToFile(view: View): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
  const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
  return captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
}
