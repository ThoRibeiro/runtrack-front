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
import { deviceToken } from '@runtrack/core';
import type { Notification, NotificationId, NotificationPreferences, Page } from '@runtrack/core';
import type { Device } from '@runtrack/api';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

const PAGE_SIZE = 20;

export function useInbox(): UseInfiniteQueryResult<InfiniteData<Page<Notification>>> {
  const runtime = useRuntime();
  return useInfiniteQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ pageParam }) =>
      runtime.notifications.inbox({ cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function notificationsOf(
  data: InfiniteData<Page<Notification>> | undefined,
): readonly Notification[] {
  return data?.pages.flatMap((page) => page.items) ?? [];
}

/**
 * The badge.
 *
 * Kept short-lived on purpose: it is the one number that being wrong is
 * *visible* about. The stream refreshes it when something lands, and this is
 * the floor under a stream that dropped without anyone noticing.
 */
export function useUnreadCount(enabled = true): UseQueryResult<number> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => runtime.notifications.unreadCount(),
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Marking one read.
 *
 * The badge and the inbox are invalidated together: a screen that decrements
 * the badge itself and lets the list refetch shows two different truths for as
 * long as the request takes.
 */
export function useMarkRead(): UseMutationResult<void, unknown, NotificationId> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: NotificationId) => runtime.notifications.markRead(id),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.notifications }),
        client.invalidateQueries({ queryKey: queryKeys.unreadCount }),
      ]);
    },
  });
}

export function useMarkAllRead(): UseMutationResult<number, unknown, void> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => runtime.notifications.markAllRead(),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.notifications }),
        client.invalidateQueries({ queryKey: queryKeys.unreadCount }),
      ]);
    },
  });
}

export function useNotificationPreferences(): UseQueryResult<NotificationPreferences> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => runtime.notifications.preferences(),
  });
}

export function useUpdateNotificationPreferences(): UseMutationResult<
  NotificationPreferences,
  unknown,
  NotificationPreferences
> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      runtime.notifications.updatePreferences(preferences),
    // The server answers with the state it stored: writing that into the cache
    // rather than refetching is what makes a toggle feel immediate without
    // showing a value the server never agreed to.
    onSuccess: (stored) => {
      client.setQueryData(queryKeys.notificationPreferences, stored);
    },
  });
}

export function useDevices(): UseQueryResult<readonly Device[]> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.devices,
    queryFn: () => runtime.devices.list(),
  });
}

export function useRemoveDevice(): UseMutationResult<void, unknown, string> {
  const runtime = useRuntime();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => runtime.devices.remove(deviceToken(token)),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.devices });
    },
  });
}
