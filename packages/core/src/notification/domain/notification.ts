import type { ActivityId, CommentId, NotificationId, UserId } from '../../shared/identity/ids';
import { activityId, commentId, userId } from '../../shared/identity/ids';
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
  unread: boolean;
  actorId: UserId | undefined;
  /**
   * Where it leads, as a **path** — the server builds it, the client owns the
   * scheme and the host. `parseDeepLink` turns it into something typed.
   */
  deepLink: string;
  /** "Trois personnes ont aimé votre course" is one notification, not three. */
  aggregateCount: number;
}

/**
 * Where a notification leads (§11).
 *
 * The destination is **not** derived from the type here: the server sends the
 * path, and deriving a second version of it client-side would give two truths
 * that diverge on the first change. What the hexagon does is turn that string
 * into something a `switch` cannot get wrong.
 */
export type DeepLink =
  | { route: 'activity-live'; activityId: ActivityId }
  | { route: 'activity'; activityId: ActivityId }
  | { route: 'activity-comments'; activityId: ActivityId; commentId: CommentId | undefined }
  | { route: 'user'; userId: UserId }
  | { route: 'follow-requests' };

const ACTIVITY_LIVE = /^\/activities\/([^/]+)\/live$/;
const ACTIVITY_COMMENTS = /^\/activities\/([^/]+)\/comments(?:#(.+))?$/;
const ACTIVITY = /^\/activities\/([^/]+)$/;
const USER = /^\/users\/([^/]+)$/;

/**
 * Returns `undefined` on a path this version does not know. A newer server may
 * send a destination this build has never heard of, and opening the wrong
 * screen is worse than opening none.
 */
export function parseDeepLink(link: string): DeepLink | undefined {
  const live = ACTIVITY_LIVE.exec(link);
  if (live?.[1] !== undefined) {
    return { route: 'activity-live', activityId: activityId(live[1]) };
  }

  const comments = ACTIVITY_COMMENTS.exec(link);
  if (comments?.[1] !== undefined) {
    const anchor = comments[2];
    return {
      route: 'activity-comments',
      activityId: activityId(comments[1]),
      commentId: anchor === undefined ? undefined : commentId(anchor),
    };
  }

  const activity = ACTIVITY.exec(link);
  if (activity?.[1] !== undefined) {
    return { route: 'activity', activityId: activityId(activity[1]) };
  }

  const user = USER.exec(link);
  if (user?.[1] !== undefined) {
    return { route: 'user', userId: userId(user[1]) };
  }

  if (link === '/me/follow-requests') return { route: 'follow-requests' };

  return undefined;
}

export function destinationOf(notification: Notification): DeepLink | undefined {
  return parseDeepLink(notification.deepLink);
}

export function unreadCount(notifications: readonly Notification[]): number {
  return notifications.filter((notification) => notification.unread).length;
}
