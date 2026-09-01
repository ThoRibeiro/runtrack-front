import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  ActivityId,
  Comment,
  CommentId,
  Likes,
  Page,
  ShareLink,
  ShareLinkId,
} from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

const PAGE_SIZE = 20;

export function useLikes(activityId: ActivityId): UseQueryResult<Likes> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.likes(activityId),
    queryFn: () => runtime.engagement.likes(activityId),
  });
}

/**
 * Liking, and why there is no optimistic update here.
 *
 * The server answers every like with the **new state** — the count and whether
 * the viewer likes it — so the heart settles on the truth one round trip later
 * rather than on a number the client guessed. On a like that fails, an
 * optimistic count would have to be rolled back, and a heart that fills then
 * empties is worse than one that fills a moment late.
 */
export function useToggleLike(activityId: ActivityId): UseMutationResult<Likes, unknown, boolean> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) =>
      liked ? runtime.engagement.unlike(activityId) : runtime.engagement.like(activityId),
    onSuccess: (likes) => {
      client.setQueryData(queryKeys.likes(activityId), likes);
    },
  });
}

export function useComments(
  activityId: ActivityId,
  enabled = true,
): UseInfiniteQueryResult<InfiniteData<Page<Comment>>> {
  const runtime = useRuntime();
  return useInfiniteQuery({
    queryKey: queryKeys.comments(activityId),
    queryFn: ({ pageParam }) =>
      runtime.engagement.comments(activityId, { cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  });
}

export function commentsOf(data: InfiniteData<Page<Comment>> | undefined): readonly Comment[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

export function usePostComment(
  activityId: ActivityId,
): UseMutationResult<Comment, unknown, { body: string; parentId?: CommentId }> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId?: CommentId }) =>
      runtime.engagement.postComment(activityId, body, parentId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.comments(activityId) });
    },
  });
}

export function useDeleteComment(
  activityId: ActivityId,
): UseMutationResult<void, unknown, CommentId> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: CommentId) => runtime.engagement.deleteComment(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.comments(activityId) });
    },
  });
}

export function useShareLinks(
  activityId: ActivityId,
  enabled = true,
): UseQueryResult<readonly ShareLink[]> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.shareLinks(activityId),
    queryFn: () => runtime.sharing.linksOf(activityId),
    enabled,
  });
}

/**
 * Creating a link.
 *
 * The clear token comes back **once**, and nowhere else afterwards. So the
 * created link is written into the cache as-is rather than refetched: a
 * refetch would replace it with the listed version, which has no token, and
 * the link would vanish from under the person about to copy it.
 */
export function useCreateShareLink(
  activityId: ActivityId,
): UseMutationResult<ShareLink, unknown, number | undefined> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (validForHours: number | undefined) =>
      runtime.sharing.create(activityId, validForHours),
    onSuccess: (created) => {
      client.setQueryData<readonly ShareLink[]>(queryKeys.shareLinks(activityId), (existing) => [
        created,
        ...(existing ?? []),
      ]);
    },
  });
}

export function useRevokeShareLink(
  activityId: ActivityId,
): UseMutationResult<void, unknown, ShareLinkId> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: ShareLinkId) => runtime.sharing.revoke(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.shareLinks(activityId) });
    },
  });
}
