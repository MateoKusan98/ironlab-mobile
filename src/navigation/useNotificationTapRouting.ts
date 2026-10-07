import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { CommonActions } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { routeForNotification } from './notificationRoute';

/** How long to wait for the navigator before giving up on a cold-start tap. */
const READY_POLL_MS = 100;
const READY_TIMEOUT_MS = 5000;

/**
 * Taps already routed. getLastNotificationResponseAsync keeps returning the same tap
 * for the life of the process, so without this a logout and login would re-open it.
 */
const handledTaps = new Set<string>();

/**
 * Opens the screen a tapped push is about — including the tap that launched the app
 * from cold, which arrives before the navigator has mounted.
 *
 * A route the current user's navigator does not have (a coach tapping an athlete-only
 * screen) is skipped rather than navigated to, which would only log a dev warning and
 * leave them where they were anyway.
 */
export function useNotificationTapRouting(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledTaps.has(id)) return;
      handledTaps.add(id);
      const route = routeForNotification(response.notification.request.content.data);
      if (!route) return;
      const startedAt = Date.now();
      const attempt = () => {
        if (cancelled) return;
        if (!navigationRef.isReady()) {
          if (Date.now() - startedAt < READY_TIMEOUT_MS) setTimeout(attempt, READY_POLL_MS);
          return;
        }
        if (!navigationRef.getRootState()?.routeNames.includes(route.name)) return;
        navigationRef.dispatch(CommonActions.navigate(route));
      };
      attempt();
    };

    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => { cancelled = true; sub.remove(); };
  }, [enabled]);
}
