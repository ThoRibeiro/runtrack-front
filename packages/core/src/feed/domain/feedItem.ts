import type { ActivityId, UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';
import type { ActivityStatus, ActivityType } from '../../activity/domain/activity';

export interface FeedAuthor {
  id: UserId;
  handle: string;
  displayName: string;
  avatarUrl: string | undefined;
}

/**
 * One card in the feed.
 *
 * Deliberately thin, and it matches what `GET /feed/v1` actually returns: a
 * distance, a moving time, two counters. No track, no full statistics — the
 * feed fans out on read (a server-side decision), and loading a polyline per
 * card would make the first screen unusable. The track is fetched when a card
 * is opened.
 */
export interface FeedItem {
  activityId: ActivityId;
  author: FeedAuthor;
  type: ActivityType;
  title: string;
  status: ActivityStatus;
  distanceMetres: number;
  movingTimeSeconds: number;
  startedAt: Instant;
  endedAt: Instant | undefined;
  likeCount: number;
  commentCount: number;
  /**
   * La forme du parcours, très simplifiée, telle que le serveur l'a figée à la
   * fin de la course. Absente d'une course en cours — il n'y a pas encore de
   * trace — et des courses gelées avant que le serveur ne la calcule.
   */
  previewPolyline: string | undefined;
}

/** A card still running gets the live treatment: §10's "Suivre en direct". */
export function isLive(item: FeedItem): boolean {
  return item.status.kind === 'live' || item.status.kind === 'paused';
}
