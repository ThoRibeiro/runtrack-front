import { RecordingScreen } from '@runtrack/features/recording';
import { ThemeProvider } from '@runtrack/ui';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * §3 : l'écran d'enregistrement, et lui seul, porte le thème de course. Il est
 * hors des onglets — une barre d'onglets pendant qu'on court est une cible de
 * plus à côté de laquelle viser.
 *
 * L'écran reste allumé tant que la course tourne (§3 : « il reste allumé trois
 * heures »). C'est le thème sombre qui rend ça tenable pour la batterie, et
 * c'est la coque qui le décide : `packages/features` ne connaît pas Expo.
 */
export default function RecordingRoute(): ReactNode {
  useKeepAwake();

  return (
    <ThemeProvider name="run">
      <RecordingScreen
        onFinished={(id) => {
          router.replace(`/activity/${id}`);
        }}
        onDiscarded={() => {
          router.replace('/');
        }}
      />
    </ThemeProvider>
  );
}
