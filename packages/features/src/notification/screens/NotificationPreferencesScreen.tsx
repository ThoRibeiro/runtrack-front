import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { NOTIFICATION_TYPES, quietHours, type NotificationPreferences } from '@runtrack/core';
import {
  Button,
  Card,
  FormField,
  GroupedRows,
  ScreenHeader,
  Skeleton,
  Slider,
  Switch,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import { translate } from '../../i18n';
import {
  useDevices,
  useNotificationPreferences,
  useRemoveDevice,
  useUpdateNotificationPreferences,
} from '../hooks/useNotifications';
import { usePushRegistration } from '../hooks/usePush';

/**
 * Notification settings (§12): which kinds are muted, quiet hours with their
 * time zone, and the devices that may be pushed to.
 *
 * The list of kinds comes from the **server** — `availableTypes` — and not from
 * a constant here. The server sends it for exactly that reason: a screen with
 * its own list stops matching the day a kind is added, and nobody notices.
 *
 * Quiet hours are two sliders and not a time picker: a picker is a
 * platform-specific modal with its own accessibility story, and "22 h" to
 * "7 h" needs neither minutes nor precision.
 */
export interface NotificationPreferencesScreenProps {
  /** The runner's own zone, read by the shell — `Intl` is not in the hexagon. */
  timeZone: string;
  onBack?: (() => void) | undefined;
}

const MINUTES_PER_HOUR = 60;

function hourLabel(minutes: number): string {
  return translate('preferences.hour', { hour: Math.floor(minutes / MINUTES_PER_HOUR) });
}

/**
 * The server enumerates the kinds, so it may name one this build has never
 * heard of. It still gets a switch — muting something you cannot read about is
 * better than not being able to mute it at all — with its raw name as label.
 */
function kindLabel(type: string): string {
  const known = NOTIFICATION_TYPES.find((candidate) => candidate === type);
  return known === undefined ? type : translate(`inbox.kind.${known}`);
}

export function NotificationPreferencesScreen({
  timeZone,
  onBack,
}: NotificationPreferencesScreenProps): ReactNode {
  const theme = useTheme();
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const devices = useDevices();
  const removeDevice = useRemoveDevice();
  const push = usePushRegistration();

  const current = preferences.data;
  const [fromHour, setFromHour] = useState(22);
  const [toHour, setToHour] = useState(7);

  if (preferences.isPending || current === undefined) {
    return (
      <View
        style={{ flex: 1, backgroundColor: theme.colours.canvas, padding: space.md, gap: space.sm }}
        testID="preferences-loading"
      >
        <Skeleton width="100%" height={theme.typography.title.lineHeight} />
        <Skeleton width="80%" height={theme.typography.body.lineHeight} />
      </View>
    );
  }

  const save = (next: NotificationPreferences): void => {
    update.mutate(next);
  };

  const toggleMuted = (type: string, muted: boolean): void => {
    const mutedTypes = muted
      ? [...current.mutedTypes, type]
      : current.mutedTypes.filter((candidate) => candidate !== type);
    save({ ...current, mutedTypes });
  };

  const quietOn = current.quietHours !== undefined;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }}>
      <ScreenHeader
        title={translate('preferences.title')}
        onBack={onBack}
        backLabel={translate('common.back')}
        testID="preferences-header"
      />
      <ScrollView
        contentContainerStyle={{ padding: space.md, paddingBottom: space['3xl'], gap: space.lg }}
        testID="preferences-screen"
      >
        {/*
        §12: the permission is asked **after** showing what it buys. This card
        is that explanation, and the button is the only thing that opens the
        system dialog. On the web it is absent entirely — a browser has no push
        token, and §2 says the web does not mention what it cannot do.
      */}
        {push.state !== 'unsupported' && push.state !== 'registered' && (
          <Card tone="brand" testID="preferences-push">
            <View style={{ gap: space.sm }}>
              <Text>{translate('preferences.pushWhy')}</Text>
              {push.state === 'refused' ? (
                <Text tone="danger">{translate('preferences.pushRefused')}</Text>
              ) : (
                <Button
                  label={translate('preferences.enablePush')}
                  icon="bell"
                  onPress={() => {
                    void push.enable();
                  }}
                  testID="preferences-enable-push"
                />
              )}
            </View>
          </Card>
        )}

        <View style={{ gap: space.sm }}>
          <Text variant="section">{translate('preferences.kinds')}</Text>
          {current.availableTypes.map((type) => (
            <FormField key={type} label={kindLabel(type)}>
              {(field) => (
                <Switch
                  field={field}
                  // Muted is stored; the switch shows the opposite, because
                  // "recevoir" is what a person is deciding, not "couper".
                  value={!current.mutedTypes.includes(type)}
                  onValueChange={(wanted) => {
                    toggleMuted(type, !wanted);
                  }}
                  testID={`preferences-kind-${type}`}
                />
              )}
            </FormField>
          ))}
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="section">{translate('preferences.quietHours')}</Text>
          <Text tone="muted" variant="caption">
            {translate('preferences.quietHoursZone', { zone: timeZone })}
          </Text>

          <FormField label={translate('preferences.quietHoursOn')}>
            {(field) => (
              <Switch
                field={field}
                value={quietOn}
                onValueChange={(wanted) => {
                  save({
                    ...current,
                    quietHours: wanted
                      ? quietHours(fromHour * MINUTES_PER_HOUR, toHour * MINUTES_PER_HOUR, timeZone)
                      : undefined,
                  });
                }}
                testID="preferences-quiet-on"
              />
            )}
          </FormField>

          {quietOn && (
            <>
              <FormField label={translate('preferences.from')}>
                {(field) => (
                  <Slider
                    field={field}
                    minimum={0}
                    maximum={23}
                    step={1}
                    defaultValue={22}
                    value={fromHour}
                    onValueChange={setFromHour}
                    formatValue={(value: number) => hourLabel(value * MINUTES_PER_HOUR)}
                    testID="preferences-from"
                  />
                )}
              </FormField>
              <FormField label={translate('preferences.to')}>
                {(field) => (
                  <Slider
                    field={field}
                    minimum={0}
                    maximum={23}
                    step={1}
                    defaultValue={7}
                    value={toHour}
                    onValueChange={setToHour}
                    formatValue={(value: number) => hourLabel(value * MINUTES_PER_HOUR)}
                    testID="preferences-to"
                  />
                )}
              </FormField>
              <Button
                label={translate('preferences.saveQuietHours')}
                loading={update.isPending}
                disabled={fromHour === toHour}
                onPress={() => {
                  save({
                    ...current,
                    quietHours: quietHours(
                      fromHour * MINUTES_PER_HOUR,
                      toHour * MINUTES_PER_HOUR,
                      timeZone,
                    ),
                  });
                }}
                testID="preferences-save-quiet"
              />
              {fromHour === toHour && (
                <Text tone="danger" variant="caption">
                  {/* Une plage nulle et une plage de 24 h s'écriraient pareil. */}
                  {translate('preferences.quietHoursEqual')}
                </Text>
              )}
            </>
          )}
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="section">{translate('preferences.devices')}</Text>
          {devices.isError ? (
            <Card tone="alt">
              <Text tone="muted">{translate('preferences.devicesUnavailable')}</Text>
            </Card>
          ) : (
            <GroupedRows
              testID="preferences-devices"
              rows={(devices.data ?? []).map((device) => ({
                key: device.token,
                label: translate(
                  `preferences.platform.${device.platform === 'IOS' ? 'IOS' : 'ANDROID'}`,
                ),
                value: translate('preferences.removeDevice'),
                onPress: () => {
                  removeDevice.mutate(device.token);
                },
              }))}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
