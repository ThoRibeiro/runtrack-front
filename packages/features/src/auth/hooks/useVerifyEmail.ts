import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useRuntime } from '../../runtime/RuntimeProvider';

/**
 * Confirming an address is a **read** — `GET /auth/v1/verify-email` — so it is
 * a query and not a mutation. The screen opens from a link and has nothing to
 * submit: a `useEffect` firing a request here is precisely what §1 forbids.
 *
 * Not retried: a token that has already been used answers `TOKEN_ALREADY_USED`,
 * and asking again turns one clear message into three.
 */
export function useVerifyEmail(token: string | undefined): UseQueryResult<true> {
  const runtime = useRuntime();

  return useQuery({
    queryKey: ['auth', 'verify-email', token],
    // Returns `true` rather than nothing: TanStack Query treats an `undefined`
    // result as a failed query, and the screen would sit on its spinner for
    // ever — the infinite spinner §9 calls a lie.
    queryFn: async (): Promise<true> => {
      if (token === undefined) throw new Error('jeton absent');
      await runtime.auth.verifyEmail(token);
      return true;
    },
    enabled: token !== undefined,
    retry: false,
    // A confirmation is worth exactly one attempt, and its result never changes.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}
