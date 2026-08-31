import { useState, type ReactNode } from 'react';
import { Button, EmptyState, FormField, Input } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useResetPassword } from '../hooks/useAuthMutations';
import { validateConfirmation, validateNewPassword } from '../validation';
import { AuthLayout } from './AuthLayout';

export interface ResetPasswordScreenProps {
  /** Comes from the link in the message; absent means the link was mangled. */
  token: string | undefined;
  onSignIn: () => void;
}

export function ResetPasswordScreen({ token, onSignIn }: ResetPasswordScreenProps): ReactNode {
  const reset = useResetPassword();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const passwordError = validateNewPassword(password);
  const confirmationError = validateConfirmation(password, confirmation);

  if (token === undefined) {
    return (
      <AuthLayout
        title={translate('auth.verifyEmail.missingToken')}
        testID="reset-password-no-token"
      >
        <EmptyState
          icon="alert-circle"
          title={translate('auth.verifyEmail.missingToken')}
          description={translate('auth.verifyEmail.missingTokenDetail')}
          actionLabel={translate('auth.signUp.haveAccount')}
          onAction={onSignIn}
        />
      </AuthLayout>
    );
  }

  const submit = (): void => {
    setShowErrors(true);
    if (passwordError !== undefined || confirmationError !== undefined) return;
    reset.mutate({ token, password });
  };

  if (reset.isSuccess) {
    return (
      <AuthLayout title={translate('auth.resetPassword.done')} testID="reset-password-done">
        <EmptyState
          icon="check"
          title={translate('auth.resetPassword.done')}
          description={translate('auth.resetPassword.doneDetail')}
          actionLabel={translate('auth.signIn.submit')}
          onAction={onSignIn}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={translate('auth.resetPassword.title')}
      subtitle={translate('auth.resetPassword.subtitle')}
      error={reset.error}
      testID="reset-password"
    >
      <FormField
        label={translate('auth.resetPassword.newPassword')}
        hint={translate('auth.signUp.passwordHint')}
        required
        error={showErrors && passwordError !== undefined ? translate(passwordError) : undefined}
      >
        {(field) => (
          <Input
            field={field}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            testID="reset-password-password"
          />
        )}
      </FormField>

      <FormField
        label={translate('auth.resetPassword.confirm')}
        required
        error={
          showErrors && confirmationError !== undefined ? translate(confirmationError) : undefined
        }
      >
        {(field) => (
          <Input
            field={field}
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoComplete="new-password"
            testID="reset-password-confirmation"
          />
        )}
      </FormField>

      <Button
        label={translate('auth.resetPassword.submit')}
        onPress={submit}
        loading={reset.isPending}
        fullWidth
        testID="reset-password-submit"
      />
    </AuthLayout>
  );
}
