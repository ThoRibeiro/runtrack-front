import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

/**
 * Le document HTML qui enveloppe chaque page de l'export statique.
 *
 * §5 en demande deux choses, et l'audit `@axe-core/playwright` les a trouvées
 * manquantes toutes les deux :
 *
 * - **`lang="fr"`.** Sans elle, un lecteur d'écran lit du français avec une voix
 *   anglaise. La clé `web.lang` de `app.json` ne suffit pas : Expo ne l'applique
 *   qu'au titre de l'onglet, pas à l'élément racine ;
 * - **un `<title>`**, que WCAG 2.4.2 rend obligatoire. Celui-ci est le titre par
 *   défaut ; chaque écran le remplace par le sien.
 *
 * Ce fichier ne rend rien côté client — Expo Router s'en sert uniquement pour
 * fabriquer le HTML statique de l'export.
 */
export default function Root({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/*
          `viewport-fit=cover` pour les encoches, et surtout **pas** de
          `maximum-scale` : §5 exige que la mise en page survive à 200 % de
          zoom, et empêcher de zoomer est la façon la plus directe de la violer.
        */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="RunTrack — suivi de courses à pied" />
        <title>RunTrack</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
