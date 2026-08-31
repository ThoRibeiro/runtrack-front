import { ActivityScreen } from '@runtrack/features';
import { activityId } from '@runtrack/core';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

export default function ActivityRoute(): ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ActivityScreen
      id={activityId(id)}
      onBack={() => {
        router.back();
      }}
      onFollowLive={(activity) => {
        router.push(`/activity/${activity}/live`);
      }}
      onShare={() => {
        // Le partage arrive au lot 11 : rien ici plutôt qu'un bouton qui ment.
      }}
    />
  );
}
