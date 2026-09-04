import { ProfileScreen } from '@runtrack/features';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

export default function PublicProfileRoute(): ReactNode {
  const { handle } = useLocalSearchParams<{ handle: string }>();

  return (
    <ProfileScreen
      handle={handle}
      isMe={false}
      onOpenActivity={(id) => {
        router.push(`/activity/${id}`);
      }}
      onOpenFollowers={(id) => {
        router.push(`/followers/${id}`);
      }}
      onOpenFollowing={(id) => {
        router.push(`/following/${id}`);
      }}
      onBack={() => {
        router.back();
      }}
    />
  );
}
