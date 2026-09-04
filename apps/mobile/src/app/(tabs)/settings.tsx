import { SettingsScreen } from '@runtrack/features';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function SettingsRoute(): ReactNode {
  return (
    <SettingsScreen
      version={Constants.expoConfig?.version ?? '0.1.0'}
      onOpenProfile={() => {
        router.push('/profile/edit');
      }}
      onOpenNotifications={() => {
        router.push('/notifications/preferences');
      }}
      onSignedOut={() => {
        router.replace('/sign-in');
      }}
      onReplayWelcome={() => {
        router.push('/welcome');
      }}
    />
  );
}
