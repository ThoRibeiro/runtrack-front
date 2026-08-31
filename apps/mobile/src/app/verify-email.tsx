import { VerifyEmailScreen } from '@runtrack/features';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

export default function VerifyEmailRoute(): ReactNode {
  const { token } = useLocalSearchParams<{ token?: string }>();

  return (
    <VerifyEmailScreen
      token={token}
      onSignIn={() => {
        router.replace('/sign-in');
      }}
    />
  );
}
