import { useResolvedTheme, usePreferences } from '@runtrack/features';
import { ThemeProvider } from '@runtrack/ui';
import { Redirect, usePathname } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * Le thème choisi, et la garde de l'écran de bienvenue.
 *
 * Les deux vivent ici parce qu'ils dépendent des préférences, donc du
 * fournisseur qui les lit : « selon le système » se résout à chaque rendu, et
 * la présentation ne se montre qu'à une installation neuve.
 *
 * **La présentation ne détourne que les points d'entrée.** Un lien de partage
 * reçu par quelqu'un qui n'a pas l'application, ou une notification qui pointe
 * vers une course, ouvrent ce qu'ils annoncent — pas un diaporama. Une garde
 * qui happe toutes les routes casse exactement ce que les liens profonds
 * existent pour faire.
 *
 * Elle attend aussi que les préférences soient lues — `loading` — plutôt que de
 * supposer « pas encore vu » : sans ça, l'écran de bienvenue clignote à chaque
 * démarrage, comme l'écran de connexion clignotait avant que `SessionStatus`
 * ait trois valeurs.
 */
const ENTRY_POINTS = new Set(['/', '/sign-in']);

export function ThemedApp({ children }: { children: ReactNode }): ReactNode {
  const theme = useResolvedTheme();
  const loading = usePreferences((state) => state.loading);
  const welcomeSeen = usePreferences((state) => state.welcomeSeen);
  const pathname = usePathname();

  if (!loading && !welcomeSeen && ENTRY_POINTS.has(pathname)) {
    return <Redirect href="/welcome" />;
  }

  return <ThemeProvider name={theme}>{children}</ThemeProvider>;
}
