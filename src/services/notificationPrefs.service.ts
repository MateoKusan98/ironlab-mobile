import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

/**
 * Per-category push preferences — mirrors notifications/notification-prefs.ts on the
 * backend, which is the source of truth. Every key is always present in a response.
 */
export interface NotificationPrefs {
  allEnabled: boolean;
  dailyMotivation: boolean;
  workoutReady: boolean;
  coachSuggestions: boolean;
  prAlerts: boolean;
  weeklySummary: boolean;
  competitionDay: boolean;
  messages: boolean;
  coachReviews: boolean;
  restTimer: boolean;
}

/**
 * The rest-timer sound is scheduled on the device mid-set, where a network round trip
 * is the last thing the athlete needs — so its preference is mirrored locally and read
 * from here. Missing reads as on, matching the server default.
 */
const REST_TIMER_PREF_KEY = 'notificationPrefs:restTimer';

async function mirrorRestTimer(prefs: NotificationPrefs): Promise<void> {
  const on = prefs.allEnabled && prefs.restTimer;
  await AsyncStorage.setItem(REST_TIMER_PREF_KEY, on ? '1' : '0').catch(() => {});
}

export async function isRestTimerAlertEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(REST_TIMER_PREF_KEY)) !== '0';
  } catch {
    return true;
  }
}

export const notificationPrefsService = {
  get: async (): Promise<NotificationPrefs> => {
    const { data } = await api.get<{ data: NotificationPrefs }>('/notifications/preferences');
    await mirrorRestTimer(data.data);
    return data.data;
  },

  /** Sends only the keys that changed; returns the full resolved set. */
  update: async (changes: Partial<NotificationPrefs>): Promise<NotificationPrefs> => {
    const { data } = await api.patch<{ data: NotificationPrefs }>('/notifications/preferences', changes);
    await mirrorRestTimer(data.data);
    return data.data;
  },
};
