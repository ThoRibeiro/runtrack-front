import { ForgotPasswordScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function ForgotPasswordRoute(): ReactNode {
  return (
    <ForgotPasswordScreen
      onBack={() => {
        router.back();
      }}
    />
  );
}
