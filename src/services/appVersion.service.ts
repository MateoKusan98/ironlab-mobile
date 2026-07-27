import Constants from 'expo-constants';
import { api } from './api';
import { compareVersions } from '../data/changelog';

export interface AppVersionRequirement {
  minSupported: string;
  latest: string;
  storeUrl: { ios: string; android: string };
}

/** The version this build is running, per app.json. */
export const CURRENT_APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/**
 * Fetch the server's version-gate contract. Returns null on any failure so the
 * caller can fail *open* — a flaky network or a down backend must never lock a
 * user out of the app; we only ever block on a definitive "you're too old".
 */
export async function fetchVersionRequirement(): Promise<AppVersionRequirement | null> {
  try {
    const { data } = await api.get<{ data: AppVersionRequirement }>('/app-version');
    return data.data;
  } catch {
    return null;
  }
}

/** True when this build is below the server's minimum supported version. */
export function isUpdateRequired(req: AppVersionRequirement): boolean {
  return compareVersions(CURRENT_APP_VERSION, req.minSupported) < 0;
}
