import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  FollowRequest,
  FollowStatus,
  PublicProfile,
  UserId,
  UserIdList,
} from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

export function useSearchRunners(query: string): UseQueryResult<readonly PublicProfile[]> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => runtime.social.search(query),
    // Two characters match half the users: the request is not worth sending.
    enabled: query.trim().length >= 2,
  });
}

export function useFollowers(id: UserId): UseQueryResult<UserIdList> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.followers(id),
    queryFn: () => runtime.social.followers(id),
  });
}

export function useFollowing(id: UserId): UseQueryResult<UserIdList> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.following(id),
    queryFn: () => runtime.social.following(id),
  });
}

export function useFollowRequests(): UseQueryResult<readonly FollowRequest[]> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.followRequests,
    queryFn: () => runtime.social.pendingRequests(),
  });
}

/**
 * Following changes what the feed contains, so the feed is invalidated too.
 * Forgetting that is how a user follows someone and sees nothing new until they
 * force-quit the application.
 */
export function useFollow(): UseMutationResult<FollowStatus, unknown, UserId> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: UserId) => runtime.social.follow(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

export function useUnfollow(): UseMutationResult<void, unknown, UserId> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: UserId) => runtime.social.unfollow(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

/**
 * A block is not a strong unfollow: the server hides the activities in both
 * directions, so every list the viewer holds is now wrong.
 */
export function useBlock(): UseMutationResult<void, unknown, UserId> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: UserId) => runtime.social.block(id),
    onSuccess: async () => {
      await client.invalidateQueries();
    },
  });
}

/**
 * Le retour en arrière, et il est plus rare qu'il n'y paraît.
 *
 * Rien côté serveur ne dit *qu'un compte est bloqué* : ni le profil public, ni
 * une liste de blocages. L'écran ne peut donc proposer le déblocage qu'à la
 * suite du blocage qu'il vient de faire — sortir de la page perd l'information.
 * C'est un manque de l'API, noté ici parce que c'est ici qu'il se voit.
 */
export function useUnblock(): UseMutationResult<void, unknown, UserId> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: UserId) => runtime.social.unblock(id),
    onSuccess: async () => {
      await client.invalidateQueries();
    },
  });
}

export function useAnswerFollowRequest(): UseMutationResult<
  void,
  unknown,
  { id: UserId; accept: boolean }
> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, accept }: { id: UserId; accept: boolean }) =>
      accept ? runtime.social.acceptRequest(id) : runtime.social.rejectRequest(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.followRequests });
    },
  });
}
