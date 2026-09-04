import { RunScreen, useRecording } from '@runtrack/features/recording';
import { useResolvedTheme } from '@runtrack/features';
import { ThemeProvider } from '@runtrack/ui';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, type ReactNode } from 'react';

/**
 * L'onglet « Courir » : la carte, puis la course, sans changer de page.
 *
 * Ce qui appartient à la coque et pas à `packages/features`, qui ne connaît pas
 * Expo : §3 — l'écran reste allumé tant que la course tourne.
 *
 * <p>Le thème de course sombre, que §3 prévoyait pour cet écran, a été retiré :
 * sur une carte plein écran il coupait l'écran en deux, et le sombre imposé au
 * milieu d'une application claire se lit comme un défaut plutôt que comme une
 * intention. L'écran suit désormais le thème choisi dans les réglages, comme
 * tous les autres.
 */
const KEEP_AWAKE_TAG = 'runtrack-course';

export default function RecordRoute(): ReactNode {
  const resolved = useResolvedTheme();
  const status = useRecording((state) => state.status);
  const running = status === 'recording' || status === 'paused' || status === 'finishing';

  useEffect(() => {
    if (!running) return undefined;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [running]);

  return (
    <ThemeProvider name={resolved}>
      <RunScreen
        onFinished={(id) => {
          // La course est finie : son récapitulatif est un autre écran, et on
          // peut en revenir.
          router.push(`/activity/${id}`);
        }}
        onOpenSettings={() => {
          void Linking.openSettings();
        }}
      />
    </ThemeProvider>
  );
}
