import { FollowRequestsScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function FollowRequestsRoute(): ReactNode {
  return (
    <FollowRequestsScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
