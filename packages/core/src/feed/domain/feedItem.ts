import type { ActivityId, UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';
import type { ActivityStats, ActivityType } from '../../activity/domain/activity';

export interface FeedAuthor {
  id: UserId;
  handle: string;
  displayName: string;
  avatarUrl: string | undefined;
}

export interface FeedItem {
  activityId: ActivityId;
  author: FeedAuthor;
  type: ActivityType;
  title: string;
  startedAt: Instant;
  stats: ActivityStats;
  /** The historical track, encoded. Decoded by `measure/polyline`, off the main thread. */
  polyline: string | undefined;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  live: boolean;
}
