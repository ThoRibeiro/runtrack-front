import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import type { FeedItem, Page } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

/**
 * The feed, page by cursor (§0: never offset/limit).
 *
 * `getNextPageParam` returns `undefined` — not `null`, not the last cursor —
 * when the server sends no `nextCursor`. That is what stops the list asking
 * for ever, and it is the difference between the end of a feed and an infinite
 * scroll that never settles.
 */
const PAGE_SIZE = 20;

export function useFeed(): UseInfiniteQueryResult<InfiniteData<Page<FeedItem>>> {
  const runtime = useRuntime();

  return useInfiniteQuery({
    queryKey: queryKeys.feed,
    queryFn: ({ pageParam }) => runtime.feed.read({ cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/** Flattens the pages read so far, in order. */
export function itemsOf(data: InfiniteData<Page<FeedItem>> | undefined): readonly FeedItem[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
