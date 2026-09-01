import { parseDeepLink, type DeepLink } from '@runtrack/core';

/**
 * Turning a tapped notification into a screen (§11, §12).
 *
 * The server sends the destination as a **path**, and the hexagon parses it —
 * `parseDeepLink` is where that lives, and it returns `undefined` for a route
 * this build has never heard of. Opening the wrong screen is worse than
 * opening none.
 *
 * What is left here is Expo's shape: a notification response carries its data
 * under `request.content.data`, and the field the server fills is `deepLink`.
 */
export interface NotificationLike {
  request?: { content?: { data?: Record<string, unknown> } };
}

export function parseNotificationResponse(
  response: { notification?: NotificationLike } | undefined,
): DeepLink | undefined {
  const data = response?.notification?.request?.content?.data;
  const link = data?.['deepLink'];
  return typeof link === 'string' ? parseDeepLink(link) : undefined;
}

/**
 * The router path for a destination.
 *
 * The hexagon owns the *meaning* of a link; the shells own the routes. Keeping
 * the mapping here rather than in each screen means a route rename is one edit,
 * and a `switch` the compiler checks is exhaustive.
 */
export function deepLinkPath(link: DeepLink): string {
  switch (link.route) {
    case 'activity-live':
      return `/activity/${link.activityId}/live`;
    case 'activity':
      return `/activity/${link.activityId}`;
    case 'activity-comments':
      // Comments arrive with lot 11; until then the activity screen is where
      // they will live, and it is the honest destination.
      return `/activity/${link.activityId}`;
    case 'user':
      return `/profile/${link.userId}`;
    case 'follow-requests':
      return '/follow-requests';
  }
}
