import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { destinationOf, type DeepLink, type Notification } from '@runtrack/core';
import {
  Avatar,
  Button,
  List,
  Pressable,
  SectionHeader,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import { describeError, translate } from '../../i18n';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { notificationsOf, useInbox, useMarkAllRead, useMarkRead } from '../hooks/useNotifications';

/**
 * The inbox (§10, §12).
 *
 * Two things it gets right that are easy to get wrong:
 *
 *  - **a row is one announcement.** "Marie et 4 autres ont aimé votre course,
 *    il y a 2 heures, non lue" — not an avatar, a sentence, a date and a dot
 *    read as four unrelated fragments (§5);
 *  - **unread is not only a colour.** §15 forbids information carried by
 *    colour alone, so the state is in the accessible name as well as in the
 *    dot beside the row.
 */
export interface InboxScreenProps {
  onOpen: (link: DeepLink) => void;
  onOpenPreferences: () => void;
}

/** A relative moment, in the words a French speaker uses out loud. */
function ago(createdAt: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - createdAt) / 60_000));
  if (minutes < 1) return translate('inbox.justNow');
  if (minutes < 60) return translate('inbox.minutesAgo', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return translate('inbox.hoursAgo', { count: hours });
  return translate('inbox.daysAgo', { count: Math.round(hours / 24) });
}

function wording(notification: Notification): string {
  const count = notification.aggregateCount;
  switch (notification.type) {
    case 'FRIEND_STARTED_ACTIVITY':
      return translate('inbox.friendStarted');
    case 'FRIEND_FINISHED_ACTIVITY':
      return translate('inbox.friendFinished');
    case 'NEW_FOLLOWER':
      return translate('inbox.newFollower');
    case 'FOLLOW_REQUEST':
      return translate('inbox.followRequest');
    case 'FOLLOW_ACCEPTED':
      return translate('inbox.followAccepted');
    case 'ACTIVITY_LIKED':
      return count > 1 ? translate('inbox.likedMany', { count }) : translate('inbox.likedOne');
    case 'ACTIVITY_COMMENTED':
      return count > 1
        ? translate('inbox.commentedMany', { count })
        : translate('inbox.commentedOne');
  }
}

export function InboxScreen({ onOpen, onOpenPreferences }: InboxScreenProps): ReactNode {
  const theme = useTheme();
  const runtime = useRuntime();
  const inbox = useInbox();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const notifications = notificationsOf(inbox.data);
  // Figée à l'ouverture : « il y a 3 min » n'a pas besoin de vieillir pendant
  // qu'on fait défiler une liste, et lire l'horloge au rendu est impur.
  const [now] = useState(() => runtime.clock.now());

  const described = inbox.isError ? describeError(inbox.error) : undefined;
  const paused = inbox.fetchStatus === 'paused';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="inbox-screen">
      <List
        data={notifications}
        keyExtractor={(notification) => notification.id}
        emptyTitle={translate('inbox.empty')}
        emptyDescription={translate('inbox.emptyDetail')}
        loading={inbox.isPending}
        loadingLabel={translate('common.loading')}
        error={
          described === undefined
            ? undefined
            : { title: translate('inbox.error'), message: described.detail }
        }
        offline={
          paused
            ? {
                title: translate('offline.title'),
                description: translate('offline.generic'),
                retryLabel: translate('common.retry'),
              }
            : undefined
        }
        onRetry={() => {
          void inbox.refetch();
        }}
        onEndReached={() => {
          if (inbox.hasNextPage && !inbox.isFetchingNextPage) void inbox.fetchNextPage();
        }}
        header={
          <SectionHeader
            title={translate('inbox.title')}
            actionLabel={translate('inbox.markAllRead')}
            onAction={() => {
              markAllRead.mutate();
            }}
          />
        }
        renderItem={({ item }) => {
          const text = wording(item);
          const when = ago(item.createdAt, now);
          const state = item.unread ? translate('inbox.unread') : translate('inbox.read');

          return (
            <Pressable
              // §5: the whole row, in one sentence, state included.
              accessibilityLabel={`${text}, ${when}, ${state}`}
              onPress={() => {
                if (item.unread) markRead.mutate(item.id);
                const link = destinationOf(item);
                // A destination this build cannot read opens nothing rather
                // than the wrong screen.
                if (link !== undefined) onOpen(link);
              }}
              testID={`inbox-item-${item.id}`}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  paddingHorizontal: space.md,
                  paddingVertical: space.sm,
                }}
              >
                {/* La ligne entière est déjà annoncée : l'avatar est décor. */}
                <Avatar name={text} size="md" decorative />
                <View style={{ flex: 1 }}>
                  <Text decorative>{text}</Text>
                  <Text variant="caption" tone="muted" decorative>
                    {when}
                  </Text>
                </View>
                {item.unread && (
                  <View
                    style={{
                      width: space.sm,
                      height: space.sm,
                      borderRadius: theme.radius.full,
                      backgroundColor: theme.colours.brand.fill,
                    }}
                  />
                )}
              </View>
            </Pressable>
          );
        }}
        testID="inbox-list"
      />

      <View style={{ padding: space.md }}>
        <Button
          variant="ghost"
          label={translate('inbox.preferences')}
          icon="sliders"
          onPress={onOpenPreferences}
          testID="inbox-preferences"
        />
      </View>
    </View>
  );
}
