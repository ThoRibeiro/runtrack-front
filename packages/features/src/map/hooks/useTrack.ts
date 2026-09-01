import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ActivityId, GeoPoint, Track } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

/**
 * The encoded track, then the decoded one — two queries, on purpose.
 *
 * §8: "la trace historisée arrive encodée. Décode-la, ne demande pas les points
 * bruts." The polyline comes down in a couple of kilobytes; turning it into ten
 * thousand points is the expensive half, and it belongs in its own cache entry
 * so that re-opening an activity re-uses the decode instead of paying for it
 * again. The two also fail for different reasons and deserve to be told apart:
 * a purged track is a 404, a corrupt polyline is a `SyntaxError`.
 */
export function useTrack(id: ActivityId, enabled = true): UseQueryResult<Track> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.track(id),
    queryFn: () => runtime.activities.track(id),
    enabled,
    // A finished track never changes. Re-decoding it on a focus change would
    // be pure waste — this is the one thing in the app that is truly immutable.
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useDecodedTrack(
  id: ActivityId,
  polyline: string | undefined,
): UseQueryResult<readonly GeoPoint[]> {
  const runtime = useRuntime();

  return useQuery({
    queryKey: [...queryKeys.track(id), 'decoded'],
    queryFn: ({ signal }) => {
      // A screen that leaves mid-decode stops the work: §8's decode is sliced
      // across event-loop turns, so there is real work left to cancel.
      const decoding = runtime.trackDecoder.decode(polyline ?? '');
      signal.addEventListener('abort', () => {
        decoding.cancel();
      });
      return decoding.points;
    },
    enabled: polyline !== undefined && polyline !== '',
    staleTime: Number.POSITIVE_INFINITY,
    // Decoding is deterministic: a polyline that failed to parse will fail again.
    retry: false,
  });
}
