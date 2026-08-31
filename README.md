# RunTrack — front

Client web, iOS et Android du back-end [RunTrack](../runtrack). Un seul code, trois cibles :
Expo (React Native) + `react-native-web`, monorepo pnpm + Turborepo.

Le cahier des charges est `~/Desktop/prompt-front-runtrack.md`, découpé en 13 lots livrés
un par un. Les décisions de chaque lot sont dans `docs/decisions-lot-*.md`.

## Démarrer

La machine a un `node` 14 par défaut : **Volta épingle Node 22.21.1 et pnpm 10.29.2** dans
le `package.json` racine, et bascule tout seul dans ce dossier. Sans lui, `pnpm` refuse de
démarrer sur un message qui ne dit pas que le coupable est le Node du PATH.

```bash
pnpm install
pnpm mobile     # Expo — iOS + Android
pnpm web        # react-native-web, sur http://localhost:8081
```

La **galerie du design system** — tous les composants, tous leurs états, les trois thèmes —
est sur `/gallery` en développement. Elle est retirée du bundle de production.

## Vérifier

```bash
pnpm verify     # lint + typecheck + tests, ce que la CI exécute
```

## Structure

```
apps/
├── mobile/     Expo — iOS + Android. Seule cible qui enregistre une course.
└── web/        react-native-web + Expo Router. Consultation, et les pages publiques.
packages/
├── core/       L'HEXAGONE. Zéro React, zéro Expo, zéro DOM, zéro dépendance.
├── adapters/   Les implémentations des ports, par plateforme.
├── ui/         Design system : tokens, composants, primitives d'animation.
├── api/        Client HTTP et types générés depuis l'OpenAPI.
└── features/   Les écrans, découpés par domaine.
```

`packages/core` ne connaît aucune plateforme, et **trois gardes indépendantes** le
vérifient — une règle de lint, un `tsconfig` sans `lib.dom` ni `@types`, et un test. Le
détail est dans [`docs/decisions-lot-1.md`](docs/decisions-lot-1.md).

## État

**Lots 1 à 4 livrés.**

1. Monorepo, TypeScript strict, lint, CI, les deux coques démarrent sur un écran vide.
2. Design system : tokens (couleur, espace, typo, mouvement, dimensions), les trois thèmes
   déclarés token par token, 36 composants, les primitives d'animation, la galerie et
   **166 tests** — dont 119 assertions de contraste sur les trois thèmes.

3. `packages/core` : le domaine, les calculs purs, les cas d'usage et **onze ports**.
   **194 tests, 99,3 % ligne et 96,2 % branche** — le seuil est à 90 %.

Trois valeurs de couleur du cahier des charges ont été corrigées parce que le test de
contraste les a trouvées sous le seuil AA ([`docs/decisions-lot-2.md`](docs/decisions-lot-2.md)),
et les chemins d'API du §0 ne sont pas ceux du back-end livré
([`docs/decisions-lot-3.md`](docs/decisions-lot-3.md), §1).

4. `packages/api` : types générés depuis l'OpenAPI, client HTTP, erreurs `problem+json`
   lues par leur `code`, et **le refresh unique du §11**. 97 tests, plus 65 assertions qui
   vérifient que le contrat du serveur n'a pas bougé.

Reste les lots 5 à 13. Le prochain est l'**authentification de bout en bout**, sur les deux
cibles, avec stockage sécurisé.
