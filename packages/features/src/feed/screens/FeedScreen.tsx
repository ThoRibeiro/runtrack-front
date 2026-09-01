import { useCallback, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityId, FeedItem } from '@runtrack/core';
import { List, space, useTheme } from '@runtrack/ui';
import { describeError, translate } from '../../i18n';
import { itemsOf, useFeed } from '../hooks/useFeed';
import { FeedCard } from '../components/FeedCard';

/**
 * §4 and §14: virtualised, always. A feed is the densest screen in the
 * application, and `List` is FlashList underneath — never `FlatList`.
 *
 * The three states the §15 checklist asks for come from `List` itself: it takes
 * the empty title, the error and the loading flag as props, so this screen
 * cannot ship a spinner and forget the other two.
 */
export interface FeedScreenProps {
  onOpenActivity: (id: ActivityId) => void;
}

export function FeedScreen({ onOpenActivity }: FeedScreenProps): ReactNode {
  const theme = useTheme();
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
  // §9: a paused query is not a slow one. Saying so is the difference between
  // an honest screen and a spinner that never stops.
  const paused = feed.fetchStatus === 'paused';

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md }}
      testID="feed-screen"
    >
      <List
        data={feed.isPending ? undefined : items}
        renderItem={renderItem}
        keyExtractor={(item) => item.activityId}
        emptyTitle={translate('feed.empty')}
        emptyDescription={translate('feed.emptyDetail')}
        loading={feed.isPending || feed.isFetchingNextPage}
        loadingLabel={translate('common.loading')}
        error={
          described === undefined
            ? undefined
            : { title: translate('feed.loadFailed'), message: described.detail }
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
        onEndReached={() => {
          // Asking for a page that does not exist is how a list scrolls for
          // ever: `hasNextPage` is the server's answer, not a guess.
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        testID="feed-list"
      />
    </View>
  );
}
