import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

import { palette } from '../theme';
// How notifications are displayed while app is in foreground.
// Rest-timer alerts only need the SOUND while you're in the app — suppress the
// redundant banner/list so the screen's own countdown UI stays the focus.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isRestTimer = notification.request.content.data?.type === REST_TIMER_TYPE;
    return {
      shouldShowAlert: !isRestTimer,
      shouldPlaySound: true,
      shouldSetBadge: !isRestTimer,
      shouldShowBanner: !isRestTimer,
      shouldShowList: !isRestTimer,
    };
  },
});

const REST_TIMER_TYPE = 'rest-timer';
const REST_CHANNEL_ID = 'rest-timer';

async function ensureRestChannel(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  await Notifications.setNotificationChannelAsync(REST_CHANNEL_ID, {
    name: 'Rest timer',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 200, 100, 200, 100, 400],
    sound: 'default',
    lightColor: palette.indigo[500],
  });
  return REST_CHANNEL_ID;
}

/**
 * Schedule a local notification that fires when the rest period ends. Because
 * it's an OS-level notification it plays a sound and fires even when the app is
 * backgrounded or killed — and notification sounds play *over* the user's music
 * rather than stopping it (unlike grabbing the audio session via expo-av).
 * Returns the scheduled id so it can be cancelled if the user skips/adjusts rest.
 */
export async function scheduleRestTimerAlert(seconds: number): Promise<string | null> {
  try {
    if (!Number.isFinite(seconds) || seconds <= 0) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let granted = existing === 'granted';
    if (!granted) {
      const { status } = await Notifications.requestPermissionsAsync();
      granted = status === 'granted';
    }
    if (!granted) return null;

    const channelId = await ensureRestChannel();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rest complete 💪',
        body: 'Time for your next set.',
        sound: 'default',
        data: { type: REST_TIMER_TYPE },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(seconds),
        channelId,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelRestTimerAlert(id: string | null | undefined): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'IronLab',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: palette.indigo[500],
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    await api.post('/users/me/push-token', { token }).catch(() => {});
  } catch {
    // Non-fatal — Expo Go doesn't support push tokens (SDK 53+), standalone builds do
  }
}
