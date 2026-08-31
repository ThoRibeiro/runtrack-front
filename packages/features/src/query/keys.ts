import type { ActivityId, StatsPeriod, UserId } from '@runtrack/core';

/**
 * Every cache key in one place.
 *
 * Keys written inline drift: two screens spell the same query slightly
 * differently, the cache splits in two, and an invalidation after a mutation
 * silently misses one of them. Building them here makes that impossible to do
 * by accident, and makes "what does this mutation invalidate" a question with
 * an answer.
 */
export const queryKeys = {
  feed: ['feed'] as const,

  me: ['user', 'me'] as const,
  myStats: (period: StatsPeriod, zone: string) => ['user', 'me', 'stats', period, zone] as const,
  profile: (handle: string) => ['user', 'profile', handle] as const,
  search: (query: string) => ['user', 'search', query] as const,

  activity: (id: ActivityId) => ['activity', id] as const,
  splits: (id: ActivityId) => ['activity', id, 'splits'] as const,
  track: (id: ActivityId) => ['activity', id, 'track'] as const,
  activitiesOf: (id: UserId) => ['activity', 'of', id] as const,
  liveActivities: ['activity', 'live'] as const,

  followers: (id: UserId) => ['social', 'followers', id] as const,
  following: (id: UserId) => ['social', 'following', id] as const,
  followRequests: ['social', 'follow-requests'] as const,
} as const;
