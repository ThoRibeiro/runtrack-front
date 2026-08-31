import { QueryClient } from '@tanstack/react-query';
import { isRunTrackError } from '@runtrack/core';

/**
 * §1: TanStack Query owns everything that comes from the server — cache,
 * deduplication, invalidation, loading states. §9 adds the other half: no
 * server state in a global store, because duplication is what creates the
 * inconsistencies.
 *
 * The retry policy is the interesting part. Retrying a request the server
 * *answered* is pointless and sometimes harmful: a 404 stays a 404, and
 * retrying a 429 makes the rate limit worse. What is worth retrying is a
 * request that never got an answer.
 */
const MAXIMUM_RETRIES = 2;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAXIMUM_RETRIES) return false;
  // A `RunTrackError` means the server answered. Its answer will not change.
  return !isRunTrackError(error);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Long enough that moving between two screens does not refetch, short
        // enough that a feed does not go stale while it is being read.
        staleTime: 30_000,
        // §9: no infinite spinner. A failed query surfaces its error.
        throwOnError: false,
      },
      mutations: {
        // A mutation is not idempotent unless it says so — replaying a "like"
        // or a comment because the answer was slow is a bug the user sees.
        retry: false,
      },
    },
  });
}
