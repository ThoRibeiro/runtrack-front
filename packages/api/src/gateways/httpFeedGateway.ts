import type { FeedGateway, FeedItem, Page, PageRequest } from '@runtrack/core';
import type { components } from '../generated/schema';
import { toPage, type CursorPage, type HttpClient } from '../http/httpClient';
import { toFeedItem } from '../mappers/feed';

type FeedItemDto = components['schemas']['FeedItem'];

export class HttpFeedGateway implements FeedGateway {
  constructor(private readonly http: HttpClient) {}

  async read(page: PageRequest): Promise<Page<FeedItem>> {
    const dto = await this.http.request<CursorPage<FeedItemDto>>('/feed/v1', {
      query: { cursor: page.cursor, limit: page.limit },
    });
    return toPage(dto, toFeedItem);
  }
}
