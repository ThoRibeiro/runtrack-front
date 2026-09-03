import { useCallback, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityId, FeedItem } from '@runtrack/core';
import {
  Avatar,
  Badge,
  List,
  Pressable,
  Skeleton,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import { describeError, translate } from '../../i18n';
import { useUnreadCount } from '../../notification';
import { itemsOf, useFeed } from '../../feed/hooks/useFeed';
import { FeedCard } from '../../feed/components/FeedCard';
import { useMe } from '../hooks/useProfile';

/**
 * L'accueil, et c'est **le fil** : ce que les autres ont couru.
 *
 * Il n'y a pas deux endroits où lire les courses des gens qu'on suit : il y en
 * avait deux — un accueil qui en montrait trois, un onglet « Fil » qui les
 * montrait toutes — et la barre d'onglets portait le doublon. Ici, la semaine
 * du coureur tient en tête de liste, et le fil déroule dessous.
 *
 * Les chiffres de la semaine et l'objectif sont passés sur le profil : ils
 * parlent du coureur, pas de son fil, et les avoir en tête de liste repoussait
 * les courses des autres sous la ligne de flottaison. Il ne reste ici que de
 * quoi savoir chez qui on est, puis les courses.
 */
export interface HomeScreenProps {
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenActivity: (id: ActivityId) => void;
}

export function HomeScreen({
  onOpenNotifications,
  onOpenProfile,
  onOpenActivity,
}: HomeScreenProps): ReactNode {
  const theme = useTheme();
  const me = useMe();
  const unread = useUnreadCount();
  const feed = useFeed();

  const items = itemsOf(feed.data);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <FeedCard
        item={item}
        onPress={() => {
          onOpenActivity(item.activityId);
        }}
      />
    ),
    [onOpenActivity],
  );

  const described = feed.error === null ? undefined : describeError(feed.error);
  // §9 : une requête en pause n'est pas une requête lente. Le dire, c'est la
  // différence entre un écran honnête et un rond qui tourne pour rien.
  const paused = feed.fetchStatus === 'paused';

  // De l'air, beaucoup : c'est l'espace qui sépare les sections, pas des boîtes.
  // Une page où chaque bloc a un contour se lit comme un formulaire.
  const header = (
    <View style={{ paddingTop: space.lg, paddingBottom: space.md, gap: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
        <View style={{ flex: 1, gap: space.xxs }}>
          <Text tone="muted" decorative>
            {translate('home.ready')}
          </Text>
          {me.isPending ? (
            <Skeleton width="70%" height={theme.typography.title.lineHeight} />
          ) : (
            <Text variant="title" numberOfLines={1}>
              {translate('home.greeting', { name: me.data?.displayName ?? '' })}
            </Text>
          )}
        </View>
        {/*
          La cloche porte la pastille de non-lues. C'est là que la maquette de
          référence la met, et c'est ce qui garde la barre d'onglets à quatre
          entrées : une barre à six est une barre qu'on ne lit plus.
        */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Pressable
            onPress={onOpenNotifications}
            accessibilityLabel={translate('home.notifications')}
            testID="home-notifications"
          >
            <Badge count={unread.data ?? 0} label={translate('home.notifications')} />
          </Pressable>
          <Pressable
            onPress={onOpenProfile}
            accessibilityLabel={me.data?.displayName ?? translate('common.loading')}
            enforceTouchTarget={false}
          >
            <Avatar name={me.data?.displayName ?? '?'} uri={me.data?.avatarUrl} size="md" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colours.canvas, paddingHorizontal: space.md }}
      testID="home-screen"
    >
      <List
        data={feed.isPending ? undefined : items}
        renderItem={renderItem}
        keyExtractor={(item) => item.activityId}
        header={header}
        emptyTitle={translate('feed.empty')}
        emptyDescription={translate('feed.emptyDetail')}
        loading={feed.isPending || feed.isFetchingNextPage}
        loadingLabel={translate('common.loading')}
        error={
          described === undefined
            ? undefined
            : { title: described.title, message: described.detail }
        }
        offline={
          paused
            ? {
                title: translate('offline.title'),
                description: translate('offline.feed'),
                retryLabel: translate('common.retry'),
              }
            : undefined
        }
        onRetry={() => {
          void feed.refetch();
        }}
        onRefresh={() => {
          void feed.refetch();
        }}
        refreshing={feed.isRefetching}
        onEndReached={() => {
          // Demander une page qui n'existe pas, c'est une liste qui défile sans
          // fin : `hasNextPage` est la réponse du serveur, pas une supposition.
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        testID="home-feed"
      />
    </View>
  );
}
