import { ResetPasswordScreen } from '@runtrack/features';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

/** Opened from the link in the message: `runtrack://reset-password?token=…`. */
export default function ResetPasswordRoute(): ReactNode {
  const { token } = useLocalSearchParams<{ token?: string }>();

  return (
    <ResetPasswordScreen
      token={token}
      onSignIn={() => {
        router.replace('/sign-in');
      }}
    />
  );
}
