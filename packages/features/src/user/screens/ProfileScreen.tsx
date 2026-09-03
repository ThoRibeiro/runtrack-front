import { useCallback, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import { goalProgress, paceOver } from '@runtrack/core';
import type { Activity, ActivityId, PublicProfile, UserId } from '@runtrack/core';
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  MetricCard,
  ProgressRing,
  List,
  Pressable,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  StatTile,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import {
  formatDay,
  formatDuration,
  formatKilometres,
  formatPace,
  formatWhole,
  spokenDuration,
  spokenPace,
} from '../../format';
import { describeError, translate } from '../../i18n';
import { useFollow, useFollowers, useFollowing, useUnfollow } from '../../social/hooks/useSocial';
import { TrackPreview } from '../../map';
import { useActivitiesOf } from '../hooks/useActivitiesOf';
import { currentTimeZone, useMyStats, useProfile } from '../hooks/useProfile';

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
  /** Own profile only: where the name, the bio and the physiology are changed. */
  onEditProfile?: (() => void) | undefined;
  /** Someone else's profile is reached from somewhere, and one comes back. */
  onBack?: (() => void) | undefined;
}

export function ProfileScreen({
  handle,
  isMe,
  onOpenActivity,
  onOpenFollowers,
  onOpenFollowing,
  onSignOut,
  onEditProfile,
  onBack,
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
        title={described.title}
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
      onEditProfile={onEditProfile}
      onBack={onBack}
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
  onEditProfile,
  onBack,
}: Omit<ProfileScreenProps, 'handle'> & { profile: PublicProfile }): ReactNode {
  const theme = useTheme();
  const followers = useFollowers(profile.id);
  const following = useFollowing(profile.id);
  const activities = useActivitiesOf(profile.id);
  const follow = useFollow();
  const unfollow = useUnfollow();
  // Les chiffres de la semaine sont ceux du coureur connecté : le serveur ne
  // les publie que pour soi, et un profil visité n'en montre donc pas.
  const zone = useMemo(() => currentTimeZone(), []);
  const stats = useMyStats('WEEK', zone);
  const totals = isMe ? stats.data : undefined;

  const items = activities.data?.pages.flatMap((page) => page.items) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: Activity }) => (
      <Pressable
        onPress={() => {
          onOpenActivity(item.id);
        }}
        // §5: one announcement per card, not four fragments.
        accessibilityLabel={`${item.title}, ${formatDay(item.startedAt)}, ${formatKilometres(item.stats.distanceMetres)} ${translate('common.spokenKilometres')}, ${spokenDuration(item.stats.movingTimeSeconds)}`}
        enforceTouchTarget={false}
        testID={`profile-activity-${item.id}`}
      >
        <Card>
          <View style={{ gap: space.sm }}>
            {/* Le jour à droite du titre : c'est ce qui distingue deux
                « Sortie du jour » l'une de l'autre. */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
              <Text variant="bodyStrong" decorative numberOfLines={1} style={{ flex: 1 }}>
                {item.title}
              </Text>
              <Text variant="caption" tone="muted" decorative>
                {formatDay(item.startedAt)}
              </Text>
            </View>
            {/* Le parcours : on reconnaît une sortie à sa forme avant de lire son titre. */}
            <TrackPreview
              polyline={item.previewPolyline}
              height={120}
              testID={`profile-track-${item.id}`}
            />
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

      {totals !== undefined && (
        <View style={{ gap: space.sm }}>
          {/*
            L'objectif d'abord : c'est la seule ligne qui dit ce qu'il reste à
            faire, là où les quatre autres disent ce qui est fait.
          */}
          <Card
            tone="accent"
            // §5 : la carte se lit d'un bloc — ses textes sont décoratifs, donc
            // sans ce libellé elle ne serait plus annoncée du tout.
            accessibilityLabel={[
              translate('home.weeklyGoal'),
              translate('home.weeklyGoalProgress', {
                done: formatKilometres(totals.distanceMetres),
                goal: formatKilometres(WEEKLY_GOAL_METRES),
              }),
              WEEKLY_GOAL_METRES - totals.distanceMetres <= 0
                ? translate('home.weeklyGoalReached')
                : translate('home.weeklyGoalRemaining', {
                    remaining: formatKilometres(WEEKLY_GOAL_METRES - totals.distanceMetres),
                  }),
            ].join(', ')}
            testID="profile-goal"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <ProgressRing
                progress={goalProgress(totals, WEEKLY_GOAL_METRES)}
                label={translate('home.weeklyGoal')}
                onAccent
              />
              <View style={{ flex: 1, gap: space.xxs }}>
                <Text variant="section" tone="onBrand" decorative>
                  {translate('home.weeklyGoal')}
                </Text>
                <Text tone="onBrand" decorative>
                  {translate('home.weeklyGoalProgress', {
                    done: formatKilometres(totals.distanceMetres),
                    goal: formatKilometres(WEEKLY_GOAL_METRES),
                  })}
                </Text>
                <Text variant="caption" tone="onBrand" decorative>
                  {WEEKLY_GOAL_METRES - totals.distanceMetres <= 0
                    ? translate('home.weeklyGoalReached')
                    : translate('home.weeklyGoalRemaining', {
                        remaining: formatKilometres(WEEKLY_GOAL_METRES - totals.distanceMetres),
                      })}
                </Text>
              </View>
            </View>
          </Card>

          <SectionHeader title={translate('home.statistics')} />
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              rowGap: space['2xl'],
              columnGap: space.md,
            }}
          >
            <View style={{ flexGrow: 1, flexBasis: '46%' }}>
              <MetricCard
                title={translate('home.distance')}
                icon="activity"
                accent="pace"
                value={formatKilometres(totals.distanceMetres)}
                unit={translate('common.km')}
                spokenUnit={translate('common.spokenKilometres')}
                testID="profile-metric-distance"
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: '46%' }}>
              <MetricCard
                title={translate('home.averagePace')}
                icon="trending-up"
                accent="pace"
                value={formatPace(averagePaceOf(totals.distanceMetres, totals.movingTimeSeconds))}
                unit={translate('common.perKm')}
                spokenValue={spokenPace(
                  averagePaceOf(totals.distanceMetres, totals.movingTimeSeconds),
                )}
                testID="profile-metric-pace"
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: '46%' }}>
              <MetricCard
                title={translate('home.elevation')}
                icon="mountain"
                accent="climb"
                value={formatWhole(totals.elevationGain)}
                unit={translate('common.metres')}
                spokenUnit={translate('common.spokenMetres')}
                testID="profile-metric-elevation"
              />
            </View>
            <View style={{ flexGrow: 1, flexBasis: '46%' }}>
              <MetricCard
                title={translate('home.outings')}
                icon="calendar"
                accent="count"
                value={formatWhole(totals.activityCount)}
                unit={translate(
                  totals.activityCount === 1 ? 'home.outingUnit' : 'home.outingsUnit',
                )}
                testID="profile-metric-outings"
              />
            </View>
          </View>
        </View>
      )}

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
        <View style={{ gap: space.sm }}>
          {onEditProfile !== undefined && (
            <Button
              label={translate('profile.edit')}
              icon="user"
              onPress={onEditProfile}
              fullWidth
              testID="profile-edit"
            />
          )}
          <Button
            label={translate('profile.signOut')}
            variant="outline"
            onPress={onSignOut}
            fullWidth
            testID="profile-sign-out"
          />
        </View>
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
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="profile-screen">
      <ScreenHeader
        title={`@${profile.handle}`}
        onBack={onBack}
        backLabel={translate('common.back')}
        testID="profile-header"
      />
      <View style={{ flex: 1, padding: space.md }}>
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
        onRefresh={() => {
          // Le geste recharge ce que la page montre : les courses et les
          // chiffres de la semaine, pas seulement la liste.
          void activities.refetch();
          void stats.refetch();
        }}
        refreshing={activities.isRefetching}
        onEndReached={() => {
          if (activities.hasNextPage && !activities.isFetchingNextPage) {
            void activities.fetchNextPage();
          }
        }}
        testID="profile-activities"
      />
      </View>
    </View>
  );
}

/** §9 : côté client, et pas encore réglable — l'écran de réglages viendra. */
const WEEKLY_GOAL_METRES = 40_000;

/**
 * Les totaux de la semaine portent une distance et un temps, pas une allure —
 * le serveur la calcule par course, pas par période. `paceOver` appartient à
 * l'hexagone, pour que deux écrans ne puissent pas être en désaccord sur ce
 * qu'est une allure moyenne.
 */
function averagePaceOf(distanceMetres: number, movingTimeSeconds: number): number | undefined {
  return paceOver(distanceMetres, movingTimeSeconds);
}
