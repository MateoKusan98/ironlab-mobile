import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { palette } from '../theme';

/**
 * The live workout card on the lock screen / in the notification shade (see
 * screens/session/lockScreenCard.ts for what it says).
 *
 * One notification, always under the same identifier, so each update REPLACES the
 * card instead of stacking a new one per set. Its Android channel is LOW importance:
 * it is updated on every tick, and a sound or heads-up banner on each would be worse
 * than no card at all. The rest-over alert keeps its own loud channel.
 */
export const LIVE_WORKOUT_TYPE = 'workout_live';
const LIVE_WORKOUT_ID = 'live-workout';
const LIVE_CHANNEL_ID = 'live-workout';

async function ensureLiveChannel(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  await Notifications.setNotificationChannelAsync(LIVE_CHANNEL_ID, {
    name: 'Workout in progress',
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: null,
    enableVibrate: false,
    showBadge: false,
    lightColor: palette.indigo[500],
  });
  return LIVE_CHANNEL_ID;
}

/**
 * Show or update the card. Never asks for permission — the rest timer already does,
 * at a moment the athlete understands — and never throws: the card is a convenience
 * and must not get in the way of logging a set.
 */
export async function showLiveWorkoutCard(card: { title: string; body: string }): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const channelId = await ensureLiveChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: LIVE_WORKOUT_ID,
      content: {
        title: card.title,
        body: card.body,
        sound: false,
        // Swipeable on purpose: an un-dismissable card left behind by a killed app
        // would sit in the shade until the next workout.
        sticky: false,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        data: { type: LIVE_WORKOUT_TYPE },
      },
      trigger: channelId ? { channelId } : null,
    });
  } catch {
    // ignore — see above
  }
}

export async function clearLiveWorkoutCard(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(LIVE_WORKOUT_ID);
  } catch {
    // ignore
  }
}
