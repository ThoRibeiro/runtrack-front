import { useCallback, type ReactNode } from 'react';
import { View } from 'react-native';
import type { Activity, ActivityId, PublicProfile, UserId } from '@runtrack/core';
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  List,
  Pressable,
  Skeleton,
  StatTile,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import { formatDuration, formatKilometres, spokenDuration } from '../../format';
import { describeError, translate } from '../../i18n';
import { useFollow, useFollowers, useFollowing, useUnfollow } from '../../social/hooks/useSocial';
import { useActivitiesOf } from '../hooks/useActivitiesOf';
import { useProfile } from '../hooks/useProfile';

/**
 * A runner's profile — someone else's, or one's own.
 *
 * The counts come from two separate queries because the server sends them that
 * way: `PublicProfile` carries no follower count. Two requests for a header is
 * not ideal, and it is noted in `docs/decisions-lot-6.md` alongside the larger
 * gap it belongs to.
 */
export interface ProfileScreenProps {
  handle: string;
  /** Own profile: no follow button, a sign-out one instead. */
  isMe: boolean;
  onOpenActivity: (id: ActivityId) => void;
  onOpenFollowers: (id: UserId) => void;
  onOpenFollowing: (id: UserId) => void;
  onSignOut?: (() => void) | undefined;
}

export function ProfileScreen({
  handle,
  isMe,
  onOpenActivity,
  onOpenFollowers,
  onOpenFollowing,
  onSignOut,
}: ProfileScreenProps): ReactNode {
  const theme = useTheme();
  const profile = useProfile(handle);

  if (profile.isPending) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md, gap: space.sm }}
        testID="profile-loading"
      >
        <Skeleton width={72} height={72} rounded="full" />
        <Skeleton width="50%" height={theme.typography.title.lineHeight} />
        <Skeleton width="30%" height={theme.typography.body.lineHeight} />
      </View>
    );
  }

  if (profile.isError) {
    const described = describeError(profile.error);
    return (
      <ErrorState
        title={translate('profile.notFound')}
        message={described.detail}
        correlationId={described.correlationId}
        onRetry={() => {
          void profile.refetch();
        }}
        testID="profile-error"
      />
    );
  }

  return (
    <ProfileBody
      profile={profile.data}
      isMe={isMe}
      onOpenActivity={onOpenActivity}
      onOpenFollowers={onOpenFollowers}
      onOpenFollowing={onOpenFollowing}
      onSignOut={onSignOut}
    />
  );
}

function ProfileBody({
  profile,
  isMe,
  onOpenActivity,
  onOpenFollowers,
  onOpenFollowing,
  onSignOut,
}: Omit<ProfileScreenProps, 'handle'> & { profile: PublicProfile }): ReactNode {
  const theme = useTheme();
  const followers = useFollowers(profile.id);
  const following = useFollowing(profile.id);
  const activities = useActivitiesOf(profile.id);
  const follow = useFollow();
  const unfollow = useUnfollow();

  const items = activities.data?.pages.flatMap((page) => page.items) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Activity }) => (
      <Pressable
        onPress={() => {
          onOpenActivity(item.id);
        }}
        // §5: one announcement per card, not four fragments.
        accessibilityLabel={`${item.title}, ${formatKilometres(item.stats.distanceMetres)} ${translate('common.spokenKilometres')}, ${spokenDuration(item.stats.movingTimeSeconds)}`}
        enforceTouchTarget={false}
        testID={`profile-activity-${item.id}`}
      >
        <Card>
          <View style={{ gap: space.sm }}>
            <Text variant="bodyStrong" decorative numberOfLines={1}>
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', gap: space.xl }}>
              <StatTile
                label={translate('activity.distance')}
                value={formatKilometres(item.stats.distanceMetres)}
                unit={translate('common.km')}
              />
              <StatTile
                label={translate('activity.movingTime')}
                value={formatDuration(item.stats.movingTimeSeconds)}
              />
            </View>
          </View>
        </Card>
      </Pressable>
    ),
    [onOpenActivity],
  );

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <View style={{ alignItems: 'center', gap: space.xs }}>
        <Avatar name={profile.displayName} uri={profile.avatarUrl} size="xl" />
        <Text variant="title">{profile.displayName}</Text>
        <Text tone="muted">{`@${profile.handle}`}</Text>
        {profile.bio !== undefined && <Text align="center">{profile.bio}</Text>}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Button
          label={translate('social.followerCount', { count: followers.data?.count ?? 0 })}
          variant="ghost"
          onPress={() => {
            onOpenFollowers(profile.id);
          }}
          testID="profile-followers"
        />
        <Button
          label={translate('social.followingCount', { count: following.data?.count ?? 0 })}
          variant="ghost"
          onPress={() => {
            onOpenFollowing(profile.id);
          }}
          testID="profile-following"
        />
      </View>

      {isMe ? (
        <Button
          label={translate('profile.signOut')}
          variant="outline"
          onPress={onSignOut}
          fullWidth
          testID="profile-sign-out"
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            label={
              follow.data === 'PENDING'
                ? translate('profile.followPending')
                : translate('profile.follow')
            }
            onPress={() => {
              follow.mutate(profile.id);
            }}
            loading={follow.isPending}
            disabled={follow.data === 'ACCEPTED' || follow.data === 'PENDING'}
            style={{ flex: 1 }}
            testID="profile-follow"
          />
          <Button
            label={translate('profile.unfollow')}
            variant="outline"
            onPress={() => {
              unfollow.mutate(profile.id);
            }}
            loading={unfollow.isPending}
            style={{ flex: 1 }}
            testID="profile-unfollow"
          />
        </View>
      )}
    </View>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md }}
      testID="profile-screen"
    >
      <List
        data={activities.isPending ? undefined : items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        header={header}
        emptyTitle={translate('home.noActivities')}
        emptyDescription={
          profile.accountScope === 'PRIVATE'
            ? translate('profile.privateDetail')
            : translate('home.noActivitiesDetail')
        }
        loading={activities.isPending}
        loadingLabel={translate('common.loading')}
        onEndReached={() => {
          if (activities.hasNextPage && !activities.isFetchingNextPage) {
            void activities.fetchNextPage();
          }
        }}
        testID="profile-activities"
      />
    </View>
  );
}
