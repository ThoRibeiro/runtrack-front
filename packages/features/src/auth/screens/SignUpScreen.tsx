import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button, EmptyState, FormField, Input, Pressable, Text } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useSignUp } from '../hooks/useAuthMutations';
import {
  validateDisplayName,
  validateEmail,
  validateHandle,
  validateNewPassword,
} from '../validation';
import { AuthLayout } from './AuthLayout';

export interface SignUpScreenProps {
  onSignIn: () => void;
}

export function SignUpScreen({ onSignIn }: SignUpScreenProps): ReactNode {
  const signUp = useSignUp();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const errors = {
    handle: validateHandle(handle),
    displayName: validateDisplayName(displayName),
    email: validateEmail(email),
    password: validateNewPassword(password),
  };

  const submit = (): void => {
    setShowErrors(true);
    if (Object.values(errors).some((error) => error !== undefined)) return;

    signUp.mutate({
      handle: handle.trim(),
      displayName: displayName.trim(),
      email: email.trim(),
      password,
    });
  };

  // The account exists but cannot sign in yet: the server requires a confirmed
  // address, so sending the user to the sign-in form here would be sending them
  // to a refusal.
  if (signUp.isSuccess) {
    return (
      <AuthLayout title={translate('auth.signUp.done')} testID="sign-up-done">
        <EmptyState
          icon="check"
          title={translate('auth.signUp.done')}
          description={translate('auth.signUp.doneDetail', { email: email.trim() })}
          actionLabel={translate('auth.signUp.haveAccount')}
          onAction={onSignIn}
        />
      </AuthLayout>
    );
  }

  const shown = (key: keyof typeof errors): string | undefined =>
    showErrors && errors[key] !== undefined ? translate(errors[key]) : undefined;

  return (
    <AuthLayout
      title={translate('auth.signUp.title')}
      subtitle={translate('auth.signUp.subtitle')}
      error={signUp.error}
      testID="sign-up"
      footer={
        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={onSignIn} accessibilityLabel={translate('auth.signUp.haveAccount')}>
            <Text tone="brand" decorative>
              {translate('auth.signUp.haveAccount')}
            </Text>
          </Pressable>
        </View>
      }
    >
      <FormField
        label={translate('auth.signUp.handle')}
        hint={translate('auth.signUp.handleHint')}
        required
        error={shown('handle')}
      >
        {(field) => (
          <Input field={field} value={handle} onChangeText={setHandle} testID="sign-up-handle" />
        )}
      </FormField>

      <FormField label={translate('auth.signUp.displayName')} required error={shown('displayName')}>
        {(field) => (
          <Input
            field={field}
            value={displayName}
            onChangeText={setDisplayName}
            autoComplete="name"
            testID="sign-up-display-name"
          />
        )}
      </FormField>

      <FormField label={translate('common.email')} required error={shown('email')}>
        {(field) => (
          <Input
            field={field}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            testID="sign-up-email"
          />
        )}
      </FormField>

      <FormField
        label={translate('common.password')}
        hint={translate('auth.signUp.passwordHint')}
        required
        error={shown('password')}
      >
        {(field) => (
          <Input
            field={field}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            testID="sign-up-password"
          />
        )}
      </FormField>

      <Button
        label={translate('auth.signUp.submit')}
        onPress={submit}
        loading={signUp.isPending}
        fullWidth
        testID="sign-up-submit"
      />
    </AuthLayout>
  );
}
