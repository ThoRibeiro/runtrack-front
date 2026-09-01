import { HomeScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function HomeRoute(): ReactNode {
  return (
    <HomeScreen
      onOpenNotifications={() => {
        router.navigate('/notifications');
      }}
      onOpenProfile={() => {
        router.navigate('/profile');
      }}
      onOpenFeed={() => {
        router.navigate('/feed');
      }}
      onOpenActivity={(id) => {
        router.push(`/activity/${id}`);
      }}
    />
  );
}
