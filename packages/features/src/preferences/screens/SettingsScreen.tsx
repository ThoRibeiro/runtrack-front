import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { VISIBILITIES, type Visibility } from '@runtrack/core';
import {
  Button,
  FormField,
  GroupedRows,
  Modal,
  RadioGroup,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import { translate } from '../../i18n';
import { useSessionActions } from '../../session/SessionProvider';
import { usePreferenceActions, usePreferences } from '../PreferencesProvider';
import type { ThemeChoice } from '../preferencesStore';

/**
 * Settings — the client-side ones (§9).
 *
 * The split matters and is easy to get wrong: **the theme and the default
 * visibility of a new run belong to this phone**, while the account's own
 * visibility and the notification preferences belong to the server and have
 * their own screens. Mixing them into one list would suggest that changing the
 * theme here changes it on the other device too.
 *
 * "Selon le système" is a real choice, not the absence of one: a phone that
 * switches at sunset should carry the application with it.
 */
export interface SettingsScreenProps {
  onOpenNotifications: () => void;
  onSignedOut: () => void;
  onReplayWelcome: () => void;
  /** Shown in the about row; the shell knows its own build. */
  version: string;
}

const THEME_CHOICES = [
  { value: 'system', label: 'settings.theme.system' },
  { value: 'light', label: 'settings.theme.light' },
  { value: 'dark', label: 'settings.theme.dark' },
] as const satisfies readonly { value: ThemeChoice; label: Parameters<typeof translate>[0] }[];

export function SettingsScreen({
  onOpenNotifications,
  onSignedOut,
  onReplayWelcome,
  version,
}: SettingsScreenProps): ReactNode {
  const theme = useTheme();
  const choice = usePreferences((state) => state.theme);
  const visibility = usePreferences((state) => state.defaultVisibility);
  const actions = usePreferenceActions();
  const session = useSessionActions();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colours.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space['2xl'] }}
      testID="settings-screen"
    >
      <View accessible accessibilityRole="header" accessibilityLabel={translate('settings.title')}>
        <Text variant="title" decorative>
          {translate('settings.title')}
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="overline" tone="muted" decorative>
          {translate('settings.appearance')}
        </Text>
        <FormField label={translate('settings.theme')}>
          {(field) => (
            <RadioGroup
              field={field}
              value={choice}
              onValueChange={(next: ThemeChoice) => {
                void actions.setTheme(next);
              }}
              options={THEME_CHOICES.map((candidate) => ({
                value: candidate.value,
                label: translate(candidate.label),
              }))}
              testID="settings-theme"
            />
          )}
        </FormField>
        <Text variant="caption" tone="muted">
          {/* §3 : l'écran d'enregistrement garde son thème quoi qu'il arrive. */}
          {translate('settings.themeHint')}
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="overline" tone="muted" decorative>
          {translate('settings.privacy')}
        </Text>
        <FormField label={translate('settings.defaultVisibility')}>
          {(field) => (
            <RadioGroup
              field={field}
              value={visibility}
              onValueChange={(next: Visibility) => {
                void actions.setDefaultVisibility(next);
              }}
              options={VISIBILITIES.map((candidate) => ({
                value: candidate,
                label: translate(`visibility.${candidate}`),
              }))}
              testID="settings-visibility"
            />
          )}
        </FormField>
        <Text variant="caption" tone="muted">
          {translate('settings.visibilityHint')}
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="overline" tone="muted" decorative>
          {translate('settings.account')}
        </Text>
        <GroupedRows
          testID="settings-rows"
          rows={[
            {
              key: 'notifications',
              label: translate('settings.notifications'),
              onPress: onOpenNotifications,
            },
            {
              key: 'welcome',
              label: translate('settings.replayWelcome'),
              onPress: onReplayWelcome,
            },
            {
              key: 'version',
              label: translate('settings.about'),
              value: translate('settings.version', { version }),
            },
          ]}
        />
      </View>

      <Button
        variant="outline"
        label={translate('settings.signOut')}
        icon="arrow-left"
        onPress={() => {
          setConfirmingSignOut(true);
        }}
        testID="settings-sign-out"
      />

      <Modal
        visible={confirmingSignOut}
        title={translate('settings.signOutConfirm')}
        confirmLabel={translate('settings.signOut')}
        cancelLabel={translate('common.cancel')}
        destructive
        onConfirm={() => {
          setConfirmingSignOut(false);
          void session.signOut().then(onSignedOut);
        }}
        onClose={() => {
          setConfirmingSignOut(false);
        }}
        testID="settings-sign-out-confirm"
      >
        <Text tone="muted">{translate('settings.signOutDetail')}</Text>
      </Modal>
    </ScrollView>
  );
}
