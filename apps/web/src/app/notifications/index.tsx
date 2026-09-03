import { InboxScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { pathOf } from '../../config/deepLinks';

export default function NotificationsRoute(): ReactNode {
  return (
    <InboxScreen
      onOpen={(link) => {
        router.push(pathOf(link));
      }}
      onOpenPreferences={() => {
        router.push('/notifications/preferences');
      }}
      onBack={() => {
        router.back();
      }}
    />
  );
}
