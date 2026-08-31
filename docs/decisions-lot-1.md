# Lot 1 — Squelette : les décisions

_Écrit le 2026-08-31. Ce document tranche ce que le cahier des charges laisse ouvert. Une
décision qui n'est plus vraie se corrige ici, pas dans un commentaire de code._

---

## 1. Stratégie de navigation

**Expo Router, deux arbres de routes distincts, des routes fines.**

Chaque coque a son propre dossier `src/app/`. Les écrans, eux, sont écrits **une seule
fois** dans `packages/features` ; une route ne fait que pointer vers l'un d'eux.

Pourquoi deux arbres plutôt qu'un seul partagé avec des gardes `Platform.OS` :

- le §2 exige que le web **ne parle pas** de l'enregistreur. Un arbre unique gardé à
  l'exécution embarque quand même l'enregistreur dans le bundle web — donc son GPS, son
  SQLite et son service de premier plan — et fait grossir le bundle initial que le §14
  plafonne à 250 Ko ;
- la divergence devient **lisible dans l'arborescence** : `apps/web/src/app/` n'a pas de
  `record/`, et il a en plus `shared/[token]/`. On voit ce que le web n'a pas sans lire
  une seule ligne de code ;
- le coût est faible : une route fait trois lignes.

Réglages retenus : `typedRoutes` (les liens profonds du §11 sont vérifiés à la
compilation), `reactCompiler` (moins de rendus, ce que le §14 demande), et `output:
"static"` sur le web pour que `/shared/{token}` soit servi sans exécution serveur.

Un `scheme` `runtrack://` est déclaré des deux côtés : c'est ce qui rend les liens
profonds du §11 possibles, y compris application fermée.

## 2. Forme des tokens

**Des objets TypeScript `as const` dans `packages/ui/src/tokens`, exposés par un thème et
consommés par un hook.** Ni variables CSS, ni objet de style global.

- une **couche primitive** (la palette : `brand500`, `brand600`, `neutral0`…) nommée par
  ce qu'elle _est_ ;
- une **couche sémantique**, redéclarée **token par token pour chacun des trois thèmes** —
  clair, sombre général, thème de course. Le §3 est explicite : ce n'est pas une inversion
  automatique, parce qu'un dénivelé violet sur fond noir ne veut plus rien dire ;
- l'accès se fait par `useTheme()`, seul point qui sait quel thème est actif. L'écran
  d'enregistrement force le thème de course, et lui seul.

Le mouvement (durées `fast` / `base` / `slow`, courbes) est un token **au même titre que
les couleurs**, dans le même dossier — c'est ce que dit le §4, et c'est ce qui empêche
douze ressorts légèrement différents.

Deux garde-fous, déjà en place :

- une règle `no-restricted-syntax` interdit toute couleur littérale (`#…`, `rgb(`, `hsl(`)
  et toute valeur d'espacement, de rayon ou de typographie écrite en clair, **partout sauf
  dans `packages/ui/src/tokens`** ;
- le test de contraste du §5 parcourra les paires déclarées du thème. Il arrive avec les
  tokens, au lot 2.

**Deux oranges, et ce n'est pas négociable** : `brand-500` pour les remplissages, anneaux,
tracés et icônes ; `brand-600` dès qu'il s'agit de **texte** sur fond clair. Les noms
sémantiques le rendent difficile à confondre.

## 3. La frontière exacte de `packages/core`

**`core` n'importe que lui-même.** Tout ce qui n'est pas un chemin relatif est, par
définition, le monde extérieur : React, Expo, le DOM, Node, le réseau, une bibliothèque
de dates — et jusqu'aux autres paquets du dépôt.

Concrètement, `core` contient : les modèles et les règles du domaine, les calculs purs,
les cas d'usage, et les **ports** qu'ils appellent. Il ne contient aucune implémentation,
aucun appel réseau, aucun accès au stockage, aucune permission, aucune horloge système.

**Trois gardes indépendantes**, parce qu'une seule finit toujours par être contournée :

| Garde                                                | Où                  | Ce qu'elle attrape                                                                     |
| ---------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| `no-restricted-imports` avec `regex: '^[^.]'`        | `eslint.config.mjs` | tout import non relatif dans `core/src`                                                |
| `tsconfig.src.json` : `lib: ["ES2022"]`, `types: []` | `packages/core`     | `fetch`, `localStorage`, `EventSource`, `process`, `window` — ils ne **compilent** pas |
| `src/hexagon.guard.test.ts`                          | la suite de tests   | le même contrôle, dans le harnais qui garde le merge                                   |

La deuxième est la plus intéressante : sans `lib.dom` et sans `@types`, la faute n'est pas
signalée, elle est **impossible**. `tsconfig.json` reste permissif pour l'éditeur et pour
les tests ; c'est `tsconfig.src.json` qui tient la frontière, et c'est lui que la CI
exécute.

`Date` est interdit aussi, `new Date()` comme `Date.now()` : le temps entre par le port
`Clock`. Sans lui, aucun des tests temporels que le §13 réclame — dérive d'horloge,
absence de heartbeat pendant 45 s, expiration du jeton — n'est écrivable.

Les huit ports du §2 sont déclarés au **lot 3**, avec le domaine qu'ils manipulent. Le lot
1 n'en livre qu'un, `Clock`, parce qu'il ne dépend d'aucun modèle et qu'il sert de preuve
que la frontière tient.

## 4. Découpage à l'intérieur des paquets

Le §2 demande un découpage de premier niveau **fonctionnel, comme au back-end**, et
présente pourtant `core/{domain,usecases,ports}`. Les deux se concilient de la façon dont
le back-end le fait déjà : **domaine d'abord, technique ensuite**.

```
packages/core/src/
├── activity/{domain,usecases,ports}
├── auth/{domain,usecases,ports}
├── …
└── shared/          ce qui ne relève d'aucun domaine — le temps, les identifiants
```

C'est la structure de `runtrack-course/` côté serveur (`usecases/{model,service,port}`), à
un renommage près. Un relecteur qui connaît le back-end s'y retrouve sans traduction.

## 5. Toolchain — deux écarts à signaler

**TypeScript 6.0.3 et non 7.x.** TypeScript 7 est sorti, mais `typescript-eslint` plafonne
à `<6.1.0` : passer en 7 ferait tomber **toutes** les règles typées, dont la règle
d'isolation de `core`. C'est le mauvais échange. Le template Expo SDK 57 est lui aussi en
`~6.0.3`, donc l'écart n'est pas une singularité de ce dépôt. À revoir quand
`typescript-eslint` suivra.

**`node-linker=hoisted` dans `.npmrc`.** Metro ne résout pas de façon fiable l'arbre de
liens symboliques que pnpm pose par défaut. C'est la configuration que documente Expo pour
un monorepo pnpm, et c'est aussi pour ça que chaque coque porte un `metro.config.js` qui
ajoute la racine du dépôt aux `watchFolders`.

Node **22.21.1** et pnpm **10.29.2** sont épinglés par Volta dans le `package.json`
racine ; la CI lit le même `package.json`. La machine a un `node` 14 par défaut : sans cet
épinglage, la moitié des commandes échoue sur un message qui ne dit pas pourquoi.

## 6. Le budget de bundle du §14 est intenable tel qu'il est écrit — mesuré, pas supposé

Le §14 plafonne le bundle web initial à **250 Ko compressés**. Sur l'écran **vide** du lot
1, la mesure donne :

| Configuration                                                                           | gzip                             |
| --------------------------------------------------------------------------------------- | -------------------------------- |
| export de production, tel quel                                                          | **285 Ko**                       |
| `_sitemap` retiré + `EXPO_UNSTABLE_TREE_SHAKING` + `EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH` | **282 Ko**                       |
| `experiments.asyncRoutes` sur le web                                                    | 285 Ko (aucun découpage produit) |

Il n'y a pas une ligne de code applicatif dans ces 282 Ko : c'est le plancher de React 19

- `react-native-web` + Expo Router en rendu statique. Le §1 impose cette pile, le §14
  impose ce plafond, et **les deux ne tiennent pas ensemble**.

Le lot 1 ne tranche pas à la place du commanditaire, mais il signale et il propose :

- **relever le budget à 300 Ko** pour le noyau, et plafonner à 250 Ko **le poids ajouté
  par le code applicatif** — c'est ce chiffre-là qui mesure vraiment une dérive ;
- ou **sortir les pages publiques `/shared/{token}` du bundle applicatif** : ce sont les
  seules pages ouvertes sans compte, celles où le LCP compte pour de vrai, et elles n'ont
  besoin ni du routeur complet ni de l'état client.

La mesure est à refaire au lot 13, mais elle est prise **maintenant** : découvrir au
dernier lot qu'un budget était hors d'atteinte avant même le premier écran, c'est trop
tard pour en faire quelque chose.

Deux réglages déjà appliqués, sans attendre : la route `_sitemap` d'Expo Router est
**désactivée** — elle publie l'arborescence complète des routes à qui la demande — et le
compilateur React est actif, ce qui retire des rendus sans rien coûter au bundle.

## 7. Ce que le lot 1 ne fait pas

- aucun composant, aucun écran : le §3 l'interdit avant la fin du lot 2 ;
- `packages/{ui,api,adapters,features}` sont des dossiers avec un README qui dit ce qui y
  atterrit et à quel lot. Pas de `package.json` vide : un paquet qui ne contient rien
  pollue `turbo` et ment sur l'état du projet ;
- pas de test de coque : il n'y a rien à décider dans un écran vide.
