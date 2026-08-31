# `@runtrack/ui` — design system

**Livré au lot 2.** Rien ne s'écrit ici avant : les tokens d'abord, les composants
ensuite, les écrans jamais avant la fin du lot.

Contenu attendu :

- `src/tokens/` — couleur, espace, rayon, typographie **et mouvement** (durées, courbes).
  Seul dossier du dépôt autorisé à écrire une valeur littérale : la règle
  `no-restricted-syntax` d'`eslint.config.mjs` l'y limite explicitement ;
- `src/theme/` — les trois thèmes déclarés token par token : clair, sombre général, et le
  **thème de course** (§3), qui n'est pas une inversion du clair ;
- `src/components/` — une implémentation unique pour les trois cibles ;
- `src/motion/` — `Pressable`, `Sheet`, `Skeleton` et les transitions de liste, sur le fil
  d'interface (Reanimated), jamais sur l'état React ;
- `src/gallery/` — l'écran de galerie qui montre tous les états, y compris les moches.
