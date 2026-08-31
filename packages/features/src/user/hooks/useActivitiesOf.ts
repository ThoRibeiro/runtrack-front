import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type { Activity, Page, UserId } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

const PAGE_SIZE = 20;

export function useActivitiesOf(id: UserId): UseInfiniteQueryResult<InfiniteData<Page<Activity>>> {
  const runtime = useRuntime();

  return useInfiniteQuery({
    queryKey: queryKeys.activitiesOf(id),
    queryFn: ({ pageParam }) =>
      runtime.activities.ofUser(id, { cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
