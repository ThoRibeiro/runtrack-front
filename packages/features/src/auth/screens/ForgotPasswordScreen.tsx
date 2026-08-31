import { useState, type ReactNode } from 'react';
import { Button, EmptyState, FormField, Input } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useRequestPasswordReset } from '../hooks/useAuthMutations';
import { validateEmail } from '../validation';
import { AuthLayout } from './AuthLayout';

export interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps): ReactNode {
  const request = useRequestPasswordReset();
  const [email, setEmail] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const emailError = validateEmail(email);

  const submit = (): void => {
    setShowErrors(true);
    if (emailError !== undefined) return;
    request.mutate(email.trim());
  };

  // The confirmation says "if an account exists" on purpose: telling the
  // visitor whether an address is registered turns this form into an account
  // enumeration oracle. The server answers the same way for both.
  if (request.isSuccess) {
    return (
      <AuthLayout title={translate('auth.forgotPassword.done')} testID="forgot-password-done">
        <EmptyState
          icon="check"
          title={translate('auth.forgotPassword.done')}
          description={translate('auth.forgotPassword.doneDetail', { email: email.trim() })}
          actionLabel={translate('common.back')}
          onAction={onBack}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={translate('auth.forgotPassword.title')}
      subtitle={translate('auth.forgotPassword.subtitle')}
      error={request.error}
      testID="forgot-password"
    >
      <FormField
        label={translate('common.email')}
        required
        error={showErrors && emailError !== undefined ? translate(emailError) : undefined}
      >
        {(field) => (
          <Input
            field={field}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            testID="forgot-password-email"
          />
        )}
      </FormField>

      <Button
        label={translate('auth.forgotPassword.submit')}
        onPress={submit}
        loading={request.isPending}
        fullWidth
        testID="forgot-password-submit"
      />
      <Button label={translate('common.back')} variant="ghost" onPress={onBack} fullWidth />
    </AuthLayout>
  );
}
