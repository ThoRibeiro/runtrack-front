import type { ActivityId } from '../../shared/identity/ids';
import type { LiveMessage } from '../domain/liveEvent';

/**
 * The SSE transport, behind a port because **`EventSource` does not exist in
 * React Native** (§7). A polyfill on mobile, the browser's own on the web, and
 * the rest of the code never finds out which.
 */
export interface LiveSubscription {
  close(): void;
}

export interface LiveStreamRequest {
  activityId: ActivityId;
  /** §7: replayed by the server so nothing is missed. */
  lastEventId?: string | undefined;
  onMessage: (message: LiveMessage) => void;
  /** Called on transport failure. The watchdog handles silence; this handles noise. */
  onError: (error: unknown) => void;
}

export interface LiveStream {
  open(request: LiveStreamRequest): LiveSubscription;
}
