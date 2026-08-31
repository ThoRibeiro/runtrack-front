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

**Lot 1 livré** : monorepo, TypeScript strict, lint, CI, les deux coques démarrent sur un
écran vide, décisions écrites.

Reste les lots 2 à 13, à commencer par le **design system** — aucun écran ne s'écrit avant
sa fin.
