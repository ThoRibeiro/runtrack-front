import { ChooseHandleScreen, useMe } from '@runtrack/features';
import { hasProvisionalHandle } from '@runtrack/core';
import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

/**
 * Le pseudo, proposé une fois le compte ouvert par le fournisseur d'identité.
 *
 * L'écran décide lui-même s'il a lieu d'être : la connexion mène ici sans savoir
 * quel pseudo le compte porte — le profil n'arrive qu'ensuite. S'il en a déjà un
 * choisi, on passe la main sans que personne ne voie l'écran.
 */
export default function ChooseHandleRoute(): ReactNode {
  const me = useMe();
  const settled = me.data !== undefined;
  const provisional = settled && hasProvisionalHandle(me.data);

  useEffect(() => {
    if (settled && !provisional) router.replace('/');
  }, [settled, provisional]);

  if (!provisional) return null;

  return (
    <ChooseHandleScreen
      onChosen={() => {
        router.replace('/');
      }}
      onSkip={() => {
        router.replace('/');
      }}
    />
  );
}
