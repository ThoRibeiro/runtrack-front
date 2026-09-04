import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  type InfiniteData,
} from '@tanstack/react-query';
import { isLive, type FeedItem, type Page } from '@runtrack/core';
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

/**
 * Le fil se relit tout seul **tant qu'une course y est en cours**.
 *
 * Une sortie en direct avance sous les yeux du lecteur : sa distance et son
 * temps changent, et une carte figée à 0,0 km pendant vingt minutes se lit
 * comme une panne. Un flux par ligne serait hors de question — vingt courses,
 * vingt connexions — donc une relecture périodique, et seulement quand il y a
 * quelque chose à relire : un fil de courses terminées ne bouge plus.
 */
const LIVE_REFRESH_MILLIS = 20_000;

export function useFeed(): UseInfiniteQueryResult<InfiniteData<Page<FeedItem>>> {
  const runtime = useRuntime();

  return useInfiniteQuery({
    queryKey: queryKeys.feed,
    queryFn: ({ pageParam }) => runtime.feed.read({ cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const anyLive = pages.some((page) => page.items.some((item) => isLive(item)));
      return anyLive ? LIVE_REFRESH_MILLIS : false;
    },
  });
}

/** Flattens the pages read so far, in order. */
export function itemsOf(data: InfiniteData<Page<FeedItem>> | undefined): readonly FeedItem[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}
