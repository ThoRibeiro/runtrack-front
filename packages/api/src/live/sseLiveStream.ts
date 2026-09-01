import type { LiveStream, LiveStreamRequest, LiveSubscription } from '@runtrack/core';
import { SseSubscriber, type SseSubscriberOptions } from './sseSubscriber';

/**
 * `LiveStream` over SSE (§7) — the activity stream.
 *
 * Everything mechanical is in `SseSubscriber`, which the notification stream
 * shares. What is left here is the path, which is the only thing that differs.
 */
export interface SseLiveStreamOptions extends SseSubscriberOptions {
  baseUrl: string;
}

export class SseLiveStream implements LiveStream {
  private readonly subscriber: SseSubscriber;

  constructor(private readonly options: SseLiveStreamOptions) {
    this.subscriber = new SseSubscriber(options);
  }

  open(request: LiveStreamRequest): LiveSubscription {
    return this.subscriber.open({
      url: `${this.options.baseUrl}/race/v1/${request.activityId}/stream`,
      lastEventId: request.lastEventId,
      onMessage: request.onMessage,
      onError: request.onError,
    });
  }
}
