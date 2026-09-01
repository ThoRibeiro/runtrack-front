import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LiveSession,
  type ActivityId,
  type ActivityMapPresenter,
  type ActivityStats,
  type ActivityStatus,
} from '@runtrack/core';
import { parseLiveEvent } from '@runtrack/api';
import { useRuntime } from '../../runtime/RuntimeProvider';

/**
 * Following a run as it happens (§7), and the one rule that shapes this file:
 * **one render per second, whatever the GPS does** (§14).
 *
 * A `position` arrives every second for up to three hours. If each one set
 * state, the tree would render ten thousand times and the phone would cook. So
 * nothing here subscribes per event. The session buffers outside React —
 * that is what it is for — and this pumps it on a one-second beat:
 *
 *  - **the map** is fed imperatively, with only the tail it has not drawn. No
 *    render at all, at any rate;
 *  - **the banner** re-renders only if something it shows actually changed,
 *    which `hasChanged` answers without building a snapshot.
 *
 * Nothing in the returned view is a position. The trace lives on the map, and
 * §5 is explicit that the raw stream is never announced.
 */
export interface LiveView {
  status: ActivityStatus | undefined;
  stats: ActivityStats | undefined;
  connected: boolean;
  reconnectAttempts: number;
  /** The activity is over: the session has stopped trying, and so should the UI. */
  ended: boolean;
  /** How many points the map has been given. Useful to say "waiting for a fix". */
  drawnPoints: number;
  /**
   * The statistics as they stood the last time the screen was allowed to speak.
   *
   * §5 caps the live region at one announcement every thirty seconds, and the
   * cap belongs here rather than in the screen: this is where the beat is. The
   * screen turns this into a sentence, and because the object only changes on
   * the half-minute, the sentence does too — no effect, no second render.
   */
  announced: ActivityStats | undefined;
}

const PUMP_INTERVAL_MILLIS = 1_000;

/** §5: "au plus une annonce toutes les 30 secondes". */
const ANNOUNCEMENT_INTERVAL_MILLIS = 30_000;

const IDLE: LiveView = {
  status: undefined,
  stats: undefined,
  connected: false,
  reconnectAttempts: 0,
  ended: false,
  drawnPoints: 0,
  announced: undefined,
};

export interface UseLiveActivityOptions {
  /** Off on a finished activity: there is nothing to follow. */
  enabled?: boolean;
}

export function useLiveActivity(
  id: ActivityId,
  options: UseLiveActivityOptions = {},
): { view: LiveView; attachMap: (presenter: ActivityMapPresenter) => void } {
  const runtime = useRuntime();
  const enabled = options.enabled ?? true;

  const [view, setView] = useState<LiveView>(IDLE);
  const presenter = useRef<ActivityMapPresenter | undefined>(undefined);
  const drawnThrough = useRef(-1);
  const drawn = useRef(0);
  const session = useRef<LiveSession | undefined>(undefined);
  const announcedAt = useRef(0);

  /**
   * Hands the map whatever arrived since last time. Called on the beat, and
   * again the moment a map appears — a presenter built after the first points
   * landed would otherwise stay empty until the next tick.
   */
  const drawPending = useCallback(() => {
    const current = session.current;
    const map = presenter.current;
    if (current === undefined || map === undefined) return 0;

    const tail = current.positionsAfter(drawnThrough.current);
    if (tail.length === 0) return 0;

    const last = tail[tail.length - 1];
    if (last !== undefined) drawnThrough.current = last.sequenceNumber;
    const points = tail.map((position) => position.position);

    // The first batch is the snapshot the server sends on connection: §7 says
    // draw it in one go, not point by point.
    if (drawn.current === 0) map.showLiveSnapshot(points);
    else map.appendLive(points);

    drawn.current += points.length;
    return points.length;
  }, []);

  const attachMap = useCallback(
    (created: ActivityMapPresenter) => {
      presenter.current = created;
      if (drawPending() > 0) {
        setView((previous) => ({ ...previous, drawnPoints: drawn.current }));
      }
    },
    [drawPending],
  );

  // Opening a stream is a subscription, not a fetch (§15): TanStack Query owns
  // request/response, and this is neither.
  useEffect(() => {
    // Nothing to open, and nothing to reset either: the view returned below is
    // `IDLE` whenever this is off, so the state is never read while stale.
    if (!enabled) return undefined;

    drawnThrough.current = -1;
    drawn.current = 0;
    announcedAt.current = 0;
    const opened = new LiveSession(id, parseLiveEvent, {
      stream: runtime.live,
      scheduler: runtime.scheduler,
      clock: runtime.clock,
      random: runtime.random,
    });
    session.current = opened;
    opened.open();

    const stopPump = runtime.scheduler.every(PUMP_INTERVAL_MILLIS, () => {
      const added = drawPending();
      // `hasChanged` is read before the snapshot, which clears it.
      if (!opened.hasChanged && added === 0) return;

      const snapshot = opened.snapshot();
      setView((previous) => {
        const now = runtime.clock.now();
        const mayAnnounce = now - announcedAt.current >= ANNOUNCEMENT_INTERVAL_MILLIS;
        if (mayAnnounce) announcedAt.current = now;

        return {
          status: snapshot.status,
          stats: snapshot.stats,
          connected: snapshot.connected,
          reconnectAttempts: snapshot.reconnectAttempts,
          ended: snapshot.ended,
          drawnPoints: drawn.current,
          announced: mayAnnounce ? snapshot.stats : previous.announced,
        };
      });
    });

    return () => {
      stopPump();
      opened.close();
      session.current = undefined;
      presenter.current = undefined;
    };
  }, [id, enabled, runtime, drawPending]);

  return { view: enabled ? view : IDLE, attachMap };
}
