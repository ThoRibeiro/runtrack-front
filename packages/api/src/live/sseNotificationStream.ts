import type { LiveMessage, NotificationStream } from '@runtrack/core';
import { SseSubscriber, type SseSubscriberOptions } from './sseSubscriber';

/**
 * The second stream of §0: the inbox, live (§12).
 *
 * Same transport, same resumption rules, same single renewal as the activity
 * stream — only the path differs. On connection the server replays the unread
 * notifications as ordinary `notification` events, so a client that has been
 * offline catches up without a separate "snapshot" code path.
 */
export interface SseNotificationStreamOptions extends SseSubscriberOptions {
  baseUrl: string;
}

export class SseNotificationStream implements NotificationStream {
  private readonly subscriber: SseSubscriber;

  constructor(private readonly options: SseNotificationStreamOptions) {
    this.subscriber = new SseSubscriber(options);
  }

  open(request: {
    lastEventId?: string | undefined;
    onMessage: (message: LiveMessage) => void;
    onError: (error: unknown) => void;
  }): { close: () => void } {
    return this.subscriber.open({
      url: `${this.options.baseUrl}/notification/v1/stream`,
      lastEventId: request.lastEventId,
      onMessage: request.onMessage,
      onError: request.onError,
    });
  }
}
