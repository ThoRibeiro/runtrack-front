import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { UserId } from '@runtrack/core';
import { EmptyState, ScreenHeader, Spinner, Text, space, useTheme } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useFollowers, useFollowing } from '../hooks/useSocial';

/**
 * Followers and following, and the honest limit of what the API allows today.
 *
 * `GET /user/v1/{id}/followers` answers with identifiers and a count, and there
 * is no endpoint that turns an identifier into a profile — `/user/v1/{handle}`
 * resolves by handle only. So the **number is exact** and the list cannot be
 * drawn.
 *
 * Showing the count with an explicit explanation beats two alternatives that
 * were considered and rejected: a list of raw identifiers, which means nothing
 * to a runner, and hiding the screen, which loses the count that is genuinely
 * useful. The server change to ask for is in `docs/decisions-lot-6.md`.
 */
export interface FollowListScreenProps {
  userId: UserId;
  kind: 'followers' | 'following';
  onBack?: (() => void) | undefined;
}

export function FollowListScreen({ userId, kind, onBack }: FollowListScreenProps): ReactNode {
  const theme = useTheme();
  const followers = useFollowers(userId);
  const following = useFollowing(userId);
  const list = kind === 'followers' ? followers : following;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID={`follow-list-${kind}`}>
      <ScreenHeader
        title={translate(kind === 'followers' ? 'profile.followers' : 'profile.following')}
        onBack={onBack}
        backLabel={translate('common.back')}
        testID="follow-list-header"
      />
      <View style={{ flex: 1, padding: space.md, gap: space.md }}>
        {list.isPending ? (
          <Spinner label={translate('common.loading')} />
        ) : (
          <>
            <View accessible accessibilityRole="header">
              <Text variant="title">
                {translate(
                  kind === 'followers' ? 'social.followerCount' : 'social.followingCount',
                  { count: list.data?.count ?? 0 },
                )}
              </Text>
            </View>
            <EmptyState
              icon="users"
              title={translate('social.listUnavailable')}
              description={translate('social.listUnavailableDetail')}
            />
          </>
        )}
      </View>
    </View>
  );
}
