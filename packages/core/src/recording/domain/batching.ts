import type { ActivityId } from '../../shared/identity/ids';
import type { RecordedPoint } from '../../activity/domain/track';

/**
 * §6: a batch is capped at a thousand points. A buffer replayed after a long
 * tunnel goes over it, so the split has to exist and has to be tested — this is
 * the case that only shows up on the day it matters.
 */
export const MAXIMUM_POINTS_PER_BATCH = 1000;

export interface PointBatch {
  activityId: ActivityId;
  points: readonly RecordedPoint[];
  /** §6: scoped to one activity. Same key + same body replays the memoised response. */
  idempotencyKey: string;
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new RangeError('Un lot vide ne se découpe pas.');
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * The idempotency key is **derived**, not drawn at random, and that is the whole
 * trick.
 *
 * A random key makes a retry look like a new batch: the server accepts the same
 * points twice, or answers 409 `IDEMPOTENCY_KEY_REUSED` on a body it has never
 * seen. Derived from the activity and the range of sequence numbers, a retry of
 * the same batch carries the same key and replays the memoised response — which
 * is exactly the property §6 asks for, and the same choice the server made for
 * its own ingestion.
 */
export function idempotencyKeyFor(
  activityId: ActivityId,
  points: readonly RecordedPoint[],
): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) {
    throw new RangeError('Un lot vide n’a pas de clé d’idempotence.');
  }
  return `${activityId}:${String(first.sequenceNumber)}-${String(last.sequenceNumber)}`;
}

export function batchesFor(activityId: ActivityId, points: readonly RecordedPoint[]): PointBatch[] {
  return chunk(points, MAXIMUM_POINTS_PER_BATCH).map((slice) => ({
    activityId,
    points: slice,
    idempotencyKey: idempotencyKeyFor(activityId, slice),
  }));
}
