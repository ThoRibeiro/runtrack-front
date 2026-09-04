import { SocialScreen } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * L'onglet social. Pas de retour : un onglet est une racine, et une flèche qui
 * ne mène nulle part est pire qu'aucune flèche.
 */
export default function SocialRoute(): ReactNode {
  return (
    <SocialScreen
      onOpenProfile={(handle) => {
        router.push(`/profile/${handle}`);
      }}
      onOpenRequests={() => {
        router.push('/follow-requests');
      }}
    />
  );
}
