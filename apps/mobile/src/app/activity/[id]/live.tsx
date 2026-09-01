import { LiveScreen } from '@runtrack/features';
import { activityId } from '@runtrack/core';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

export default function LiveRoute(): ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <LiveScreen
      id={activityId(id)}
      onBack={() => {
        router.back();
      }}
      onOpenSummary={(activity) => {
        // La course est finie : on remplace le direct dans l'historique plutôt
        // que d'empiler un retour vers un écran qui n'a plus rien à montrer.
        router.replace(`/activity/${activity}`);
      }}
    />
  );
}
