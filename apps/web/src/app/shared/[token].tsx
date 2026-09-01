import { SharedActivityScreen } from '@runtrack/features';
import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * §10 : `/shared/{token}` ouvre une course privée **sans compte**.
 *
 * La route n'existe que sur le web : un lien se clique dans un navigateur, et
 * la coque mobile demande une session partout ailleurs.
 */
export default function SharedRoute(): ReactNode {
  const { token } = useLocalSearchParams<{ token: string }>();

  return <SharedActivityScreen token={token} />;
}
