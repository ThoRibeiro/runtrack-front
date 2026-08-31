import type { Activity, ActivityType, Visibility } from '../../activity/domain/activity';
import { acceptsPoints } from '../../activity/domain/activity';
import type { LocationFix, RecordedPoint } from '../../activity/domain/track';
import type { ActivityGateway } from '../../activity/ports/activityGateway';
import type { ActivityId } from '../../shared/identity/ids';
import type { Clock } from '../../shared/time/clock';
import { MAXIMUM_POINTS_PER_BATCH, batchesFor } from '../domain/batching';
import { isSkewAcceptable, observeSkew, type ClockSkew } from '../domain/clockSkew';
import {
  trailingAccuracyRejections,
  warningsFrom,
  type IngestionOutcome,
  type RecordingWarning,
} from '../domain/ingestion';
import type { InterruptedRecording, PointBuffer } from '../ports/pointBuffer';
import type { LocationTracker } from '../ports/locationTracker';

/**
 * The recorder, and the reason the back-end was worth writing.
 *
 * Everything here is orchestration over ports: nothing in this file knows what
 * SQLite, a foreground service or an HTTP client look like. What it does own is
 * the four rules that break silently, and §13 names all four:
 *
 *  - a point is **persisted before anything else**. Not buffered in memory, not
 *    held until the network comes back — written, then maybe sent;
 *  - the sequence number is **reserved by the buffer**, so it survives a kill
 *    and keeps carrying idempotency on the server side;
 *  - the buffer is purged **up to `lastAcceptedSequence` and no further**;
 *  - rejections are **read**, not counted and dropped.
 */
export interface RecorderDependencies {
  gateway: ActivityGateway;
  buffer: PointBuffer;
  tracker: LocationTracker;
  clock: Clock;
}

export interface RecorderState {
  activity: Activity;
  skew: ClockSkew;
  warnings: readonly RecordingWarning[];
}

export type StartOutcome =
  | { kind: 'started'; state: RecorderState }
  | { kind: 'permission-refused' }
  /** The phone's clock is too far off for the server to accept the activity. */
  | { kind: 'clock-unusable'; skew: ClockSkew };

export class Recorder {
  private current: Activity | undefined;
  private skew: ClockSkew = { offset: 0 };
  private accuracyStreak = 0;
  private warnings: readonly RecordingWarning[] = [];

  constructor(private readonly deps: RecorderDependencies) {}

  get activity(): Activity | undefined {
    return this.current;
  }

  /**
   * §6: the "always" permission is asked here — when the runner starts their
   * first activity — and not on first launch. The explanation before the system
   * dialog is the shell's job; refusing to start without the permission is this
   * one's.
   */
  async start(command: {
    type: ActivityType;
    title: string;
    visibility: Visibility;
    description?: string | undefined;
  }): Promise<StartOutcome> {
    const permission = await this.deps.tracker.permission();
    const granted =
      permission === 'granted-always'
        ? permission
        : await this.deps.tracker.requestAlwaysPermission();

    if (granted !== 'granted-always') return { kind: 'permission-refused' };

    const deviceTime = this.deps.clock.now();
    const activity = await this.deps.gateway.start({ ...command, deviceTime });

    // The server has now dated the activity with its own clock. The difference
    // is the drift, measured once and never again (§6).
    this.skew = observeSkew(deviceTime, activity.startedAt);
    if (!isSkewAcceptable(this.skew)) {
      await this.deps.gateway.discard(activity.id);
      return { kind: 'clock-unusable', skew: this.skew };
    }

    this.current = activity;
    this.accuracyStreak = 0;
    this.warnings = [];
    await this.deps.buffer.remember({
      activityId: activity.id,
      skew: this.skew,
      startedAt: activity.startedAt,
    });
    await this.deps.tracker.start((fix) => {
      void this.record(fix);
    });

    return { kind: 'started', state: { activity, skew: this.skew, warnings: [] } };
  }

  /**
   * A fix arrives. It is written to the buffer and nothing else: sending is a
   * separate concern, on its own schedule, so a network outage cannot lose a
   * point that has already been captured.
   */
  async record(fix: LocationFix): Promise<RecordedPoint | undefined> {
    const activity = this.current;
    if (activity === undefined || !acceptsPoints(activity.status)) return undefined;

    const sequenceNumber = await this.deps.buffer.reserveSequenceNumber(activity.id);
    const point: RecordedPoint = { ...fix, sequenceNumber };
    await this.deps.buffer.append(activity.id, point);
    return point;
  }

  /**
   * Sends what the buffer holds. §6: every five to ten seconds, or when the
   * network comes back — the schedule belongs to the shell, the batching to here.
   *
   * A batch that fails is not purged. That is the entire offline story: the
   * points stay, and the next flush sends them again under the same derived
   * idempotency key, so the server replays its answer rather than duplicating.
   */
  async flush(): Promise<readonly RecordingWarning[]> {
    const activity = this.current;
    if (activity === undefined) return [];

    // A replay after a long tunnel goes over the thousand-point cap, so the
    // window read here is deliberately larger than one batch.
    const pending = await this.deps.buffer.pending(activity.id, MAXIMUM_POINTS_PER_BATCH * 10);
    if (pending.length === 0) {
      this.warnings = [];
      return this.warnings;
    }

    let lastOutcome: IngestionOutcome | undefined;

    for (const batch of batchesFor(activity.id, pending)) {
      const outcome = await this.deps.gateway.ingest(batch);
      lastOutcome = outcome;

      // Up to `lastAcceptedSequence`, and no further: anything after it is
      // still owed to the server, whether it was rejected or never reached it.
      await this.deps.buffer.purgeUpTo(activity.id, outcome.lastAcceptedSequence);
      this.accuracyStreak = trailingAccuracyRejections(outcome, this.accuracyStreak);
    }

    const remaining = await this.deps.buffer.pendingCount(activity.id);
    this.warnings =
      lastOutcome === undefined ? [] : warningsFrom(lastOutcome, this.accuracyStreak, remaining);
    return this.warnings;
  }

  async pause(): Promise<Activity | undefined> {
    return this.transition((id) => this.deps.gateway.pause(id));
  }

  async resume(): Promise<Activity | undefined> {
    return this.transition((id) => this.deps.gateway.resume(id));
  }

  /** Flushes first: finishing with points still buffered would lose the end of the run. */
  async finish(): Promise<Activity | undefined> {
    if (this.current === undefined) return undefined;
    await this.flush();
    const finished = await this.transition((id) => this.deps.gateway.finish(id));
    await this.stopTracking();
    return finished;
  }

  async discard(): Promise<Activity | undefined> {
    const discarded = await this.transition((id) => this.deps.gateway.discard(id));
    await this.stopTracking();
    return discarded;
  }

  /**
   * §6: at launch, an activity left in progress is offered for resumption with
   * its unsent points. It is offered, not resumed silently — the runner may
   * well have finished hours ago.
   */
  async resumable(): Promise<
    { recording: InterruptedRecording; pendingCount: number } | undefined
  > {
    const interrupted = await this.deps.buffer.interrupted();
    if (interrupted === undefined) return undefined;
    return {
      recording: interrupted,
      pendingCount: await this.deps.buffer.pendingCount(interrupted.activityId),
    };
  }

  /** Picks an interrupted activity back up, drift included — it is never re-measured. */
  async resumeInterrupted(recording: InterruptedRecording): Promise<RecorderState | undefined> {
    const activity = await this.deps.gateway.byId(recording.activityId);
    if (!acceptsPoints(activity.status)) {
      // Finished or discarded server-side while the phone was off: flush what
      // is left, then let go of it rather than reopening a closed activity.
      this.current = activity;
      this.skew = recording.skew;
      await this.flush();
      await this.stopTracking();
      return undefined;
    }

    this.current = activity;
    this.skew = recording.skew;
    this.accuracyStreak = 0;
    await this.deps.tracker.start((fix) => {
      void this.record(fix);
    });
    return { activity, skew: this.skew, warnings: this.warnings };
  }

  private async transition(
    move: (id: ActivityId) => Promise<Activity>,
  ): Promise<Activity | undefined> {
    const activity = this.current;
    if (activity === undefined) return undefined;
    const next = await move(activity.id);
    this.current = next;
    return next;
  }

  private async stopTracking(): Promise<void> {
    await this.deps.tracker.stop();
    if (this.current !== undefined) await this.deps.buffer.forget(this.current.id);
    this.current = undefined;
  }
}
