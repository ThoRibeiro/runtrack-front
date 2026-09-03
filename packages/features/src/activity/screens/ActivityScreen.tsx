import { useCallback, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ActivityId, ActivityMapPresenter } from '@runtrack/core';
import { isTerminal } from '@runtrack/core';
import {
  Button,
  Chip,
  ErrorState,
  FloatingIconButton,
  GroupedRows,
  IconAction,
  Modal,
  SectionHeader,
  OfflineState,
  Sheet,
  Skeleton,
  Spinner,
  StatTile,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import {
  effortOf,
  formatDuration,
  formatKilometres,
  formatPace,
  formatWhole,
  spokenDuration,
  usesSpeed,
} from '../../format';
import { describeError, translate } from '../../i18n';
import { CommentThread, LikeButton, ShareSheet } from '../../engagement';
import { ActivityMap, useDecodedTrack, useTrack } from '../../map';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { iconForActivityType } from '../activityIcon';
import { useActivity, useDeleteActivity, useSplits } from '../hooks/useActivity';
import { useLiveActivity } from '../../live/hooks/useLiveActivity';
import { useMe } from '../../user/hooks/useProfile';

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
  /** Handed a URL to put on the clipboard; the shell owns that. */
  onCopyLink?: ((url: string) => void) | undefined;
  /** Où aller quand la course vient d'être supprimée. Retour, par défaut. */
  onDeleted?: (() => void) | undefined;
}

export function ActivityScreen({
  id,
  onBack,
  onFollowLive,
  onCopyLink,
  onDeleted,
}: ActivityScreenProps): ReactNode {
  const theme = useTheme();
  const runtime = useRuntime();
  const [sharing, setSharing] = useState(false);
  const { height } = useWindowDimensions();
  const activity = useActivity(id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const me = useMe();
  const remove = useDeleteActivity();
  const splits = useSplits(id);
  // Une course en cours n'a pas de trace archivée : elle a un flux. Demander
  // `/track` répondait TRACK_NOT_ARCHIVED, que l'écran affichait comme « points
  // purgés au-delà de 90 jours » — un message faux sur une course commencée il
  // y a deux minutes.
  const running = activity.data !== undefined && !isTerminal(activity.data.status);
  const track = useTrack(id, !running);
  const points = useDecodedTrack(id, track.data?.polyline);
  const { view, attachMap } = useLiveActivity(id, { enabled: running });
  const presenter = useRef<ActivityMapPresenter | undefined>(undefined);

  const handlePresenter = useCallback(
    (created: ActivityMapPresenter) => {
      presenter.current = created;
      // Pendant la course, c'est le flux qui dessine : la carte reçoit les
      // positions à mesure qu'elles arrivent, comme sur l'écran de suivi.
      attachMap(created);
    },
    [attachMap],
  );

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

  // §9 : une course déjà ouverte est en cache et s'affiche ; une autre ne peut
  // pas l'être, et le dire vaut mieux qu'un squelette qui ne se remplira pas.
  if (activity.isPending && activity.fetchStatus === 'paused') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="activity-offline">
        <OfflineState
          title={translate('offline.title')}
          description={translate('offline.activity')}
          retryLabel={translate('common.retry')}
          onRetry={() => {
            void activity.refetch();
          }}
        />
      </View>
    );
  }

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
        title={described.title}
        message={described.detail}
        correlationId={described.correlationId}
        onRetry={() => {
          void activity.refetch();
        }}
        testID="activity-error"
      />
    );
  }

  const activityData = activity.data;
  // Pendant la course, les chiffres viennent du flux : la requête initiale les
  // a figés au moment de l'ouverture, et une sortie qui avance sous les yeux du
  // lecteur avec 0,0 km affiché se lit comme une panne.
  const data =
    view.stats === undefined ? activityData : { ...activityData, stats: view.stats };
  const live = !isTerminal(data.status);
  const mine = me.data?.id === data.ownerId;
  // §0: raw points are purged 90 days after archiving, and only the summary
  // survives. The map says so rather than showing an empty grey square.
  // « Purgée » ne se dit que d'une course terminée : sur une course en cours,
  // l'absence de trace archivée est normale, et le flux prend le relais.
  const trackMissing = !live && (track.isError || (track.isSuccess && track.data.polyline === ''));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="activity-screen">
      <View style={{ height: height * 0.4, backgroundColor: theme.colours.surfaceAlt }}>
        <ActivityMap
          points={live ? undefined : points.data}
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
          {/*
            Le menu n'apparaît que sur ses propres courses : sur celle d'un
            autre, il n'aurait rien à proposer — un bouton qui ouvre un panneau
            vide est pire que pas de bouton.
          */}
          {mine && (
            <FloatingIconButton
              icon="more-horizontal"
              accessibilityLabel={translate('activity.menu')}
              onPress={() => {
                setMenuOpen(true);
              }}
              testID="activity-menu"
            />
          )}
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
            <Chip
              label={translate(`activity.type.${data.type}`)}
              icon={iconForActivityType(data.type)}
            />
            <Text tone="muted" variant="caption">
              {`${formatKilometres(data.stats.distanceMetres)} ${translate('common.km')} · ${formatWhole(data.stats.elevationGain)} ${translate('common.metres')}`}
            </Text>
          </View>
        </View>

        {/*
          Trois actions, toutes vivantes. « Hors-ligne » et « Enregistrer »
          étaient désactivés en dur depuis leur écriture : un bouton qui ne fait
          rien occupe la place et fait douter des autres. « En direct » ne
          s'affiche que pendant la course — sur une sortie terminée, il n'y a
          rien à suivre.
        */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {live && (
            <IconAction
              icon="live"
              label={translate('activity.followLive')}
              active
              onPress={() => {
                onFollowLive(id);
              }}
              testID="activity-follow-live"
            />
          )}
          <LikeButton activityId={id} testID="activity-like" />
          <IconAction
            icon="share"
            label={translate('activity.share')}
            onPress={() => {
              setSharing(true);
            }}
            testID="activity-share"
          />
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
          {data.stats.averageHeartRate !== undefined && (
            <StatTile
              label={translate('activity.heartRate')}
              value={formatWhole(data.stats.averageHeartRate)}
              unit={translate('common.bpm')}
              spokenUnit={translate('common.spokenBpm')}
            />
          )}
        </View>

        {/*
          Les kilomètres et les commentaires s'affichent, ils ne se déplient
          plus : deux chevrons au milieu d'une page de course, c'est deux gestes
          pour lire ce qu'on est venu voir. La requête, elle, part toujours à
          l'ouverture de l'écran — pas avant.
        */}
        <View style={{ gap: space.sm }}>
          <SectionHeader title={translate('activity.splits')} />
          {splits.isPending ? (
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
          )}
        </View>

        <View style={{ gap: space.sm }}>
          <SectionHeader title={translate('engagement.comments')} />
          <CommentThread activityId={id} testID="activity-comments" />
        </View>
      </ScrollView>

      <ShareSheet
        activityId={id}
        visible={sharing}
        baseUrl={runtime.baseUrl}
        onCopy={onCopyLink}
        onClose={() => {
          setSharing(false);
        }}
      />

      <Sheet
        visible={menuOpen}
        onClose={() => {
          setMenuOpen(false);
        }}
        title={data.title}
        detents={[0.35]}
        testID="activity-menu-sheet"
      >
        <Button
          variant="danger"
          label={translate('activity.delete')}
          icon="x"
          fullWidth
          onPress={() => {
            setMenuOpen(false);
            setConfirmingDelete(true);
          }}
          testID="activity-delete"
        />
      </Sheet>

      <Modal
        visible={confirmingDelete}
        title={translate('activity.deleteConfirm')}
        confirmLabel={translate('activity.delete')}
        cancelLabel={translate('common.cancel')}
        destructive
        onConfirm={() => {
          setConfirmingDelete(false);
          // Elle part avec ses points, sa trace et ses tronçons : c'est ce que
          // le serveur fait, et il n'y a pas de corbeille.
          remove.mutate(id, { onSuccess: onDeleted ?? onBack });
        }}
        onClose={() => {
          setConfirmingDelete(false);
        }}
        testID="activity-delete-confirm"
      >
        <Text tone="muted">{translate('activity.deleteDetail')}</Text>
      </Modal>
    </View>
  );
}
