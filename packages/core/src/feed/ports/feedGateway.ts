import type { Page, PageRequest } from '../../shared/paging/page';
import type { FeedItem } from '../domain/feedItem';

export interface FeedGateway {
  read(page: PageRequest): Promise<Page<FeedItem>>;
}
