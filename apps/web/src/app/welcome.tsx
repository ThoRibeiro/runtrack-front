import { WelcomeScreen, usePreferenceActions } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * §Design : la présentation, une seule fois, à la première installation.
 *
 * `markWelcomeSeen` avant de partir : la garde du layout la relit, et sans ça
 * l'écran reviendrait au prochain lancement.
 */
export default function WelcomeRoute(): ReactNode {
  const { markWelcomeSeen } = usePreferenceActions();

  return (
    <WelcomeScreen
      onDone={() => {
        void markWelcomeSeen().then(() => {
          router.replace('/');
        });
      }}
    />
  );
}
