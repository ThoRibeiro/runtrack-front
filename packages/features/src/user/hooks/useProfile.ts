import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
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
 *
 * `enabled` exists because this endpoint answers for the signed-in runner and
 * for nobody else: asked from someone else's profile it returns *my* totals,
 * which is a request for data the screen must then remember not to show.
 *
 * The previous period's numbers are kept while the next ones load. Each period
 * is its own cache key, so without this the data is `undefined` for as long as
 * the request takes — the four tiles unmount, everything below them jumps up
 * under the finger that just tapped, and drops back a moment later.
 */
export function useMyStats(
  period: StatsPeriod,
  zone: string,
  enabled = true,
): UseQueryResult<RunnerTotals> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.myStats(period, zone),
    queryFn: () => runtime.users.stats(period, zone),
    placeholderData: keepPreviousData,
    enabled,
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
