import { useMemo, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { isTerminal } from '@runtrack/core';
import { SharedActivityGateway } from '@runtrack/api';
import { Chip, EmptyState, Skeleton, StatTile, Text, space, useTheme } from '@runtrack/ui';
import {
  effortOf,
  formatDuration,
  formatKilometres,
  formatWhole,
  spokenDuration,
  usesSpeed,
} from '../../format';
import { translate } from '../../i18n';
import { iconForActivityType } from '../../activity/activityIcon';
import { ActivityMap } from '../../map';
import { queryKeys } from '../../query/keys';
import { useRuntime } from '../../runtime/RuntimeProvider';

/**
 * A shared activity, opened from a link, **without an account** (§10, web).
 *
 * The token is in the path and the requests are anonymous: the server resolves
 * `/shared/v1/{token}` and forwards internally. Nothing on this screen assumes
 * a session, and that is deliberate — the person reading it may well not have
 * one, and asking them to sign in to see what was shared with them would defeat
 * the point of sharing it.
 *
 * What it does **not** offer: liking, commenting, following. Those need an
 * account, and §2's rule applies — a greyed-out button with a tooltip is worse
 * than no button. The link shows a run; the application is elsewhere.
 */
export interface SharedActivityScreenProps {
  token: string;
}

export function SharedActivityScreen({ token }: SharedActivityScreenProps): ReactNode {
  const theme = useTheme();
  const runtime = useRuntime();
  const gateway = useMemo(() => new SharedActivityGateway(runtime.http, token), [runtime, token]);

  const activity = useQuery({
    queryKey: queryKeys.sharedActivity(token),
    queryFn: () => gateway.activity(),
    retry: false,
  });
  const track = useQuery({
    queryKey: queryKeys.sharedTrack(token),
    queryFn: () => gateway.track(),
    enabled: activity.isSuccess,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const splits = useQuery({
    queryKey: queryKeys.sharedSplits(token),
    queryFn: () => gateway.splits(),
    enabled: activity.isSuccess,
    retry: false,
  });
  const points = useQuery({
    queryKey: [...queryKeys.sharedTrack(token), 'decoded'],
    queryFn: ({ signal }) => {
      const decoding = runtime.trackDecoder.decode(track.data?.polyline ?? '');
      signal.addEventListener('abort', () => {
        decoding.cancel();
      });
      return decoding.points;
    },
    enabled: track.data !== undefined && track.data.polyline !== '',
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  if (activity.isPending) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md, gap: space.sm }}
        testID="shared-loading"
      >
        <Skeleton width="100%" height={theme.typography.title.lineHeight} />
        <Skeleton width="60%" height={theme.typography.body.lineHeight} />
      </View>
    );
  }

  if (activity.isError) {
    // Révoqué, expiré, inventé : le serveur répond la même chose aux trois, et
    // l'écran aussi. Distinguer confirmerait à qui tâtonne qu'un jeton a existé.
    return (
      <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="shared-invalid">
        <EmptyState
          icon="eye-off"
          title={translate('public.notFound')}
          description={translate('public.notFoundDetail')}
        />
      </View>
    );
  }

  const data = activity.data;
  const live = !isTerminal(data.status);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="shared-screen">
      <View style={{ height: '40%', backgroundColor: theme.colours.surfaceAlt }}>
        <ActivityMap
          points={points.data}
          splits={splits.data ?? []}
          live={live}
          unavailable={track.isError || (track.isSuccess && track.data.polyline === '')}
          testID="shared-map"
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.md, gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <View accessible accessibilityRole="header" accessibilityLabel={data.title}>
            <Text variant="title" decorative>
              {data.title}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Chip
              label={translate(`activity.type.${data.type}`)}
              icon={iconForActivityType(data.type)}
            />
            {live && <Chip label={translate('live.connected')} icon="live" />}
          </View>
          <Text tone="muted" variant="caption">
            {translate('public.viewingShared')}
          </Text>
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
            // Le vélo se lit en km/h, la course à pied en min/km.
            label={translate(usesSpeed(data.type) ? 'activity.speed' : 'activity.pace')}
            value={effortOf(data.type, data.stats.averagePaceSecondsPerKm).value}
            unit={effortOf(data.type, data.stats.averagePaceSecondsPerKm).unit}
            spokenValue={effortOf(data.type, data.stats.averagePaceSecondsPerKm).spoken}
          />
          <StatTile
            label={translate('activity.elevationGain')}
            value={formatWhole(data.stats.elevationGain)}
            unit={translate('common.metres')}
            spokenUnit={translate('common.spokenMetres')}
          />
        </View>
      </ScrollView>
    </View>
  );
}
