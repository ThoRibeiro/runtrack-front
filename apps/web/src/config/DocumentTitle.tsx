import { usePathname } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

/**
 * Le titre du document, à chaque changement de route (§5).
 *
 * « Dans une application à page unique, sans ça, le lecteur d'écran ne dit rien
 * du tout quand on navigue. » C'est aussi le critère WCAG 2.4.2, que
 * `@axe-core/playwright` a trouvé violé : l'export statique contient **deux**
 * balises `<title>` — celle du document et une vide, injectée par le
 * gestionnaire de `<head>` du routeur — et c'est la vide qui compte.
 *
 * Écrire `document.title` remplit la première, et rend la chose explicite
 * plutôt que dépendante de l'ordre dans lequel deux bibliothèques posent leurs
 * balises. Le libellé vit ici, dans la coque, parce que c'est elle qui possède
 * les routes.
 */
const TITLES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/sign-in/, title: 'Connexion' },
  { pattern: /^\/sign-up/, title: 'Créer un compte' },
  { pattern: /^\/forgot-password/, title: 'Mot de passe oublié' },
  { pattern: /^\/reset-password/, title: 'Nouveau mot de passe' },
  { pattern: /^\/verify-email/, title: 'Confirmation d’adresse' },
  { pattern: /^\/notifications\/preferences/, title: 'Préférences de notification' },
  { pattern: /^\/notifications/, title: 'Notifications' },
  { pattern: /^\/profile/, title: 'Profil' },
  { pattern: /^\/social/, title: 'Social' },
  { pattern: /^\/follow-requests/, title: 'Demandes d’abonnement' },
  { pattern: /^\/shared\//, title: 'Course partagée' },
  { pattern: /^\/activity\/[^/]+\/live/, title: 'Course en direct' },
  { pattern: /^\/activity\//, title: 'Course' },
  { pattern: /^\/$/, title: 'Accueil' },
];

export function titleFor(pathname: string): string {
  const matched = TITLES.find((candidate) => candidate.pattern.test(pathname));
  return matched === undefined ? 'RunTrack' : `${matched.title} — RunTrack`;
}

export function DocumentTitle({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = titleFor(pathname);
  }, [pathname]);

  return children;
}
