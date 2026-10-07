import type { RootStackParamList } from './AppNavigator';

type Route = { [K in keyof RootStackParamList]: { name: K; params?: RootStackParamList[K] } }[keyof RootStackParamList];

/**
 * Where a tapped push should land, from its `data.type` (set by the backend's
 * NotificationsService). Null leaves the app wherever it opens — the right answer for
 * a type we do not know, so an older app never crashes on a newer server's push.
 */
export function routeForNotification(data: Record<string, unknown> | null | undefined): Route | null {
  switch (data?.type) {
    case 'pr':
      return { name: 'PRs' };
    case 'weekly_summary':
      return { name: 'Stats' };
    case 'workout_ready':
      return { name: 'AICoachPlan' };
    case 'message': {
      const { conversationId, otherUserId, otherUserName } = data;
      if (typeof conversationId !== 'string' || typeof otherUserId !== 'string') return { name: 'Messages' };
      return {
        name: 'Conversation',
        params: { conversationId, otherUserId, otherUserName: typeof otherUserName === 'string' ? otherUserName : '' },
      };
    }
    // Proposals, the morning push and meet day all live on Home.
    case 'proposal':
    case 'daily_motivation':
    case 'competition_day':
      return { name: 'ClientApp' };
    default:
      return null;
  }
}
