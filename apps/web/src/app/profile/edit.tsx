import { EditProfileScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

/** Modifier son profil : rien ici ne demande le téléphone (§2). */
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
