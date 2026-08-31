import type { ActivityStats, ActivityStatus } from '../../activity/domain/activity';
import type { LivePosition } from '../../activity/domain/track';
import type { ActivityId } from '../../shared/identity/ids';
import type { Random } from '../../shared/random/random';
import type { Clock } from '../../shared/time/clock';
import type { Cancel, Scheduler } from '../../shared/time/scheduler';
import { HEARTBEAT_TIMEOUT, backoffDelay } from '../domain/backoff';
import type { LiveEvent, LiveMessage } from '../domain/liveEvent';
import type { LiveStream, LiveSubscription } from '../ports/liveStream';

/**
 * Following someone else's run, live (§7).
 *
 * Three things this owns, and each is a named trap in the brief:
 *
 *  - **duplicates**. A `position` can arrive twice; the server prefers a
 *    duplicate to a gap, and so do we. Every point carries its
 *    `sequenceNumber`, and anything already seen is dropped here rather than
 *    drawn twice on the map;
 *  - **resumption**. The last `id:` received goes back as `Last-Event-ID`. The
 *    server either replays what was missed or sends a fresh snapshot, and this
 *    code cannot tell the difference — by design, because the snapshot arrives
 *    as ordinary `status` / `stats` / `position` events;
 *  - **silence**. A dead connection reports nothing. Forty-five seconds without
 *    a heartbeat is the reconnection signal, not an error callback.
 *
 * And the performance trap of §7: one `position` per second for three hours. The
 * points land in a buffer **outside React** — this object — and the consumer
 * pulls from it at most once a second. Nothing here calls back per point.
 */
export interface LiveSessionDependencies {
  stream: LiveStream;
  scheduler: Scheduler;
  clock: Clock;
  random: Random;
}

export interface LiveSnapshot {
  status: ActivityStatus | undefined;
  stats: ActivityStats | undefined;
  /** In sequence order, deduplicated. */
  positions: readonly LivePosition[];
  connected: boolean;
  reconnectAttempts: number;
}

export type LiveParser = (message: LiveMessage) => LiveEvent | undefined;

export class LiveSession {
  private subscription: LiveSubscription | undefined;
  private cancelWatchdog: Cancel | undefined;
  private cancelRetry: Cancel | undefined;

  private lastEventId: string | undefined;
  private attempts = 0;
  private connected = false;

  private status: ActivityStatus | undefined;
  private stats: ActivityStats | undefined;
  private readonly positions: LivePosition[] = [];
  private readonly seenSequences = new Set<number>();

  private listener: ((snapshot: LiveSnapshot) => void) | undefined;
  private dirty = false;

  constructor(
    private readonly activityId: ActivityId,
    private readonly parse: LiveParser,
    private readonly deps: LiveSessionDependencies,
  ) {}

  open(): void {
    this.connect();
  }

  close(): void {
    this.subscription?.close();
    this.subscription = undefined;
    this.cancelWatchdog?.();
    this.cancelRetry?.();
    this.cancelWatchdog = undefined;
    this.cancelRetry = undefined;
    this.connected = false;
  }

  /**
   * The consumer polls; the session never pushes per event. `dirty` says
   * whether anything changed since the last read, so a screen can skip a render
   * entirely rather than re-rendering an unchanged bar (§7, §14).
   */
  snapshot(): LiveSnapshot {
    this.dirty = false;
    return {
      status: this.status,
      stats: this.stats,
      positions: [...this.positions],
      connected: this.connected,
      reconnectAttempts: this.attempts,
    };
  }

  get hasChanged(): boolean {
    return this.dirty;
  }

  /** For the map adapter, which draws imperatively and wants only the new tail. */
  positionsAfter(sequenceNumber: number): readonly LivePosition[] {
    return this.positions.filter((position) => position.sequenceNumber > sequenceNumber);
  }

  onChange(listener: (snapshot: LiveSnapshot) => void): void {
    this.listener = listener;
  }

  private connect(): void {
    this.cancelRetry?.();
    this.cancelRetry = undefined;

    this.subscription = this.deps.stream.open({
      activityId: this.activityId,
      lastEventId: this.lastEventId,
      onMessage: (message) => {
        this.receive(message);
      },
      onError: () => {
        this.reconnect();
      },
    });

    this.connected = true;
    this.armWatchdog();
  }

  private receive(message: LiveMessage): void {
    // The id advances even for an event this client ignores: resuming from an
    // older id would make the server replay everything in between.
    if (message.id !== undefined) this.lastEventId = message.id;

    this.attempts = 0;
    this.connected = true;
    this.armWatchdog();

    const event = this.parse(message);
    if (event === undefined) return;

    switch (event.kind) {
      case 'position':
        // The duplicate the server sends on purpose, dropped here.
        if (this.seenSequences.has(event.position.sequenceNumber)) return;
        this.seenSequences.add(event.position.sequenceNumber);
        this.insertOrdered(event.position);
        break;
      case 'stats':
        this.stats = event.stats;
        break;
      case 'status':
        this.status = event.status;
        break;
      case 'heartbeat':
        // Nothing to record: its only job is to have arrived.
        return;
    }

    this.dirty = true;
    this.listener?.(this.snapshotWithoutClearing());
  }

  /**
   * A replay can arrive out of order after a reconnection, and a map drawn from
   * an unordered list crosses itself.
   */
  private insertOrdered(position: LivePosition): void {
    const last = this.positions[this.positions.length - 1];
    if (last === undefined || last.sequenceNumber < position.sequenceNumber) {
      this.positions.push(position);
      return;
    }
    const index = this.positions.findIndex(
      (existing) => existing.sequenceNumber > position.sequenceNumber,
    );
    this.positions.splice(index, 0, position);
  }

  private armWatchdog(): void {
    this.cancelWatchdog?.();
    this.cancelWatchdog = this.deps.scheduler.after(HEARTBEAT_TIMEOUT, () => {
      // Silence, not an error. This is the only signal a dead connection gives.
      this.reconnect();
    });
  }

  private reconnect(): void {
    this.subscription?.close();
    this.subscription = undefined;
    this.cancelWatchdog?.();
    this.cancelWatchdog = undefined;
    this.connected = false;
    this.dirty = true;

    const delay = backoffDelay(this.attempts, this.deps.random);
    this.attempts += 1;
    this.cancelRetry = this.deps.scheduler.after(delay, () => {
      this.connect();
    });
  }

  private snapshotWithoutClearing(): LiveSnapshot {
    return {
      status: this.status,
      stats: this.stats,
      positions: [...this.positions],
      connected: this.connected,
      reconnectAttempts: this.attempts,
    };
  }
}
