import { FeedScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function FeedRoute(): ReactNode {
  return (
    <FeedScreen
      onOpenActivity={(id) => {
        router.push(`/activity/${id}`);
      }}
    />
  );
}
