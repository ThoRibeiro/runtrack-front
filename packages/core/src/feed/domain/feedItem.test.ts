import { describe, expect, it } from 'vitest';
import { activityId, userId } from '../../shared/identity/ids';
import type { ActivityStatus } from '../../activity/domain/activity';
import { isLive, type FeedItem } from './feedItem';

const item = (status: ActivityStatus): FeedItem => ({
  activityId: activityId('a1'),
  author: { id: userId('u1'), handle: 'thomas', displayName: 'Thomas', avatarUrl: undefined },
  type: 'RUN',
  title: 'Sortie du matin',
  status,
  distanceMetres: 12_400,
  movingTimeSeconds: 3_862,
  startedAt: 1_700_000_000_000,
  endedAt: undefined,
  likeCount: 3,
  commentCount: 1,
});

describe('carte du fil', () => {
  it('propose le suivi en direct tant que la course tourne', () => {
    expect(isLive(item({ kind: 'live', since: 1 }))).toBe(true);
    expect(isLive(item({ kind: 'paused', since: 1 }))).toBe(true);
  });

  it('ne le propose plus une fois la course terminée', () => {
    expect(isLive(item({ kind: 'finished', since: 1 }))).toBe(false);
    expect(isLive(item({ kind: 'discarded', since: 1 }))).toBe(false);
  });
});
