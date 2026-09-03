import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { VISIBILITIES, type Visibility } from '@runtrack/core';
import {
  FormField,
  GroupedRows,
  Modal,
  RadioGroup,
  Sheet,
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
 * A list of rows rather than a page of form controls: a setting is read far
 * more often than it is changed, and a row showing its current value answers
 * "what is it set to" without making anyone parse a group of radios. The
 * choice itself opens in a sheet, where the options — and the reason behind
 * them — have room.
 */
export interface SettingsScreenProps {
  onOpenProfile: () => void;
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

function themeLabel(choice: ThemeChoice): string {
  const found = THEME_CHOICES.find((candidate) => candidate.value === choice);
  return translate(found?.label ?? 'settings.theme.system');
}

export function SettingsScreen({
  onOpenProfile,
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

  const [choosing, setChoosing] = useState<'theme' | 'visibility' | undefined>(undefined);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colours.canvas }}
      contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space['3xl'] }}
      testID="settings-screen"
    >
      <View accessible accessibilityRole="header" accessibilityLabel={translate('settings.title')}>
        <Text variant="title" decorative>
          {translate('settings.title')}
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="overline" tone="muted" decorative>
          {translate('settings.account')}
        </Text>
        <GroupedRows
          testID="settings-account"
          rows={[
            {
              key: 'profile',
              icon: 'user',
              label: translate('profile.edit'),
              description: translate('settings.profileDetail'),
              onPress: onOpenProfile,
            },
            {
              key: 'notifications',
              icon: 'bell',
              label: translate('settings.notifications'),
              description: translate('settings.notificationsDetail'),
              onPress: onOpenNotifications,
            },
            {
              key: 'theme',
              icon: 'sliders',
              label: translate('settings.theme'),
              description: translate('settings.themeDetail'),
              value: themeLabel(choice),
              onPress: () => {
                setChoosing('theme');
              },
            },
            {
              key: 'visibility',
              icon: 'eye',
              label: translate('settings.defaultVisibility'),
              description: translate('settings.visibilityHint'),
              value: translate(`visibility.${visibility}`),
              onPress: () => {
                setChoosing('visibility');
              },
            },
          ]}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="overline" tone="muted" decorative>
          {translate('settings.more')}
        </Text>
        <GroupedRows
          testID="settings-rows"
          rows={[
            {
              key: 'welcome',
              icon: 'play',
              label: translate('settings.replayWelcome'),
              description: translate('settings.replayWelcomeDetail'),
              onPress: onReplayWelcome,
            },
            {
              key: 'version',
              icon: 'info',
              label: translate('settings.about'),
              value: translate('settings.version', { version }),
            },
            {
              key: 'sign-out',
              icon: 'arrow-left',
              label: translate('settings.signOut'),
              description: translate('settings.signOutRowDetail'),
              onPress: () => {
                setConfirmingSignOut(true);
              },
            },
          ]}
        />
      </View>

      <Sheet
        visible={choosing === 'theme'}
        onClose={() => {
          setChoosing(undefined);
        }}
        title={translate('settings.theme')}
        detents={[0.5]}
        testID="settings-theme-sheet"
      >
        <View style={{ gap: space.sm }}>
          <FormField label={translate('settings.theme')} labelHidden>
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
      </Sheet>

      <Sheet
        visible={choosing === 'visibility'}
        onClose={() => {
          setChoosing(undefined);
        }}
        title={translate('settings.defaultVisibility')}
        detents={[0.5]}
        testID="settings-visibility-sheet"
      >
        <View style={{ gap: space.sm }}>
          <FormField label={translate('settings.defaultVisibility')} labelHidden>
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
      </Sheet>

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
