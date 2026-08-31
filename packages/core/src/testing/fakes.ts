import type { Activity, ActivityStats, ActivityStatus } from '../activity/domain/activity';
import type { RecordedPoint, Split, Track } from '../activity/domain/track';
import type { ActivityGateway, StartActivityCommand } from '../activity/ports/activityGateway';
import type { LiveMessage } from '../live/domain/liveEvent';
import type { LiveStream, LiveStreamRequest, LiveSubscription } from '../live/ports/liveStream';
import type { PointBatch } from '../recording/domain/batching';
import type { IngestionOutcome, RejectedPoint } from '../recording/domain/ingestion';
import type { LocationPermission, LocationTracker } from '../recording/ports/locationTracker';
import type { InterruptedRecording, PointBuffer } from '../recording/ports/pointBuffer';
import type { LocationFix } from '../activity/domain/track';
import { activityId, userId, type ActivityId } from '../shared/identity/ids';
import type { Page } from '../shared/paging/page';
import type { Visibility } from '../activity/domain/activity';

/**
 * In-memory doubles for the outbound ports.
 *
 * They live in `src` rather than beside a single test on purpose: the shells
 * need them too — a demo mode, a screenshot run, an end-to-end test that must
 * not touch the network. They are excluded from coverage, because a fake that
 * needs its own tests is a fake that does too much.
 */
export const EMPTY_STATS: ActivityStats = {
  distanceMetres: 0,
  elapsedSeconds: 0,
  movingTimeSeconds: 0,
  averagePaceSecondsPerKm: undefined,
  currentPaceSecondsPerKm: undefined,
  elevationGain: 0,
  elevationLoss: 0,
  averageHeartRate: undefined,
  maxHeartRate: undefined,
};

export function anActivity(overrides: Partial<Activity> = {}): Activity {
  const live: ActivityStatus = { kind: 'live', since: 1_700_000_000_000 };
  return {
    id: activityId('activity-1'),
    ownerId: userId('user-1'),
    type: 'RUN',
    title: 'Sortie du matin',
    description: undefined,
    visibility: 'FOLLOWERS',
    status: live,
    startedAt: 1_700_000_000_000,
    endedAt: undefined,
    stats: EMPTY_STATS,
    ...overrides,
  };
}

export function aFix(overrides: Partial<LocationFix> = {}): LocationFix {
  return {
    position: { latitude: 48.8566, longitude: 2.3522 },
    elevationMetres: 35,
    recordedAt: 1_700_000_001_000,
    accuracyMetres: 5,
    ...overrides,
  };
}

/** A buffer that behaves like SQLite: it survives being read, and it remembers. */
export class InMemoryPointBuffer implements PointBuffer {
  private readonly points = new Map<string, RecordedPoint[]>();
  private readonly sequences = new Map<string, number>();
  private interruptedRecording: InterruptedRecording | undefined;

  reserveSequenceNumber(id: ActivityId): Promise<number> {
    const next = (this.sequences.get(id) ?? -1) + 1;
    this.sequences.set(id, next);
    return Promise.resolve(next);
  }

  append(id: ActivityId, point: RecordedPoint): Promise<void> {
    const existing = this.points.get(id) ?? [];
    existing.push(point);
    this.points.set(id, existing);
    return Promise.resolve();
  }

  pending(id: ActivityId, limit: number): Promise<readonly RecordedPoint[]> {
    const all = [...(this.points.get(id) ?? [])].sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber,
    );
    return Promise.resolve(all.slice(0, limit));
  }

  pendingCount(id: ActivityId): Promise<number> {
    return Promise.resolve((this.points.get(id) ?? []).length);
  }

  purgeUpTo(id: ActivityId, sequenceNumber: number): Promise<void> {
    const kept = (this.points.get(id) ?? []).filter(
      (point) => point.sequenceNumber > sequenceNumber,
    );
    this.points.set(id, kept);
    return Promise.resolve();
  }

  interrupted(): Promise<InterruptedRecording | undefined> {
    return Promise.resolve(this.interruptedRecording);
  }

  remember(recording: InterruptedRecording): Promise<void> {
    this.interruptedRecording = recording;
    return Promise.resolve();
  }

  forget(): Promise<void> {
    this.interruptedRecording = undefined;
    return Promise.resolve();
  }
}

export class FakeLocationTracker implements LocationTracker {
  started = false;
  stopped = false;
  private emit: ((fix: LocationFix) => void) | undefined;

  constructor(private granted: LocationPermission = 'granted-always') {}

  permission(): Promise<LocationPermission> {
    return Promise.resolve(this.granted === 'granted-always' ? this.granted : 'undetermined');
  }

  requestAlwaysPermission(): Promise<LocationPermission> {
    return Promise.resolve(this.granted);
  }

  start(onFix: (fix: LocationFix) => void): Promise<void> {
    this.started = true;
    this.emit = onFix;
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.stopped = true;
    return Promise.resolve();
  }

  /** Pushes a fix as the platform would. */
  produce(fix: LocationFix): void {
    this.emit?.(fix);
  }
}

export interface RecordedIngestion {
  batch: PointBatch;
}

export class FakeActivityGateway implements ActivityGateway {
  readonly ingested: RecordedIngestion[] = [];
  activity: Activity = anActivity();
  /** What the next ingestion answers. Defaults to "everything accepted". */
  nextOutcome: ((batch: PointBatch) => IngestionOutcome) | undefined;

  start(command: StartActivityCommand): Promise<Activity> {
    this.activity = anActivity({ type: command.type, title: command.title });
    return Promise.resolve(this.activity);
  }

  byId(): Promise<Activity> {
    return Promise.resolve(this.activity);
  }

  ingest(batch: PointBatch): Promise<IngestionOutcome> {
    this.ingested.push({ batch });
    if (this.nextOutcome !== undefined) return Promise.resolve(this.nextOutcome(batch));

    const last = batch.points[batch.points.length - 1];
    const rejected: RejectedPoint[] = [];
    return Promise.resolve({
      stats: EMPTY_STATS,
      lastAcceptedSequence: last?.sequenceNumber ?? -1,
      acceptedCount: batch.points.length,
      rejected,
    });
  }

  pause(): Promise<Activity> {
    this.activity = { ...this.activity, status: { kind: 'paused', since: 1 } };
    return Promise.resolve(this.activity);
  }

  resume(): Promise<Activity> {
    this.activity = { ...this.activity, status: { kind: 'live', since: 2 } };
    return Promise.resolve(this.activity);
  }

  finish(): Promise<Activity> {
    this.activity = { ...this.activity, status: { kind: 'finished', since: 3 } };
    return Promise.resolve(this.activity);
  }

  discard(): Promise<Activity> {
    this.activity = { ...this.activity, status: { kind: 'discarded', since: 4 } };
    return Promise.resolve(this.activity);
  }

  changeVisibility(_id: ActivityId, visibility: Visibility): Promise<Activity> {
    this.activity = { ...this.activity, visibility };
    return Promise.resolve(this.activity);
  }

  track(): Promise<Track> {
    return Promise.resolve({ polyline: '', pointCount: 0, pointsPurgedAt: undefined });
  }

  splits(): Promise<readonly Split[]> {
    return Promise.resolve([]);
  }

  ofUser(): Promise<Page<Activity>> {
    return Promise.resolve({ items: [] });
  }

  live(): Promise<readonly Activity[]> {
    return Promise.resolve([]);
  }
}

/** A stream the test drives: it decides what arrives, and when. */
export class FakeLiveStream implements LiveStream {
  openCount = 0;
  lastEventIds: (string | undefined)[] = [];
  closed = 0;
  private current: LiveStreamRequest | undefined;

  open(request: LiveStreamRequest): LiveSubscription {
    this.openCount += 1;
    this.lastEventIds.push(request.lastEventId);
    this.current = request;
    return {
      close: () => {
        this.closed += 1;
      },
    };
  }

  deliver(message: LiveMessage): void {
    this.current?.onMessage(message);
  }

  fail(error: unknown): void {
    this.current?.onError(error);
  }
}
