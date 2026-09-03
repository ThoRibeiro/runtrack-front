import { ACTIVITY_TYPES, activityId, type FeedItem } from '@runtrack/core';
import type { components } from '../generated/schema';
import { toStatus } from './activity';
import { narrow, required, toInstant, toOptionalInstant, toOptionalString } from './primitives';
import { toAuthor } from './user';

type FeedItemDto = components['schemas']['FeedItem'];

export function toFeedItem(dto: FeedItemDto): FeedItem {
  const startedAt = dto.startedAt === undefined ? 0 : toInstant(dto.startedAt);
  const endedAt = toOptionalInstant(dto.endedAt);

  return {
    activityId: activityId(required(dto.activityId, 'id de course')),
    author: toAuthor(dto.author),
    type: narrow(dto.type, ACTIVITY_TYPES, 'RUN'),
    title: dto.title ?? '',
    status: toStatus(dto.status, startedAt, endedAt),
    distanceMetres: dto.distanceMeters ?? 0,
    movingTimeSeconds: dto.movingTimeSeconds ?? 0,
    startedAt,
    endedAt,
    likeCount: dto.likeCount ?? 0,
    commentCount: dto.commentCount ?? 0,
    previewPolyline: toOptionalString(dto.previewPolyline),
  };
}
