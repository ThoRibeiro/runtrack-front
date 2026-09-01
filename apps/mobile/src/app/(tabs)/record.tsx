import { PrepareScreen } from '@runtrack/features/recording';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import type { ReactNode } from 'react';

export default function RecordRoute(): ReactNode {
  return (
    <PrepareScreen
      onStarted={() => {
        // La course est en cours : on quitte les onglets pour l'écran plein
        // cadre, thème de course. `replace` plutôt que `push` — revenir en
        // arrière sur la préparation pendant qu'on court n'a pas de sens.
        router.replace('/recording');
      }}
      onOpenSettings={() => {
        void Linking.openSettings();
      }}
    />
  );
}
