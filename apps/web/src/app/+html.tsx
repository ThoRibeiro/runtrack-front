import { lightTheme } from '@runtrack/ui';
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
        {/*
          Deux formats parce qu'ils ne servent pas au même moment : le SVG pour
          un navigateur qui l'accepte — net à toutes les tailles —, le PNG en
          repli, et l'icône Apple pour un raccourci ajouté à l'écran d'accueil.
          Les trois sortent du même tracé que le composant `Logo`, via
          `pnpm logo`.
        */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/*
          La barre du navigateur prend la couleur de marque du thème clair, lue
          au même endroit que le reste de l'interface : recopier le code
          hexadécimal ici, c'est le laisser diverger au premier changement.
        */}
        <meta name="theme-color" content={lightTheme.colours.brand.solid} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
