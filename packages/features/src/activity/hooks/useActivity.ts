import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Activity, ActivityId, Split } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

export function useActivity(id: ActivityId): UseQueryResult<Activity> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.activity(id),
    queryFn: () => runtime.activities.byId(id),
  });
}

/**
 * Splits are a separate query on purpose: they are only shown once the sheet is
 * opened, and a finished activity's splits never change — so they can be cached
 * far longer than the activity itself.
 */
export function useSplits(id: ActivityId, enabled: boolean): UseQueryResult<readonly Split[]> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.splits(id),
    queryFn: () => runtime.activities.splits(id),
    enabled,
  });
}
