import type { ReactNode } from 'react';
import { EmptyState, Spinner } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useVerifyEmail } from '../hooks/useVerifyEmail';
import { AuthLayout } from './AuthLayout';

export interface VerifyEmailScreenProps {
  token: string | undefined;
  onSignIn: () => void;
}

export function VerifyEmailScreen({ token, onSignIn }: VerifyEmailScreenProps): ReactNode {
  const verification = useVerifyEmail(token);

  if (token === undefined) {
    return (
      <AuthLayout title={translate('auth.verifyEmail.missingToken')} testID="verify-email-no-token">
        <EmptyState
          icon="alert-circle"
          title={translate('auth.verifyEmail.missingToken')}
          description={translate('auth.verifyEmail.missingTokenDetail')}
          actionLabel={translate('auth.signIn.submit')}
          onAction={onSignIn}
        />
      </AuthLayout>
    );
  }

  if (verification.isPending) {
    return (
      <AuthLayout title={translate('auth.verifyEmail.checking')} testID="verify-email-pending">
        <Spinner label={translate('auth.verifyEmail.checking')} visibleLabel />
      </AuthLayout>
    );
  }

  // §15: a spinner never ships without an error state and an empty state beside
  // it. Here the three are the three branches of this component.
  if (verification.isError) {
    return (
      <AuthLayout
        title={translate('auth.verifyEmail.checking')}
        error={verification.error}
        testID="verify-email-error"
      >
        <EmptyState
          icon="alert-circle"
          title={translate('auth.verifyEmail.missingToken')}
          description={translate('auth.verifyEmail.missingTokenDetail')}
          actionLabel={translate('auth.signIn.submit')}
          onAction={onSignIn}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={translate('auth.verifyEmail.done')} testID="verify-email-done">
      <EmptyState
        icon="check"
        title={translate('auth.verifyEmail.done')}
        description={translate('auth.verifyEmail.doneDetail')}
        actionLabel={translate('auth.signIn.submit')}
        onAction={onSignIn}
      />
    </AuthLayout>
  );
}
