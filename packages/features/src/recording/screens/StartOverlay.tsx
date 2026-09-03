import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityType, Visibility } from '@runtrack/core';
import { ACTIVITY_TYPES, VISIBILITIES } from '@runtrack/core';
import { Button, Card, FormField, Input, RadioGroup, Sheet, Text, space } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useRecording, useRecordingActions } from '../RecordingProvider';

/**
 * What sits over the map before a run (§6, §10).
 *
 * One button, and everything a run needs answering behind it: a runner opens
 * this screen to leave, not to fill in a form. §6's explanation still comes
 * **before** the system dialog — it is in the sheet, above the button that
 * fires it.
 *
 * A run left behind by a crash is offered here too, because this is where the
 * runner comes to start one.
 */
export interface StartOverlayProps {
  onOpenSettings?: (() => void) | undefined;
}

/** Enough of the screen for the three fields, not so much that the map is gone. */
const SHEET_HEIGHT = 0.85;

export function StartOverlay({ onOpenSettings }: StartOverlayProps): ReactNode {
  const status = useRecording((state) => state.status);
  const refusal = useRecording((state) => state.refusal);
  const canAskAgain = useRecording((state) => state.canAskPermissionAgain);
  const resumable = useRecording((state) => state.resumable);
  const actions = useRecordingActions();

  const [configuring, setConfiguring] = useState(false);
  const [title, setTitle] = useState(translate('record.defaultTitle'));
  const [type, setType] = useState<ActivityType>('RUN');
  const [visibility, setVisibility] = useState<Visibility>('FOLLOWERS');

  const starting = status === 'starting';

  const startRun = (): void => {
    setConfiguring(false);
    void actions.start({ type, title, visibility });
  };

  return (
    <>
      {/*
        Over the map rather than above it: a card that pushed the map down
        would shrink the one thing this screen is for. They are rare — a crash,
        a refusal — and they go away.
      */}
      {(resumable !== undefined || refusal !== undefined) && (
        <View
          style={{
            position: 'absolute',
            top: space.md,
            left: space.md,
            right: space.md,
            gap: space.sm,
          }}
        >
          {resumable !== undefined && (
            <Card testID="prepare-resumable">
              <View style={{ gap: space.sm }}>
                <Text variant="section">{translate('record.resumeTitle')}</Text>
                <Text tone="muted">
                  {resumable.pendingCount === 0
                    ? translate('record.resumeDetailNone')
                    : resumable.pendingCount === 1
                      ? translate('record.resumeDetailOne')
                      : translate('record.resumeDetailMany', { count: resumable.pendingCount })}
                </Text>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button
                    label={translate('record.resume')}
                    onPress={() => {
                      void actions.resumeInterrupted();
                    }}
                    testID="prepare-resume"
                  />
                  <Button
                    variant="outline"
                    label={translate('record.dropResumable')}
                    onPress={() => {
                      void actions.dropInterrupted();
                    }}
                    testID="prepare-drop"
                  />
                </View>
              </View>
            </Card>
          )}

          {refusal !== undefined && (
            <Card tone="alt" testID="prepare-refusal">
              <View style={{ gap: space.sm }}>
                <Text tone="danger">
                  {translate(refusal === 'permission' ? 'record.refused' : 'record.clockRefused')}
                </Text>
                {/*
                  Two situations behind one refusal. While the system still
                  agrees to ask, the fix is one tap. Once it refuses to ask, the
                  only honest offer left is the settings app — a "réessayer"
                  that opens nothing is a lie discovered outside, in the cold.
                */}
                {refusal === 'permission' &&
                  (canAskAgain ? (
                    <Button
                      label={translate('record.allowAgain')}
                      loading={starting}
                      onPress={startRun}
                      testID="prepare-allow"
                    />
                  ) : (
                    onOpenSettings !== undefined && (
                      <Button
                        variant="outline"
                        label={translate('record.openSettings')}
                        onPress={onOpenSettings}
                        testID="prepare-settings"
                      />
                    )
                  ))}
              </View>
            </Card>
          )}
        </View>
      )}

      {/* The only thing between the runner and their run. */}
      <View
        style={{ position: 'absolute', bottom: space.lg, left: space.md, right: space.md }}
        pointerEvents="box-none"
      >
        <Button
          label={translate('record.start')}
          icon="play"
          loading={starting}
          fullWidth
          onPress={() => {
            setConfiguring(true);
          }}
          testID="prepare-start"
        />
      </View>

      <Sheet
        visible={configuring}
        onClose={() => {
          setConfiguring(false);
        }}
        title={translate('record.prepareTitle')}
        detents={[SHEET_HEIGHT]}
        testID="prepare-form"
      >
        <View style={{ gap: space.md }}>
          <FormField label={translate('record.title')} required>
            {(field) => (
              <Input field={field} value={title} onChangeText={setTitle} testID="prepare-title" />
            )}
          </FormField>

          {/*
            A group of options and not a select: a select inside a sheet opens a
            second sheet over the first, and the type of a run is four answers
            wide — they fit, so one tap is enough.
          */}
          <FormField label={translate('record.type')}>
            {(field) => (
              <RadioGroup
                field={field}
                value={type}
                onValueChange={setType}
                options={ACTIVITY_TYPES.map((candidate) => ({
                  value: candidate,
                  label: translate(`activity.type.${candidate}`),
                }))}
                testID="prepare-type"
              />
            )}
          </FormField>

          <FormField label={translate('record.visibility')}>
            {(field) => (
              <RadioGroup
                field={field}
                value={visibility}
                onValueChange={setVisibility}
                options={VISIBILITIES.map((candidate) => ({
                  value: candidate,
                  label: translate(`visibility.${candidate}`),
                }))}
                testID="prepare-visibility"
              />
            )}
          </FormField>

          {/* §6: the explanation comes *before* the system dialog it fires. */}
          <Text variant="caption" tone="muted">
            {translate('record.permissionWhy')}
          </Text>

          <Button
            label={translate('record.start')}
            icon="play"
            loading={starting}
            fullWidth
            onPress={startRun}
            testID="prepare-confirm"
          />
        </View>
      </Sheet>
    </>
  );
}
