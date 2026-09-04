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
/**
 * Le cœur, et sa règle : il change **à l'appui**, pas au retour du serveur.
 *
 * Un aller-retour réseau entre le geste et le dessin, c'est un bouton qui
 * semble cassé. On écrit donc le résultat espéré tout de suite, on le remplace
 * par la réponse du serveur quand elle arrive, et on le remet comme avant s'il
 * refuse — la seule façon d'être à la fois vif et honnête.
 */
export function useToggleLike(
  activityId: ActivityId,
): UseMutationResult<Likes, unknown, boolean, { previous: Likes | undefined }> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (liked: boolean) =>
      liked ? runtime.engagement.unlike(activityId) : runtime.engagement.like(activityId),

    onMutate: async (liked: boolean) => {
      // Une requête en vol écraserait la valeur qu'on vient de poser.
      await client.cancelQueries({ queryKey: queryKeys.likes(activityId) });
      const previous = client.getQueryData<Likes>(queryKeys.likes(activityId));

      if (previous !== undefined) {
        client.setQueryData<Likes>(queryKeys.likes(activityId), {
          ...previous,
          total: Math.max(0, previous.total + (liked ? -1 : 1)),
          likedByViewer: !liked,
        });
      }
      return { previous };
    },

    onError: (_error, _liked, context) => {
      // Le serveur a refusé : le cœur revient où il était, sans rien inventer.
      if (context?.previous !== undefined) {
        client.setQueryData(queryKeys.likes(activityId), context.previous);
      }
    },

    onSuccess: (likes) => {
      client.setQueryData(queryKeys.likes(activityId), likes);
      // Le compteur du fil vient d'une autre requête : sans cela, la carte
      // affiche encore l'ancien nombre au retour sur la liste.
      void client.invalidateQueries({ queryKey: queryKeys.feed });
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
