import { useMemo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import type { ActivityId } from '@runtrack/core';
import { goalProgress, paceOver } from '@runtrack/core';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  MetricCard,
  Pressable,
  ProgressRing,
  SectionHeader,
  Skeleton,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import { formatKilometres, formatPace, formatWhole, spokenPace } from '../../format';
import { translate } from '../../i18n';
import { useUnreadCount } from '../../notification';
import { itemsOf, useFeed } from '../../feed/hooks/useFeed';
import { FeedCard } from '../../feed/components/FeedCard';
import { currentTimeZone, useMe, useMyStats } from '../hooks/useProfile';

/**
 * The reference's home screen, transposed (§10): avatar and greeting, the bell,
 * the tinted card with its progress ring, the two-per-row metric grid, then
 * "Dernières courses".
 *
 * What the reference has and this does not: blood pressure, calories, the
 * training-video carousel. The back-end has none of that, and §3 is explicit —
 * one does not invent a screen to fill a mock-up.
 */
const RECENT_COUNT = 3;

export interface HomeScreenProps {
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenFeed: () => void;
  onOpenActivity: (id: ActivityId) => void;
  /** §9: client state. Not persisted yet — the settings screen comes later. */
  weeklyGoalMetres?: number;
}

const DEFAULT_WEEKLY_GOAL = 40_000;

export function HomeScreen({
  onOpenNotifications,
  onOpenProfile,
  onOpenFeed,
  onOpenActivity,
  weeklyGoalMetres = DEFAULT_WEEKLY_GOAL,
}: HomeScreenProps): ReactNode {
  const theme = useTheme();
  const zone = useMemo(() => currentTimeZone(), []);
  const me = useMe();
  const unread = useUnreadCount();
  const stats = useMyStats('WEEK', zone);
  const feed = useFeed();

  const recent = itemsOf(feed.data).slice(0, RECENT_COUNT);
  const totals = stats.data;
  const progress = totals === undefined ? 0 : goalProgress(totals, weeklyGoalMetres);
  const remaining = Math.max(0, weeklyGoalMetres - (totals?.distanceMetres ?? 0));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colours.canvas }}
      // De l'air, beaucoup : c'est l'espace qui sépare les sections, pas des
      // boîtes. Une page où chaque bloc a un contour se lit comme un formulaire.
      contentContainerStyle={{
        paddingHorizontal: space.md,
        paddingTop: space.lg,
        paddingBottom: space['2xl'],
        gap: space.lg,
      }}
      testID="home-screen"
    >
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

      {/*
        La carte d'accroche des maquettes : un aplat de l'accent, l'anneau de
        progression dedans, et le texte en blanc dessus. C'est le seul bloc de
        couleur pleine de l'écran — ce qui est précisément ce qui le fait lire
        en premier.
      */}
      <Card
        tone="accent"
        // §5 : la carte se lit d'un bloc — « Objectif de la semaine, 0 sur
        // 40 km, plus que 40 km ». Ses textes sont décoratifs, donc sans ce
        // label elle ne serait plus annoncée du tout.
        accessibilityLabel={[
          translate('home.weeklyGoal'),
          translate('home.weeklyGoalProgress', {
            done: formatKilometres(totals?.distanceMetres ?? 0),
            goal: formatKilometres(weeklyGoalMetres),
          }),
          remaining === 0
            ? translate('home.weeklyGoalReached')
            : translate('home.weeklyGoalRemaining', { remaining: formatKilometres(remaining) }),
        ].join(', ')}
        testID="home-goal"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <ProgressRing progress={progress} label={translate('home.weeklyGoal')} onAccent />
          <View style={{ flex: 1, gap: space.xxs }}>
            <Text variant="section" tone="onBrand" decorative>
              {translate('home.weeklyGoal')}
            </Text>
            <Text tone="onBrand" decorative>
              {translate('home.weeklyGoalProgress', {
                done: formatKilometres(totals?.distanceMetres ?? 0),
                goal: formatKilometres(weeklyGoalMetres),
              })}
            </Text>
            <Text variant="caption" tone="onBrand" decorative>
              {remaining === 0
                ? translate('home.weeklyGoalReached')
                : translate('home.weeklyGoalRemaining', {
                    remaining: formatKilometres(remaining),
                  })}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ gap: space.sm }}>
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
              value={formatKilometres(totals?.distanceMetres ?? 0)}
              unit={translate('common.km')}
              spokenUnit={translate('common.spokenKilometres')}
              testID="home-metric-distance"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: '46%' }}>
            <MetricCard
              title={translate('home.averagePace')}
              icon="trending-up"
              accent="pace"
              value={formatPace(averagePaceOf(totals?.distanceMetres, totals?.movingTimeSeconds))}
              unit={translate('common.perKm')}
              spokenValue={spokenPace(
                averagePaceOf(totals?.distanceMetres, totals?.movingTimeSeconds),
              )}
              testID="home-metric-pace"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: '46%' }}>
            <MetricCard
              title={translate('home.elevation')}
              icon="mountain"
              accent="climb"
              value={formatWhole(totals?.elevationGain ?? 0)}
              unit={translate('common.metres')}
              spokenUnit={translate('common.spokenMetres')}
              testID="home-metric-elevation"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: '46%' }}>
            <MetricCard
              title={translate('home.outings')}
              icon="calendar"
              accent="count"
              value={formatWhole(totals?.activityCount ?? 0)}
              unit={translate(
                (totals?.activityCount ?? 0) === 1 ? 'home.outingUnit' : 'home.outingsUnit',
              )}
              testID="home-metric-outings"
            />
          </View>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title={translate('home.recentActivities')} onAction={onOpenFeed} />
        {recent.length === 0 && !feed.isPending ? (
          <EmptyState
            title={translate('home.noActivities')}
            description={translate('home.noActivitiesDetail')}
          />
        ) : (
          recent.map((item) => (
            <FeedCard
              key={item.activityId}
              item={item}
              onPress={() => {
                onOpenActivity(item.activityId);
              }}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

/**
 * The weekly totals carry a distance and a moving time but no average pace —
 * the server computes it per activity, not per period. `paceOver` is the
 * hexagon's, so the home screen and an activity screen cannot disagree about
 * what an average pace is.
 */
function averagePaceOf(
  distanceMetres: number | undefined,
  movingTimeSeconds: number | undefined,
): number | undefined {
  if (distanceMetres === undefined || movingTimeSeconds === undefined) return undefined;
  return paceOver(distanceMetres, movingTimeSeconds);
}
