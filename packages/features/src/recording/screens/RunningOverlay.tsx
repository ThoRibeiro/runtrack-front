import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityId, RecordingWarning } from '@runtrack/core';
import { Card, Chip, IconAction, Modal, Text, space, useTheme } from '@runtrack/ui';
import { effortOf, formatDuration, formatKilometres, spokenDuration, usesSpeed } from '../../format';
import { translate } from '../../i18n';
import { useRecording, useRecordingActions } from '../RecordingProvider';
import { useElapsedSeconds } from '../hooks/useElapsed';

/**
 * The run itself (§6, §10), over the map it is drawing.
 *
 * Everything about it comes from one sentence in the brief: it is read **at
 * arm's length, in full sun, while running, with a wet hand**. That is
 * situational disability, and it asks for exactly what a permanent one does —
 * so the numbers are as large as the map allows, the three controls are far
 * apart, and finishing goes through a confirmation because a mis-tap at
 * kilometre eighteen is unforgivable.
 *
 * What re-renders: the duration, once a second, and the statistics when a
 * batch lands. The positions never come through here (§14) — they go straight
 * to the map underneath.
 */
export interface RunningOverlayProps {
  onFinished: (id: ActivityId) => void;
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
    case 'points-refused':
      return translate('record.warnRefused', {
        count: warning.count,
        reason: translate(`record.refused.${warning.reason}`),
      });
    case 'points-pending':
      return warning.count === 1
        ? translate('record.warnPendingOne')
        : translate('record.warnPendingMany', { count: warning.count });
  }
}

export function RunningOverlay({ onFinished }: RunningOverlayProps): ReactNode {
  const theme = useTheme();
  const status = useRecording((state) => state.status);
  const activity = useRecording((state) => state.activity);
  const stats = useRecording((state) => state.stats);
  const warnings = useRecording((state) => state.warnings);
  const actions = useRecordingActions();
  const [confirming, setConfirming] = useState<'finish' | 'discard' | undefined>(undefined);

  const running = status === 'recording';
  // Le vélo se lit en km/h, la course à pied en min/km. Les deux mesures de
  // l'écran partagent l'unité : sinon l'instantanée et la moyenne ne se
  // comparent plus.
  const type = activity?.type ?? 'RUN';
  const current = effortOf(type, stats?.currentPaceSecondsPerKm);
  const average = effortOf(type, stats?.averagePaceSecondsPerKm);
  const elapsed = useElapsedSeconds(activity?.startedAt, running);

  return (
    <>
      <View
        style={{ position: 'absolute', top: space.md, left: space.md, right: space.md }}
        pointerEvents="box-none"
      >
        <Card testID="recording-panel">
          <View style={{ gap: space.sm }}>
            {/*
              Les avertissements passent à la ligne : sur une seule, le second
              sortait de l'écran et son compte finissait dans le vide.
            */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: space.xs,
              }}
            >
              <Chip
                label={translate(running ? 'record.running' : 'record.paused')}
                icon={running ? 'activity' : 'pause'}
                testID="recording-state"
              />
              {warnings.map((warning) => (
                <Text
                  key={warning.kind}
                  tone="muted"
                  variant="caption"
                  testID={`warn-${warning.kind}`}
                >
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

            <View style={{ flexDirection: 'row', gap: space.xl }}>
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
                accessibilityLabel={`${translate(usesSpeed(type) ? 'record.currentSpeed' : 'record.currentPace')}, ${current.spoken}`}
              >
                {/*
                  L'unité à côté du chiffre, comme pour la distance : « 9:35 »
                  seul ne dit pas s'il s'agit d'une allure ou d'un temps.
                */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xxs }}>
                  <Text variant="metric" decorative testID="recording-current-pace">
                    {current.value}
                  </Text>
                  {stats?.currentPaceSecondsPerKm !== undefined && (
                    <Text variant="caption" tone="muted" decorative>
                      {current.unit}
                    </Text>
                  )}
                </View>
                <Text variant="caption" tone="muted" decorative>
                  {translate(usesSpeed(type) ? 'record.currentSpeed' : 'record.currentPace')}
                </Text>
              </View>

              <View
                accessible
                accessibilityLabel={`${translate(usesSpeed(type) ? 'record.averageSpeed' : 'record.averagePace')}, ${average.spoken}`}
              >
                {/*
                  L'unité à côté du chiffre, comme pour la distance : « 9:35 »
                  seul ne dit pas s'il s'agit d'une allure ou d'un temps.
                */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xxs }}>
                  <Text variant="metric" decorative testID="recording-average-pace">
                    {average.value}
                  </Text>
                  {stats?.averagePaceSecondsPerKm !== undefined && (
                    <Text variant="caption" tone="muted" decorative>
                      {average.unit}
                    </Text>
                  )}
                </View>
                <Text variant="caption" tone="muted" decorative>
                  {translate(usesSpeed(type) ? 'record.averageSpeed' : 'record.averagePace')}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </View>

      {/* Huge targets, well apart: §5's situational disability, §6's wet hand. */}
      <View
        style={{
          position: 'absolute',
          bottom: space.lg,
          left: space.md,
          right: space.md,
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingVertical: space.sm,
          borderRadius: theme.radius.xl,
          backgroundColor: theme.colours.surface,
        }}
      >
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
            // Rien à quitter : l'écran redevient celui du départ, carte comprise.
            void actions.discard();
            return;
          }
          void actions.finish().then((finished) => {
            if (finished !== undefined) onFinished(finished.id);
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
    </>
  );
}
