import { useState, type ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import type { ActivityId } from '@runtrack/core';
import { isTerminal } from '@runtrack/core';
import {
  Chip,
  EmptyState,
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
import { useActivity, useSplits } from '../hooks/useActivity';

/**
 * §10's activity screen: full-bleed cover, floating back and menu buttons, and
 * the sliding panel with the row of round actions, the splits and the tiles.
 *
 * The cover is a placeholder here on purpose. The map is lot 7 — it needs the
 * `MapRenderer` port and its two adapters — and shipping a grey rectangle that
 * says so is more honest than shipping a static image that pretends.
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="activity-screen">
      <View
        style={{
          height: height * 0.4,
          backgroundColor: theme.colours.surfaceAlt,
          justifyContent: 'center',
        }}
      >
        <EmptyState
          icon="map-pin"
          title={translate('activity.mapPending')}
          description={translate('activity.mapPendingDetail')}
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
                  label: translate('activity.splitLabel', {
                    index: split.kilometreIndex + 1,
                  }),
                  value: `${formatPace(split.paceSecondsPerKm)}${split.complete ? '' : ` (${translate('activity.splitPartial')})`}`,
                }))}
              />
            ))}
        </View>
      </ScrollView>
    </View>
  );
}
