import { ActivityScreen } from '@runtrack/features';
import { activityId } from '@runtrack/core';
import * as Clipboard from 'expo-clipboard';
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
      onCopyLink={(url) => {
        void Clipboard.setStringAsync(url);
      }}
    />
  );
}
