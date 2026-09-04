import { FollowListScreen } from '@runtrack/features';
import { userId } from '@runtrack/core';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

export default function FollowingRoute(): ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <FollowListScreen
      userId={userId(id)}
      kind="following"
      onBack={() => {
        router.back();
      }}
    />
  );
}
