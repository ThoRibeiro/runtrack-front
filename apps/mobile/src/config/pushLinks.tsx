import { parseNotificationResponse } from '@runtrack/adapters/notification/native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { pathOf } from './deepLinks';

/**
 * §12 : « une notification touchée ouvre l'écran qu'elle annonce, application
 * fermée comprise ».
 *
 * Les deux cas sont bien distincts, et n'en traiter qu'un est le bug classique :
 *
 * - l'application **était fermée** : la réponse est déjà là au démarrage, et il
 *   faut aller la chercher (`getLastNotificationResponse`, synchrone depuis
 *   SDK 57 — la variante `…Async` est dépréciée) ;
 * - l'application **tournait** : elle arrive par un écouteur.
 *
 * Une destination que ce build ne sait pas lire n'ouvre rien — ouvrir le mauvais
 * écran serait pire (§11).
 */
export function PushLinks({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    const pending = Notifications.getLastNotificationResponse();
    if (pending !== null) {
      const link = parseNotificationResponse(pending);
      if (link !== undefined) router.push(pathOf(link));
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = parseNotificationResponse(response);
      if (link !== undefined) router.push(pathOf(link));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return children;
}
