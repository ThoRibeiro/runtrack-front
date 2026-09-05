import { SignInScreen, useRuntime } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

export default function SignInRoute(): ReactNode {
  // Un compte ouvert par le fournisseur d'identité porte un pseudo dérivé de son
  // identifiant : on passe proposer d'en choisir un. L'écran s'efface de lui-même
  // si le pseudo a déjà été choisi — ici, le profil n'est pas encore chargé.
  const delegated = useRuntime().identity !== undefined;

  return (
    <SignInScreen
      onSignedIn={() => {
        router.replace(delegated ? '/choose-handle' : '/');
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
