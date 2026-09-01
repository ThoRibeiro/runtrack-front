import type { LiveMessage } from '@runtrack/core';
import type { RefreshCoordinator } from '../auth/refreshCoordinator';
import type { SessionHolder } from '../auth/sessionHolder';
import { defaultCorrelationIdFactory, type CorrelationIdFactory } from '../http/correlationId';
import { SseFrameParser } from './sseFrames';
import type { SseTransport, SseTransportSubscription } from './sseTransport';

/**
 * One authenticated SSE subscription, whatever it is a subscription *to*.
 *
 * §0 gives the application two streams — an activity and an inbox — and they
 * differ by exactly one thing: their path. Everything else is identical, and
 * writing it twice would mean two places to get the single-flight renewal
 * wrong. So the mechanics live here, and each stream provides its URL.
 *
 * What this owns: the bearer and the one renewal a 401 is allowed to trigger,
 * `Last-Event-ID`, and turning frames into messages. What it deliberately does
 * not own: the retry policy, the deduplication and the watchdog — those are in
 * the hexagon, where they are testable.
 */
const UNAUTHORISED = 401;

export interface SseSubscriberOptions {
  transport: SseTransport;
  session?: { holder: SessionHolder; refresh: RefreshCoordinator } | undefined;
  newCorrelationId?: CorrelationIdFactory | undefined;
  /**
   * Opens the stream without a bearer.
   *
   * A share link is read by someone who may have no account: the token is in
   * the URL — `/shared/v1/{token}/stream` — and the server resolves it there.
   * Sending a session bearer as well would have it answer as that account.
   */
  anonymous?: boolean | undefined;
}

export interface SseSubscriptionRequest {
  url: string;
  lastEventId?: string | undefined;
  onMessage: (message: LiveMessage) => void;
  onError: (error: unknown) => void;
}

/**
 * One connection, and whether it is still wanted.
 *
 * The flag is behind a method rather than being a plain `let`: the compiler
 * narrows a boolean that no synchronous path writes to, and the guards that
 * matter — the ones running after an await, from a transport callback — would
 * be deleted as unreachable.
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

export class SseSubscriber {
  private readonly newCorrelationId: CorrelationIdFactory;

  constructor(private readonly options: SseSubscriberOptions) {
    this.newCorrelationId = options.newCorrelationId ?? defaultCorrelationIdFactory;
  }

  open(request: SseSubscriptionRequest): { close: () => void } {
    const state = new Connection();
    this.connect(request, state, true);

    return {
      close: () => {
        state.close();
      },
    };
  }

  private connect(request: SseSubscriptionRequest, state: Connection, mayRenew: boolean): void {
    if (state.isClosed()) return;

    const parser = new SseFrameParser((message) => {
      if (!state.isClosed()) request.onMessage(message);
    });

    state.attach(
      this.options.transport.open({
        url: request.url,
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
            request.onError(new Error(`Le flux a répondu ${String(status)}.`));
          }
        },
        onChunk: (text) => {
          parser.push(text);
        },
        onError: (error) => {
          if (!state.isClosed()) request.onError(error);
        },
        onClose: () => {
          // Indistinguishable from a dropped connection down here. The session
          // above knows whether there is anything left to follow.
          if (!state.isClosed()) request.onError(new Error('Le flux s’est refermé.'));
        },
      }),
    );
  }

  private async renewAndReconnect(
    request: SseSubscriptionRequest,
    state: Connection,
  ): Promise<void> {
    const session = this.options.session;
    const stale = session?.holder.current();
    if (session === undefined || stale === undefined) {
      request.onError(new Error('Ce flux demande une session.'));
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

    const token = this.options.session?.holder.current()?.accessToken;
    if (token !== undefined && this.options.anonymous !== true) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }
}
