import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import type { ActivityType, Visibility } from '@runtrack/core';
import { ACTIVITY_TYPES, VISIBILITIES } from '@runtrack/core';
import { Button, Card, FormField, Input, Select, Text, space, useTheme } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useRecording, useRecordingActions } from '../RecordingProvider';

/**
 * Before the run (§6, §10).
 *
 * The screen exists mostly for one sentence. §6: the "always" permission is
 * asked **when the runner starts their first activity, with an explanation
 * before the system dialog** — never on first launch. The system dialog is a
 * one-shot: a refusal on a prompt nobody understood cannot be taken back
 * without a trip to the settings app, so the explanation is not a nicety.
 *
 * It is also where a run left behind by a crash is offered, because that is
 * where the runner goes to start one.
 */
export interface PrepareScreenProps {
  onStarted: () => void;
  onOpenSettings?: (() => void) | undefined;
}

export function PrepareScreen({ onStarted, onOpenSettings }: PrepareScreenProps): ReactNode {
  const theme = useTheme();
  const status = useRecording((state) => state.status);
  const refusal = useRecording((state) => state.refusal);
  const resumable = useRecording((state) => state.resumable);
  const actions = useRecordingActions();

  const [title, setTitle] = useState(translate('record.defaultTitle'));
  const [type, setType] = useState<ActivityType>('RUN');
  const [visibility, setVisibility] = useState<Visibility>('FOLLOWERS');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colours.canvas }}
      contentContainerStyle={{ padding: space.md, gap: space.lg }}
      testID="prepare-screen"
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
                  void actions.resumeInterrupted().then(onStarted);
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

      <View style={{ gap: space.sm }}>
        <Text variant="title">{translate('record.prepareTitle')}</Text>
        {/*
          §6: the explanation comes *before* the system dialog, not after a
          refusal. It says what the permission buys, in the runner's terms.
        */}
        <Text tone="muted">{translate('record.permissionWhy')}</Text>
      </View>

      <FormField label={translate('record.title')} required>
        {(field) => (
          <Input field={field} value={title} onChangeText={setTitle} testID="prepare-title" />
        )}
      </FormField>

      <FormField label={translate('record.type')}>
        {(field) => (
          <Select
            field={field}
            defaultValue="RUN"
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
          <Select
            field={field}
            defaultValue="FOLLOWERS"
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

      {refusal !== undefined && (
        <Card tone="alt" testID="prepare-refusal">
          <View style={{ gap: space.sm }}>
            <Text tone="danger">
              {translate(refusal === 'permission' ? 'record.refused' : 'record.clockRefused')}
            </Text>
            {refusal === 'permission' && onOpenSettings !== undefined && (
              <Button
                variant="outline"
                label={translate('record.openSettings')}
                onPress={onOpenSettings}
                testID="prepare-settings"
              />
            )}
          </View>
        </Card>
      )}

      <Button
        label={translate('record.start')}
        icon="play"
        loading={status === 'starting'}
        fullWidth
        onPress={() => {
          void actions.start({ type, title, visibility }).then(onStarted);
        }}
        testID="prepare-start"
      />
    </ScrollView>
  );
}
