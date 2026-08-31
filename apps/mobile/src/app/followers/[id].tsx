import { FollowListScreen } from '@runtrack/features';
import { userId } from '@runtrack/core';
import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

export default function FollowersRoute(): ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <FollowListScreen userId={userId(id)} kind="followers" />;
}
