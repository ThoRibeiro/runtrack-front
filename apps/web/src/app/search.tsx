import { SearchScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function SearchRoute(): ReactNode {
  return (
    <SearchScreen
      onOpenProfile={(handle) => {
        router.push(`/profile/${handle}`);
      }}
    />
  );
}
