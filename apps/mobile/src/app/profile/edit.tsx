import { EditProfileScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * Modifier son profil : identité, audience du compte, physiologie.
 *
 * `back()` plutôt qu'une route en dur — on y arrive depuis son profil, et on y
 * arrivera peut-être demain depuis les réglages.
 */
export default function EditProfileRoute(): ReactNode {
  return (
    <EditProfileScreen
      onSaved={() => {
        router.back();
      }}
      onBack={() => {
        router.back();
      }}
    />
  );
}
