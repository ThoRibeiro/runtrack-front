import type { LiveStream, LiveStreamRequest, LiveSubscription } from '@runtrack/core';
import type { RefreshCoordinator } from '../auth/refreshCoordinator';
import type { SessionHolder } from '../auth/sessionHolder';
import { defaultCorrelationIdFactory, type CorrelationIdFactory } from './../http/correlationId';
import { SseFrameParser } from './sseFrames';
import type { SseTransport, SseTransportSubscription } from './sseTransport';

/**
 * `LiveStream` over SSE (§7).
 *
 * Three things it owns, and nothing else — the retry policy, the deduplication
 * and the watchdog all live in `LiveSession`, in the hexagon:
 *
 *  - **the bearer.** The stream is authenticated, so a 401 has to renew and
 *    re-open exactly once. It goes through the same `RefreshCoordinator` as
 *    every request, which is what keeps §11's single-flight promise: ten
 *    requests and a stream, one renewal;
 *  - **`Last-Event-ID`.** Handed over by the session, sent as a header;
 *  - **frames into messages**, via `SseFrameParser`.
 *
 * A clean close is reported as an error to the session, deliberately: from
 * here, a server that hangs up and a network that dies look identical, and the
 * session is the only thing that knows whether the activity has ended.
 */
const UNAUTHORISED = 401;

/**
 * One live connection, and whether it is still wanted.
 *
 * The flag is behind a method rather than being a plain `let`: the compiler
 * narrows a boolean that no synchronous path writes to, and the guards that
 * matter here — the ones that run *after* an await, from a transport callback —
 * would be quietly deleted as unreachable.
 */
class Connection {
  private closed = false;
  private subscription: SseTransportSubscription | undefined;

  isClosed(): boolean {
    return this.closed;
  }

  attach(subscription: SseTransportSubscription): void {
    this.subscription = subscription;
  }

  /** Drops the current connection, keeping the intent to be connected. */
  detach(): void {
    this.subscription?.close();
    this.subscription = undefined;
  }

  close(): void {
    this.closed = true;
    this.detach();
  }
}

export interface SseLiveStreamOptions {
  baseUrl: string;
  transport: SseTransport;
  /** Absent on the public share pages, which are read without an account. */
  session?: { holder: SessionHolder; refresh: RefreshCoordinator } | undefined;
  newCorrelationId?: CorrelationIdFactory | undefined;
  /** A share-link token opens a private activity with no session at all. */
  shareToken?: string | undefined;
}

export class SseLiveStream implements LiveStream {
  private readonly newCorrelationId: CorrelationIdFactory;

  constructor(private readonly options: SseLiveStreamOptions) {
    this.newCorrelationId = options.newCorrelationId ?? defaultCorrelationIdFactory;
  }

  open(request: LiveStreamRequest): LiveSubscription {
    const state = new Connection();

    this.connect(request, state, true);

    return {
      close: () => {
        state.close();
      },
    };
  }

  private connect(request: LiveStreamRequest, state: Connection, mayRenew: boolean): void {
    if (state.isClosed()) return;

    const parser = new SseFrameParser((message) => {
      if (!state.isClosed()) request.onMessage(message);
    });

    state.attach(
      this.options.transport.open({
        url: `${this.options.baseUrl}/race/v1/${request.activityId}/stream`,
        headers: this.headers(request.lastEventId),
        onOpen: (status) => {
          if (state.isClosed()) return;
          if (status === UNAUTHORISED && mayRenew) {
            // Once. A second 401 after a fresh token is not a token problem,
            // and renewing again would be the stampede §11 is about.
            void this.renewAndReconnect(request, state);
            return;
          }
          if (status >= 400) {
            request.onError(new Error(`Le direct a répondu ${String(status)}.`));
          }
        },
        onChunk: (text) => {
          parser.push(text);
        },
        onError: (error) => {
          if (!state.isClosed()) request.onError(error);
        },
        onClose: () => {
          // Indistinguishable from a dropped connection down here.
          // `LiveSession` knows whether the activity is over, and stops
          // retrying if it is.
          if (!state.isClosed()) request.onError(new Error('Le direct s’est refermé.'));
        },
      }),
    );
  }

  private async renewAndReconnect(request: LiveStreamRequest, state: Connection): Promise<void> {
    const session = this.options.session;
    const stale = session?.holder.current();
    if (session === undefined || stale === undefined) {
      request.onError(new Error('Le direct demande une session.'));
      return;
    }

    try {
      await session.refresh.refresh(stale.refreshToken);
    } catch (error) {
      // A refused renewal ends the session; the error carries the `code` the
      // shell reads to send the user back to sign-in.
      request.onError(error);
      return;
    }

    state.detach();
    this.connect(request, state, false);
  }

  private headers(lastEventId: string | undefined): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      // Proxies that buffer turn a live stream into a batch delivered minutes
      // late. This asks the ones that understand it not to.
      'Cache-Control': 'no-cache',
      'X-Correlation-Id': this.newCorrelationId(),
    };

    if (lastEventId !== undefined) headers['Last-Event-ID'] = lastEventId;
    if (this.options.shareToken !== undefined) {
      headers['X-Share-Token'] = this.options.shareToken;
    }

    const token = this.options.session?.holder.current()?.accessToken;
    if (token !== undefined) headers['Authorization'] = `Bearer ${token}`;

    return headers;
  }
}
