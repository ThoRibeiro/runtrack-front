import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { MyProfile, PublicProfile, RunnerTotals, StatsPeriod } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

export function useMe(): UseQueryResult<MyProfile> {
  const runtime = useRuntime();
  return useQuery({ queryKey: queryKeys.me, queryFn: () => runtime.users.me() });
}

/**
 * §10: calendar periods, in the client's own time zone. The zone is part of the
 * cache key — the same week is not the same week in Nouméa.
 */
export function useMyStats(period: StatsPeriod, zone: string): UseQueryResult<RunnerTotals> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.myStats(period, zone),
    queryFn: () => runtime.users.stats(period, zone),
  });
}

export function useProfile(handle: string): UseQueryResult<PublicProfile> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.profile(handle),
    queryFn: () => runtime.social.profileOf(handle),
    enabled: handle !== '',
  });
}

/** The device's own zone, which is what a calendar period must be resolved in. */
export function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
