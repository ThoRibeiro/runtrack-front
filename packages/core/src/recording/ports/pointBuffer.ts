import type { RecordedPoint } from '../../activity/domain/track';
import type { ActivityId } from '../../shared/identity/ids';
import type { ClockSkew } from '../domain/clockSkew';

/**
 * The persistent buffer. §6: points go to SQLite first, never to memory — an
 * application killed by the system must lose nothing.
 *
 * SQLite on mobile, IndexedDB on the web. The hexagon knows neither.
 */
export interface InterruptedRecording {
  activityId: ActivityId;
  skew: ClockSkew;
  startedAt: number;
}

export interface PointBuffer {
  /**
   * Reserves the next sequence number for this activity. Monotonic and
   * **persisted**: §6 requires it to survive the app being killed, because it is
   * what carries idempotency on the server side.
   */
  reserveSequenceNumber(activityId: ActivityId): Promise<number>;

  append(activityId: ActivityId, point: RecordedPoint): Promise<void>;

  /** The oldest unsent points, in sequence order. */
  pending(activityId: ActivityId, limit: number): Promise<readonly RecordedPoint[]>;

  pendingCount(activityId: ActivityId): Promise<number>;

  /** Drops everything up to and including this sequence number. */
  purgeUpTo(activityId: ActivityId, sequenceNumber: number): Promise<void>;

  /**
   * What a crash left behind. §6: at launch, an activity that was in progress is
   * offered for resumption, with its unsent points.
   */
  interrupted(): Promise<InterruptedRecording | undefined>;

  remember(recording: InterruptedRecording): Promise<void>;

  forget(activityId: ActivityId): Promise<void>;
}
