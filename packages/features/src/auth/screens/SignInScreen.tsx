import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button, FormField, Input, Pressable, Text, space } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { useSignIn, useSignInWithProvider } from '../hooks/useAuthMutations';
import { validateEmail, validatePasswordPresence } from '../validation';
import { AuthLayout } from './AuthLayout';

/**
 * Navigation arrives as callbacks rather than as a router hook.
 *
 * That is what lets this screen be mounted in a test — and in the gallery —
 * without a router, and it is also what keeps `packages/features` free of Expo
 * Router: the two shells wire their own routes to the same screen.
 */
export interface SignInScreenProps {
  onSignedIn: () => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
}

export function SignInScreen({
  onSignedIn,
  onForgotPassword,
  onSignUp,
}: SignInScreenProps): ReactNode {
  // La présence d'une passerelle d'identité est la bascule : quand les comptes
  // sont tenus ailleurs, il n'y a plus de mot de passe à saisir ici — et un
  // formulaire qui en demanderait un serait exactement ce qu'un gestionnaire de
  // mots de passe apprend à se méfier.
  const delegated = useRuntime().identity !== undefined;
  if (delegated) {
    return <ProviderSignIn onSignedIn={onSignedIn} />;
  }
  return (
    <PasswordSignIn
      onSignedIn={onSignedIn}
      onForgotPassword={onForgotPassword}
      onSignUp={onSignUp}
    />
  );
}

/**
 * La connexion déléguée : un bouton, et le navigateur du système fait le reste.
 *
 * Refermer ce navigateur ne mène nulle part ailleurs qu'ici, sans bannière : la
 * mutation rend `undefined`, et l'écran reste tel quel.
 */
function ProviderSignIn({ onSignedIn }: { onSignedIn: () => void }): ReactNode {
  const signIn = useSignInWithProvider();

  return (
    <AuthLayout
      title={translate('auth.provider.title')}
      subtitle={translate('auth.provider.subtitle')}
      error={signIn.error}
      testID="sign-in"
    >
      <Button
        label={translate('auth.provider.submit')}
        onPress={() => {
          signIn.mutate(undefined, {
            onSuccess: (session) => {
              if (session !== undefined) onSignedIn();
            },
          });
        }}
        loading={signIn.isPending}
        fullWidth
        testID="sign-in-submit"
      />
    </AuthLayout>
  );
}

function PasswordSignIn({
  onSignedIn,
  onForgotPassword,
  onSignUp,
}: SignInScreenProps): ReactNode {
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const emailError = validateEmail(email);
  const passwordError = validatePasswordPresence(password);

  const submit = (): void => {
    setShowErrors(true);
    if (emailError !== undefined || passwordError !== undefined) return;

    signIn.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          onSignedIn();
        },
      },
    );
  };

  return (
    <AuthLayout
      title={translate('auth.signIn.title')}
      subtitle={translate('auth.signIn.subtitle')}
      error={signIn.error}
      testID="sign-in"
      footer={
        <View style={{ gap: space.sm, alignItems: 'center' }}>
          <Pressable
            onPress={onForgotPassword}
            accessibilityLabel={translate('auth.signIn.forgotPassword')}
          >
            <Text tone="brand" decorative>
              {translate('auth.signIn.forgotPassword')}
            </Text>
          </Pressable>
          <Pressable onPress={onSignUp} accessibilityLabel={translate('auth.signIn.noAccount')}>
            <Text tone="brand" decorative>
              {translate('auth.signIn.noAccount')}
            </Text>
          </Pressable>
        </View>
      }
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
            placeholder={translate('auth.signIn.emailPlaceholder')}
            keyboardType="email-address"
            autoComplete="email"
            testID="sign-in-email"
          />
        )}
      </FormField>

      <FormField
        label={translate('common.password')}
        required
        error={showErrors && passwordError !== undefined ? translate(passwordError) : undefined}
      >
        {(field) => (
          <Input
            field={field}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            testID="sign-in-password"
          />
        )}
      </FormField>

      <Button
        label={translate('auth.signIn.submit')}
        onPress={submit}
        loading={signIn.isPending}
        fullWidth
        testID="sign-in-submit"
      />
    </AuthLayout>
  );
}
