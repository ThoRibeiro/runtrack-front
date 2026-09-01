import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { RecordingWarning } from '@runtrack/core';
import { Chip, IconAction, Modal, Text, space, useTheme } from '@runtrack/ui';
import {
  formatDuration,
  formatKilometres,
  formatPace,
  formatWhole,
  spokenDuration,
  spokenPace,
} from '../../format';
import { translate } from '../../i18n';
import { useRecording, useRecordingActions } from '../RecordingProvider';
import { useElapsedSeconds } from '../hooks/useElapsed';

/**
 * The run itself (§6, §10) — and the only screen in the application wearing the
 * running theme (§3).
 *
 * Everything about it comes from one sentence in the brief: it is read **at
 * arm's length, in full sun, while running, with a wet hand**. That is
 * situational disability, and it asks for exactly what a permanent one does —
 * so there is no fine interaction anywhere here, the numbers are as large as
 * the screen allows, and finishing goes through a confirmation because a
 * mis-tap at kilometre eighteen is unforgivable.
 *
 * What re-renders: the duration, once a second, and the statistics when a batch
 * lands. Nothing else — the positions never come through here (§14).
 */
export interface RecordingScreenProps {
  onFinished: (activityId: string) => void;
  onDiscarded: () => void;
}

/**
 * §6: "« 3 points en attente » vaut mieux qu'une icône ambiguë". And in French
 * one point is not "1 point(s)" — a parenthesised plural in the middle of a run
 * is exactly the kind of detail that makes an application feel unfinished.
 */
function warningText(warning: RecordingWarning): string {
  switch (warning.kind) {
    case 'no-gps-fix':
      return translate('record.warnNoFix');
    case 'clock-drift':
      return warning.rejectedCount === 1
        ? translate('record.warnClockOne')
        : translate('record.warnClockMany', { count: warning.rejectedCount });
    case 'points-pending':
      return warning.count === 1
        ? translate('record.warnPendingOne')
        : translate('record.warnPendingMany', { count: warning.count });
  }
}

export function RecordingScreen({ onFinished, onDiscarded }: RecordingScreenProps): ReactNode {
  const theme = useTheme();
  const status = useRecording((state) => state.status);
  const activity = useRecording((state) => state.activity);
  const stats = useRecording((state) => state.stats);
  const warnings = useRecording((state) => state.warnings);
  const actions = useRecordingActions();
  const [confirming, setConfirming] = useState<'finish' | 'discard' | undefined>(undefined);

  const running = status === 'recording';
  const elapsed = useElapsedSeconds(activity?.startedAt, running);

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md, gap: space.lg }}
      testID="recording-screen"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Chip
          label={translate(running ? 'record.running' : 'record.paused')}
          icon={running ? 'activity' : 'pause'}
          testID="recording-state"
        />
        {warnings.map((warning) => (
          <Text key={warning.kind} tone="muted" variant="caption" testID={`warn-${warning.kind}`}>
            {warningText(warning)}
          </Text>
        ))}
      </View>

      {/* The number the whole screen is about, in `display` (§3). */}
      <View
        accessible
        accessibilityLabel={translate('record.spokenDistance', {
          distance: formatKilometres(stats?.distanceMetres ?? 0),
        })}
      >
        <Text variant="display" decorative testID="recording-distance">
          {formatKilometres(stats?.distanceMetres ?? 0)}
        </Text>
        <Text variant="caption" tone="muted" decorative>
          {translate('common.km')}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg }}>
        <View
          accessible
          accessibilityLabel={`${translate('activity.duration')}, ${spokenDuration(elapsed)}`}
        >
          <Text variant="metric" decorative testID="recording-duration">
            {formatDuration(elapsed)}
          </Text>
          <Text variant="caption" tone="muted" decorative>
            {translate('activity.duration')}
          </Text>
        </View>

        <View
          accessible
          accessibilityLabel={`${translate('record.currentPace')}, ${spokenPace(stats?.currentPaceSecondsPerKm)}`}
        >
          <Text variant="metric" decorative testID="recording-current-pace">
            {formatPace(stats?.currentPaceSecondsPerKm)}
          </Text>
          <Text variant="caption" tone="muted" decorative>
            {translate('record.currentPace')}
          </Text>
        </View>

        <View
          accessible
          accessibilityLabel={`${translate('record.averagePace')}, ${spokenPace(stats?.averagePaceSecondsPerKm)}`}
        >
          <Text variant="metric" decorative testID="recording-average-pace">
            {formatPace(stats?.averagePaceSecondsPerKm)}
          </Text>
          <Text variant="caption" tone="muted" decorative>
            {translate('record.averagePace')}
          </Text>
        </View>

        <View
          accessible
          accessibilityLabel={`${translate('activity.elevationGain')}, ${formatWhole(stats?.elevationGain ?? 0)} ${translate('common.spokenMetres')}`}
        >
          <Text variant="metric" decorative testID="recording-elevation">
            {formatWhole(stats?.elevationGain ?? 0)}
          </Text>
          <Text variant="caption" tone="muted" decorative>
            {translate('activity.elevationGain')}
          </Text>
        </View>

        {stats?.averageHeartRate !== undefined && (
          <View
            accessible
            accessibilityLabel={`${translate('activity.heartRate')}, ${formatWhole(stats.averageHeartRate)} ${translate('common.spokenBpm')}`}
          >
            <Text variant="metric" decorative testID="recording-heart-rate">
              {formatWhole(stats.averageHeartRate)}
            </Text>
            <Text variant="caption" tone="muted" decorative>
              {translate('activity.heartRate')}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }} />

      {/* Huge targets, well apart: §5's situational disability, and §6's wet hand. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <IconAction
          icon={running ? 'pause' : 'play'}
          label={translate(running ? 'record.pause' : 'record.resumeRun')}
          onPress={() => {
            void (running ? actions.pause() : actions.resume());
          }}
          testID="recording-pause"
        />
        <IconAction
          icon="stop"
          label={translate('record.finish')}
          onPress={() => {
            setConfirming('finish');
          }}
          testID="recording-finish"
        />
        <IconAction
          icon="x"
          label={translate('record.discard')}
          onPress={() => {
            setConfirming('discard');
          }}
          testID="recording-discard"
        />
      </View>

      <Modal
        visible={confirming !== undefined}
        title={translate(
          confirming === 'discard' ? 'record.confirmDiscard' : 'record.confirmFinish',
        )}
        confirmLabel={translate(confirming === 'discard' ? 'record.discard' : 'record.finish')}
        cancelLabel={translate('common.cancel')}
        destructive={confirming === 'discard'}
        onConfirm={() => {
          const choice = confirming;
          setConfirming(undefined);
          if (choice === 'discard') {
            void actions.discard().then(onDiscarded);
            return;
          }
          void actions.finish().then((finished) => {
            if (finished !== undefined) onFinished(finished.id);
            else onDiscarded();
          });
        }}
        onClose={() => {
          setConfirming(undefined);
        }}
        testID="recording-confirm"
      >
        <Text tone="muted">
          {translate(
            confirming === 'discard' ? 'record.confirmDiscardDetail' : 'record.confirmFinishDetail',
          )}
        </Text>
      </Modal>
    </View>
  );
}
