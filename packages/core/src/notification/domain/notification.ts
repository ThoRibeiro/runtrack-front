import type { ActivityId, NotificationId, UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';

export const NOTIFICATION_TYPES = [
  'FRIEND_STARTED_ACTIVITY',
  'FRIEND_FINISHED_ACTIVITY',
  'NEW_FOLLOWER',
  'FOLLOW_REQUEST',
  'FOLLOW_ACCEPTED',
  'ACTIVITY_LIKED',
  'ACTIVITY_COMMENTED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: NotificationId;
  type: NotificationType;
  createdAt: Instant;
  readAt: Instant | undefined;
  actorId: UserId | undefined;
  activityId: ActivityId | undefined;
}

/**
 * Where a notification leads. §11 lists the four deep links, and they must open
 * the screen directly — application closed included.
 *
 * The mapping lives in the hexagon rather than in a router: the destination of a
 * `FOLLOW_REQUEST` is a product decision, not a navigation detail, and both
 * shells have to agree on it.
 */
export type DeepLink =
  | { route: 'activity-live'; activityId: ActivityId }
  | { route: 'activity'; activityId: ActivityId }
  | { route: 'user'; userId: UserId }
  | { route: 'follow-requests' };

export function destinationOf(notification: Notification): DeepLink | undefined {
  switch (notification.type) {
    case 'FRIEND_STARTED_ACTIVITY':
      return notification.activityId === undefined
        ? undefined
        : { route: 'activity-live', activityId: notification.activityId };
    case 'FRIEND_FINISHED_ACTIVITY':
    case 'ACTIVITY_LIKED':
    case 'ACTIVITY_COMMENTED':
      return notification.activityId === undefined
        ? undefined
        : { route: 'activity', activityId: notification.activityId };
    case 'NEW_FOLLOWER':
    case 'FOLLOW_ACCEPTED':
      return notification.actorId === undefined
        ? undefined
        : { route: 'user', userId: notification.actorId };
    case 'FOLLOW_REQUEST':
      return { route: 'follow-requests' };
  }
}

export function unreadCount(notifications: readonly Notification[]): number {
  return notifications.filter((notification) => notification.readAt === undefined).length;
}
