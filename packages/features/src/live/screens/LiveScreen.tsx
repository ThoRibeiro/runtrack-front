import type { ReactNode } from 'react';
import { View } from 'react-native';
import { isTerminal, type ActivityId, type ActivityStats } from '@runtrack/core';
import {
  Button,
  Chip,
  ErrorState,
  FloatingIconButton,
  Skeleton,
  StatTile,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import {
  formatDuration,
  formatKilometres,
  formatPace,
  formatWhole,
  spokenDuration,
  spokenPace,
} from '../../format';
import { describeError, translate } from '../../i18n';
import { ActivityMap } from '../../map';
import { useActivity } from '../../activity/hooks/useActivity';
import { useLiveActivity } from '../hooks/useLiveActivity';

/**
 * Watching someone else run (§7).
 *
 * The screen is a map with a band of numbers over it, and everything difficult
 * about it is in what it does *not* do: it does not render per position, and it
 * does not announce them. Both are named traps in the brief, and both are
 * settled elsewhere — `useLiveActivity` for the rate, and the live region below
 * for the announcements.
 */
export interface LiveScreenProps {
  id: ActivityId;
  onBack: () => void;
  onOpenSummary: (id: ActivityId) => void;
}

/**
 * The sentence the live region says.
 *
 * Pure, and derived from `view.announced` — which only changes on the
 * half-minute (§5). So the sentence is recomputed on every render and *reads*
 * the same, which is what stops a screen reader from speaking twice a second.
 */
function spokenSummary(stats: ActivityStats | undefined): string {
  if (stats === undefined) return translate('live.waiting');

  return translate('live.spokenSummary', {
    distance: `${formatKilometres(stats.distanceMetres)} ${translate('common.spokenKilometres')}`,
    duration: spokenDuration(stats.elapsedSeconds),
    pace:
      stats.averagePaceSecondsPerKm === undefined
        ? translate('live.spokenNoPace')
        : spokenPace(stats.averagePaceSecondsPerKm),
  });
}

export function LiveScreen({ id, onBack, onOpenSummary }: LiveScreenProps): ReactNode {
  const theme = useTheme();
  const activity = useActivity(id);

  // A finished activity has nothing to follow: the server would send its final
  // state and hang up. The stream is not even opened.
  const finished = activity.data !== undefined && isTerminal(activity.data.status);
  const { view, attachMap } = useLiveActivity(id, { enabled: activity.isSuccess && !finished });

  if (activity.isPending) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md, gap: space.sm }}
        testID="live-loading"
      >
        <Skeleton width="100%" height={theme.typography.title.lineHeight} />
        <Skeleton width="60%" height={theme.typography.body.lineHeight} />
      </View>
    );
  }

  if (activity.isError) {
    const described = describeError(activity.error);
    return (
      <ErrorState
        title={translate('activity.notFound')}
        message={described.detail}
        correlationId={described.correlationId}
        onRetry={() => {
          void activity.refetch();
        }}
        testID="live-error"
      />
    );
  }

  const over = finished || view.ended;
  const stats = view.stats;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="live-screen">
      <ActivityMap points={undefined} live onPresenter={attachMap} testID="live-map" />

      <View style={{ position: 'absolute', top: space.lg, left: space.md }}>
        <FloatingIconButton
          icon="arrow-left"
          accessibilityLabel={translate('activity.back')}
          onPress={onBack}
          testID="live-back"
        />
      </View>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: space.md,
          gap: space.sm,
          borderTopLeftRadius: theme.radius.sheet,
          borderTopRightRadius: theme.radius.sheet,
          backgroundColor: theme.colours.surface,
        }}
        testID="live-panel"
      >
        <View accessible accessibilityRole="header" accessibilityLabel={activity.data.title}>
          <Text variant="title" decorative>
            {activity.data.title}
          </Text>
        </View>

        {/*
          §6 of the brief calls for an honest network state, and it applies here
          too: "reconnexion" says what is happening, a spinner does not. The
          state is a labelled chip, never a colour on its own (§15).
        */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Chip
            label={translate(
              over ? 'live.over' : view.connected ? 'live.connected' : 'live.reconnecting',
            )}
            icon={over ? 'check' : view.connected ? 'live' : 'wifi-off'}
            testID="live-state"
          />
          {!over && view.drawnPoints === 0 && (
            <Text tone="muted" variant="caption">
              {translate('live.waiting')}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg }}>
          <StatTile
            label={translate('activity.distance')}
            value={formatKilometres(stats?.distanceMetres ?? 0)}
            unit={translate('common.km')}
            spokenUnit={translate('common.spokenKilometres')}
            testID="live-distance"
          />
          <StatTile
            label={translate('activity.duration')}
            value={formatDuration(stats?.elapsedSeconds ?? 0)}
            spokenValue={spokenDuration(stats?.elapsedSeconds ?? 0)}
          />
          <StatTile
            label={translate('activity.pace')}
            value={formatPace(stats?.averagePaceSecondsPerKm)}
            unit={translate('common.perKm')}
            spokenValue={spokenPace(stats?.averagePaceSecondsPerKm)}
          />
          {stats?.averageHeartRate !== undefined && (
            <StatTile
              label={translate('activity.heartRate')}
              value={formatWhole(stats.averageHeartRate)}
              unit={translate('common.bpm')}
              spokenUnit={translate('common.spokenBpm')}
            />
          )}
        </View>

        {over && (
          <Button
            label={translate('live.openSummary')}
            onPress={() => {
              onOpenSummary(id);
            }}
            testID="live-summary"
          />
        )}
      </View>

      {/*
        §5: the aggregated statistics are the only live region, they are polite,
        and they speak at most twice a minute. The raw stream of positions is
        never announced — which is why nothing above this is a live region, and
        why this text is refreshed on a timer rather than on every update.
      */}
      <Text
        liveRegion="polite"
        style={{ position: 'absolute', opacity: 0 }}
        testID="live-announcement"
      >
        {spokenSummary(view.announced)}
      </Text>
    </View>
  );
}
