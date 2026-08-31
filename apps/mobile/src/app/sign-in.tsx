import { SignInScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function SignInRoute(): ReactNode {
  return (
    <SignInScreen
      onSignedIn={() => {
        router.replace('/');
      }}
      onForgotPassword={() => {
        router.push('/forgot-password');
      }}
      onSignUp={() => {
        router.push('/sign-up');
      }}
    />
  );
}
