import { routeForNotification } from '../notificationRoute';

describe('push tap routing', () => {
  it('opens the conversation a message came from', () => {
    expect(routeForNotification({ type: 'message', conversationId: 'c1', otherUserId: 'u2', otherUserName: 'Ana' }))
      .toEqual({ name: 'Conversation', params: { conversationId: 'c1', otherUserId: 'u2', otherUserName: 'Ana' } });
  });

  it('falls back to the inbox when a message push is missing its ids', () => {
    expect(routeForNotification({ type: 'message' })).toEqual({ name: 'Messages' });
  });

  it('sends a PR to the records screen and a ready session to the plan', () => {
    expect(routeForNotification({ type: 'pr' })).toEqual({ name: 'PRs' });
    expect(routeForNotification({ type: 'workout_ready' })).toEqual({ name: 'AICoachPlan' });
  });

  it('ignores the local rest-timer alert and anything it does not recognise', () => {
    expect(routeForNotification({ type: 'rest-timer' })).toBeNull();
    expect(routeForNotification({ type: 'something_new_from_a_later_server' })).toBeNull();
    expect(routeForNotification(undefined)).toBeNull();
  });
});
