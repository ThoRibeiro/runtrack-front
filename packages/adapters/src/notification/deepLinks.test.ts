import { activityId, userId } from '@runtrack/core';
import { deepLinkPath, parseNotificationResponse } from './deepLinks';

describe('la destination d’une notification touchée', () => {
  it('lit le lien profond que le serveur a mis dans la charge utile', () => {
    const link = parseNotificationResponse({
      notification: { request: { content: { data: { deepLink: '/activities/a1/live' } } } },
    });

    expect(link).toEqual({ route: 'activity-live', activityId: activityId('a1') });
  });

  it.each([
    ['une réponse absente', undefined],
    ['une notification sans données', { notification: {} }],
    [
      'un lien qui n’est pas une chaîne',
      {
        notification: { request: { content: { data: { deepLink: 42 } } } },
      },
    ],
    [
      'une route que ce build ne connaît pas',
      {
        notification: { request: { content: { data: { deepLink: '/badges/gold' } } } },
      },
    ],
  ])('n’ouvre rien pour %s', (_name, response) => {
    // §11 : ouvrir le mauvais écran est pire que n'en ouvrir aucun.
    expect(parseNotificationResponse(response)).toBeUndefined();
  });
});

describe('la route d’une destination', () => {
  it.each([
    [{ route: 'activity-live' as const, activityId: activityId('a1') }, '/activity/a1/live'],
    [{ route: 'activity' as const, activityId: activityId('a1') }, '/activity/a1'],
    [
      { route: 'activity-comments' as const, activityId: activityId('a1'), commentId: undefined },
      '/activity/a1',
    ],
    [{ route: 'user' as const, userId: userId('u-9') }, '/profile/u-9'],
    [{ route: 'follow-requests' as const }, '/follow-requests'],
  ])('mène %o vers %s', (link, path) => {
    expect(deepLinkPath(link)).toBe(path);
  });
});
