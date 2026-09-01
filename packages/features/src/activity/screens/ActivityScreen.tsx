import { useCallback, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ActivityId, ActivityMapPresenter } from '@runtrack/core';
import { isTerminal } from '@runtrack/core';
import {
  Chip,
  ErrorState,
  FloatingIconButton,
  GroupedRows,
  IconAction,
  Skeleton,
  Spinner,
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
import { ActivityMap, useDecodedTrack, useTrack } from '../../map';
import { useActivity, useSplits } from '../hooks/useActivity';

/**
 * §10's activity screen: full-bleed map, floating back and menu buttons, and
 * the sliding panel with the row of round actions, the splits and the tiles.
 *
 * The kilometre marks appear on the map only once the splits are loaded, and
 * the splits load only when their section is opened (lot 6, §5). The two go
 * together on screen and that reads well — opening "Kilomètres" pins them on
 * the trace — but it is a consequence of that decision, not a design of its own.
 */
export interface ActivityScreenProps {
  id: ActivityId;
  onBack: () => void;
  onFollowLive: (id: ActivityId) => void;
  onShare: (id: ActivityId) => void;
}

export function ActivityScreen({
  id,
  onBack,
  onFollowLive,
  onShare,
}: ActivityScreenProps): ReactNode {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const activity = useActivity(id);
  const [splitsOpen, setSplitsOpen] = useState(false);
  const splits = useSplits(id, splitsOpen);
  const track = useTrack(id);
  const points = useDecodedTrack(id, track.data?.polyline);
  const presenter = useRef<ActivityMapPresenter | undefined>(undefined);

  const handlePresenter = useCallback((created: ActivityMapPresenter) => {
    presenter.current = created;
  }, []);

  /**
   * §8: the kilometre marks are clickable. And they are clickable from the
   * list, where a screen reader user actually is — so the move is announced,
   * because a camera that flies somewhere off-screen is silent otherwise.
   */
  const focusKilometre = useCallback((index: number) => {
    if (presenter.current?.focusKilometre(index) === true) {
      AccessibilityInfo.announceForAccessibility(translate('activity.splitFocused', { index }));
    }
  }, []);

  if (activity.isPending) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md, gap: space.sm }}
        testID="activity-loading"
      >
        <Skeleton width="100%" height={height * 0.35} rounded="md" />
        <Skeleton width="70%" height={theme.typography.title.lineHeight} />
        <Skeleton width="40%" height={theme.typography.body.lineHeight} />
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
        testID="activity-error"
      />
    );
  }

  const data = activity.data;
  const live = !isTerminal(data.status);
  // §0: raw points are purged 90 days after archiving, and only the summary
  // survives. The map says so rather than showing an empty grey square.
  const trackMissing = track.isError || (track.isSuccess && track.data.polyline === '');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="activity-screen">
      <View style={{ height: height * 0.4, backgroundColor: theme.colours.surfaceAlt }}>
        <ActivityMap
          points={points.data}
          splits={splits.data ?? []}
          live={live}
          unavailable={trackMissing}
          onPresenter={handlePresenter}
          testID="activity-map"
        />
        <View
          style={{
            position: 'absolute',
            top: space.lg,
            left: space.md,
            right: space.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <FloatingIconButton
            icon="arrow-left"
            accessibilityLabel={translate('activity.back')}
            onPress={onBack}
            testID="activity-back"
          />
          <FloatingIconButton
            icon="more-horizontal"
            accessibilityLabel={translate('activity.menu')}
          />
        </View>
      </View>

      <ScrollView
        style={{
          flex: 1,
          marginTop: -theme.radius.sheet,
          borderTopLeftRadius: theme.radius.sheet,
          borderTopRightRadius: theme.radius.sheet,
          backgroundColor: theme.colours.surface,
        }}
        contentContainerStyle={{ padding: space.md, gap: space.lg }}
      >
        <View style={{ gap: space.xs }}>
          <View accessible accessibilityRole="header" accessibilityLabel={data.title}>
            <Text variant="title" decorative>
              {data.title}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Chip label={translate(`activity.type.${data.type}`)} icon="activity" />
            <Text tone="muted" variant="caption">
              {`${formatKilometres(data.stats.distanceMetres)} ${translate('common.km')} · ${formatWhole(data.stats.elevationGain)} ${translate('common.metres')}`}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <IconAction
            icon="live"
            label={translate('activity.followLive')}
            active={live}
            disabled={!live}
            onPress={() => {
              onFollowLive(id);
            }}
            testID="activity-follow-live"
          />
          <IconAction
            icon="share"
            label={translate('activity.share')}
            onPress={() => {
              onShare(id);
            }}
            testID="activity-share"
          />
          <IconAction icon="download" label={translate('activity.offline')} disabled />
          <IconAction icon="bookmark" label={translate('activity.save')} disabled />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg }}>
          <StatTile
            label={translate('activity.distance')}
            value={formatKilometres(data.stats.distanceMetres)}
            unit={translate('common.km')}
            spokenUnit={translate('common.spokenKilometres')}
          />
          <StatTile
            label={translate('activity.duration')}
            value={formatDuration(data.stats.elapsedSeconds)}
            spokenValue={spokenDuration(data.stats.elapsedSeconds)}
          />
          <StatTile
            label={translate('activity.pace')}
            value={formatPace(data.stats.averagePaceSecondsPerKm)}
            unit={translate('common.perKm')}
            spokenValue={spokenPace(data.stats.averagePaceSecondsPerKm)}
          />
          <StatTile
            label={translate('activity.elevationGain')}
            value={formatWhole(data.stats.elevationGain)}
            unit={translate('common.metres')}
            spokenUnit={translate('common.spokenMetres')}
          />
          {data.stats.averageHeartRate !== undefined && (
            <StatTile
              label={translate('activity.heartRate')}
              value={formatWhole(data.stats.averageHeartRate)}
              unit={translate('common.bpm')}
              spokenUnit={translate('common.spokenBpm')}
            />
          )}
        </View>

        <View style={{ gap: space.sm }}>
          <IconAction
            icon={splitsOpen ? 'chevron-down' : 'chevron-right'}
            label={translate('activity.splits')}
            active={splitsOpen}
            onPress={() => {
              // The splits are only fetched once asked for: a finished activity
              // has one per kilometre, and nobody reads them from the feed.
              setSplitsOpen(!splitsOpen);
            }}
            testID="activity-splits-toggle"
          />
          {splitsOpen &&
            (splits.isPending ? (
              <Spinner label={translate('common.loading')} />
            ) : (
              <GroupedRows
                testID="activity-splits"
                rows={(splits.data ?? []).map((split) => ({
                  key: String(split.kilometreIndex),
                  // The server numbers splits from 1 — `SplitCalculator` refuses
                  // anything below. Adding one here numbered every kilometre
                  // one too high, which is what this row used to do.
                  label: translate('activity.splitLabel', { index: split.kilometreIndex }),
                  value: `${formatPace(split.paceSecondsPerKm)}${split.complete ? '' : ` (${translate('activity.splitPartial')})`}`,
                  // A partial kilometre has no mark on the trace, so it has
                  // nothing to show: leaving it inert beats a row that looks
                  // pressable and does nothing.
                  onPress: split.complete
                    ? () => {
                        focusKilometre(split.kilometreIndex);
                      }
                    : undefined,
                }))}
              />
            ))}
        </View>
      </ScrollView>
    </View>
  );
}
