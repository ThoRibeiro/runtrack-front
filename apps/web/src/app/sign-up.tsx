import { SignUpScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function SignUpRoute(): ReactNode {
  return (
    <SignUpScreen
      onSignIn={() => {
        router.replace('/sign-in');
      }}
    />
  );
}
