import type {
  Activity,
  ActivityStats,
  ActivityType,
  Visibility,
} from '../../activity/domain/activity';
import { acceptsPoints } from '../../activity/domain/activity';
import type { LocationFix, RecordedPoint } from '../../activity/domain/track';
import type { ActivityGateway } from '../../activity/ports/activityGateway';
import type { GeoPoint } from '../../measure/geo';
import type { ActivityId } from '../../shared/identity/ids';
import type { Clock } from '../../shared/time/clock';
import type { Cancel } from '../../shared/time/scheduler';
import { MAXIMUM_POINTS_PER_BATCH, batchesFor } from '../domain/batching';
import { isSkewAcceptable, observeSkew, type ClockSkew } from '../domain/clockSkew';
import {
  trailingAccuracyRejections,
  warningsFrom,
  type IngestionOutcome,
  type RecordingWarning,
} from '../domain/ingestion';
import type { InterruptedRecording, PointBuffer } from '../ports/pointBuffer';
import type { LocationPermission, LocationTracker } from '../ports/locationTracker';

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
  /**
   * Carries what the system answered, because "refused" is two situations. A
   * runner who only granted "while in use" can still be shown the dialog; one
   * who said no outright cannot, and has to be sent to the settings app.
   */
  | { kind: 'permission-refused'; permission: LocationPermission }
  /** The phone's clock is too far off for the server to accept the activity. */
  | { kind: 'clock-unusable'; skew: ClockSkew };

export class Recorder {
  private current: Activity | undefined;
  private skew: ClockSkew = { offset: 0 };
  private accuracyStreak = 0;
  private warnings: readonly RecordingWarning[] = [];
  private lastStats: ActivityStats | undefined;
  private captured: GeoPoint[] = [];
  private readonly pointListeners = new Set<(point: GeoPoint) => void>();

  constructor(private readonly deps: RecorderDependencies) {}

  get activity(): Activity | undefined {
    return this.current;
  }

  /**
   * What the server has counted, as of the last flush.
   *
   * The server's figures and not a local sum: it filters implausible points and
   * smooths elevation, so a distance computed on the phone drifts away from the
   * one the run will end up having. The screen shows the truth, a few seconds
   * late, rather than a number that will be corrected later.
   */
  get stats(): ActivityStats | undefined {
    return this.lastStats;
  }

  /**
   * The run as it is being drawn, for the map only.
   *
   * The server owns the numbers (see `stats`), but not the line: a trace that
   * waited for the next flush would lag ten seconds behind the runner. These
   * are the positions as captured, kept so a map remounting mid-run — the
   * screen was left and come back to — redraws what is already there instead
   * of starting from the current corner.
   */
  get trace(): readonly GeoPoint[] {
    return this.captured;
  }

  /**
   * Each accepted position, as it arrives. Imperative on purpose (§7): a run of
   * three hours is ten thousand points, and none of them may go through React.
   */
  onPointRecorded(listener: (point: GeoPoint) => void): Cancel {
    this.pointListeners.add(listener);
    return () => {
      this.pointListeners.delete(listener);
    };
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

    if (granted !== 'granted-always') return { kind: 'permission-refused', permission: granted };

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
    this.lastStats = activity.stats;
    this.captured = [];
    await this.deps.buffer.remember({
      activityId: activity.id,
      skew: this.skew,
      startedAt: activity.startedAt,
    });
    await this.startTracking();

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

    // Told to the map only once it is written: a line drawn for a point that
    // was never persisted would show a run the server will never have.
    this.captured.push(fix.position);
    for (const listener of this.pointListeners) listener(fix.position);
    return point;
  }

  /** Ce qui attend encore d'être envoyé — zéro quand aucune course ne tourne. */
  async pendingCount(): Promise<number> {
    const activity = this.current;
    return activity === undefined ? 0 : this.deps.buffer.pendingCount(activity.id);
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

      // Jusqu'à ce que le serveur a **traité** : accepté, ou refusé nommément.
      //
      // Purger au seul `lastAcceptedSequence` paraissait prudent, mais un point
      // refusé pour saut de position ne deviendra jamais valide : il restait
      // dans le tampon, bloquait tout ce qui le suivait, repartait à chaque
      // battement et se faisait refuser à nouveau. « 28 points en attente » qui
      // ne descendent jamais, et une distance qui n'avance plus.
      //
      // Ce qui n'est ni accepté ni cité dans `rejected` n'a pas été traité : il
      // reste, et repartira.
      const handled = outcome.rejected.reduce(
        (highest, rejection) => Math.max(highest, rejection.sequenceNumber),
        outcome.lastAcceptedSequence,
      );
      await this.deps.buffer.purgeUpTo(activity.id, handled);
      this.accuracyStreak = trailingAccuracyRejections(outcome, this.accuracyStreak);
      this.lastStats = outcome.stats;
    }

    const remaining = await this.deps.buffer.pendingCount(activity.id);
    this.warnings =
      lastOutcome === undefined ? [] : warningsFrom(lastOutcome, this.accuracyStreak, remaining);
    return this.warnings;
  }

  /**
   * Pausing stops the GPS as well as the activity.
   *
   * Two reasons, and both are §6's. A run is paused at a red light or a water
   * fountain, and a phone that keeps a navigation-grade fix going meanwhile
   * spends battery on a trace nobody wants. And the server refuses points on a
   * paused activity — recording them anyway would fill the buffer with
   * rejections and make the warning of §6 meaningless.
   */
  async pause(): Promise<Activity | undefined> {
    const paused = await this.transition((id) => this.deps.gateway.pause(id));
    if (paused !== undefined) await this.deps.tracker.stop();
    return paused;
  }

  async resume(): Promise<Activity | undefined> {
    const resumed = await this.transition((id) => this.deps.gateway.resume(id));
    if (resumed !== undefined) await this.startTracking();
    return resumed;
  }

  /** Flushes first: finishing with points still buffered would lose the end of the run. */
  async finish(): Promise<Activity | undefined> {
    if (this.current === undefined) return undefined;
    await this.flush();
    const finished = await this.transition((id) => this.deps.gateway.finish(id));
    await this.stopTracking();
    return finished;
  }

  /**
   * Laisse tomber une course qu'un arrêt a laissée derrière.
   *
   * Ce qui peut encore partir part — la fin d'une vraie course a de la valeur —
   * mais **le tampon est vidé quoi qu'il arrive**. C'est la différence entre
   * « on a essayé » et « on a fini » : sans le `finally`, un serveur qui refuse
   * ces points les laisse en base locale, et la proposition de reprise revient
   * à chaque ouverture de l'application.
   */
  async dropInterrupted(recording: InterruptedRecording): Promise<void> {
    try {
      const state = await this.resumeInterrupted(recording);
      if (state !== undefined) await this.discard();
    } catch {
      // Voir plus haut : ce qui reste n'a plus de destination.
    } finally {
      await this.deps.tracker.stop();
      await this.deps.buffer.forget(recording.activityId);
      this.current = undefined;
      this.captured = [];
    }
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
      try {
        await this.flush();
      } catch {
        // §15 forbids a silent catch; this one has a reason, and it is the whole
        // point of the branch. The activity is **closed on the server**, so it
        // refuses these points — and it will refuse them again at every launch.
        // Swallowing the failure is what lets the `finally` forget them; without
        // it the buffer survives, and "une course était en cours" comes back
        // for ever, offering to send points nothing will ever accept.
      } finally {
        await this.stopTracking();
      }
      return undefined;
    }

    this.current = activity;
    this.skew = recording.skew;
    this.accuracyStreak = 0;
    // Nothing to redraw: what the crash left behind is in the buffer as points
    // owed to the server, purged as they land, so it is not the run's shape.
    // The line restarts from here, and the server keeps the whole of it.
    this.captured = [];
    await this.startTracking();
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

  private async startTracking(): Promise<void> {
    await this.deps.tracker.start((fix) => {
      void this.record(fix);
    });
  }

  private async stopTracking(): Promise<void> {
    await this.deps.tracker.stop();
    if (this.current !== undefined) await this.deps.buffer.forget(this.current.id);
    this.current = undefined;
    this.captured = [];
  }
}
