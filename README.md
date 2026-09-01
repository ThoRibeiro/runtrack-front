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

**Lots 1 à 10 livrés.**

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

5. **Authentification de bout en bout** sur les deux cibles : inscription, connexion, mot
   de passe oublié, réinitialisation, confirmation d'adresse. Stockage sécurisé — Keychain
   et Keystore sur mobile, session **chiffrée** sur le web, jamais `localStorage`. Couche
   d'internationalisation, et une phrase par code d'erreur dont l'exhaustivité est prouvée
   à la compilation.

6. **Consultation** : accueil, fil, course, profil, recherche, demandes d'abonnement.
   Listes virtualisées, pagination par curseur, barre d'onglets. 90 tests.

7. **La carte** : le port `MapRenderer` et ses **deux adaptateurs** — `react-native-maps`
   sur mobile, MapLibre GL sur le web —, la trace décodée par tranches sans jamais tenir le
   fil plus d'une image, le cadrage automatique, les **repères kilométriques cliquables**,
   et le suivi qui rend la vue à l'utilisateur dès qu'il y touche.

   La logique de la carte vit dans l'hexagone et pilote le rendu **de façon impérative** :
   une position par seconde ne re-rend pas l'arbre
   ([`docs/decisions-lot-7.md`](docs/decisions-lot-7.md), §4).

8. **Le direct** : SSE avec ses deux transports — corps de `fetch` en flux dans un
   navigateur, `XMLHttpRequest` en React Native —, reprise par `Last-Event-ID`, instantané
   dessiné d'un coup, doublons ignorés, reconnexion à recul exponentiel avec jitter.

   `EventSource` n'est pas utilisé : **il ne sait pas porter d'en-tête**, et le flux est
   authentifié comme le reste ([`docs/decisions-lot-8.md`](docs/decisions-lot-8.md), §1).
   Un `position` par seconde pendant trois heures ne provoque **aucun rendu** : la carte est
   nourrie impérativement, et le bandeau rend au plus une fois par seconde.

9. **L'enregistreur** (mobile) : permission « toujours » demandée au bon moment, service de
   premier plan Android, modes d'arrière-plan iOS, **tampon SQLite** écrit avant tout envoi,
   lots idempotents toutes les sept secondes ou au retour du réseau, et reprise d'une course
   qu'un crash a laissée. L'écran porte le **thème de course** (§3) et lui seul.

   La tâche d'arrière-plan **écrit elle-même dans SQLite quand l'application a été tuée** :
   c'est ce qui tient la promesse du §6
   ([`docs/decisions-lot-9.md`](docs/decisions-lot-9.md), §1). Le tampon est testé contre un
   vrai moteur SQLite, kill de l'application compris.

10. **Les notifications** : boîte de réception paginée, pastille de non-lues, **second flux
    SSE** partageant sa mécanique avec celui des courses, préférences par nature, heures
    calmes avec fuseau, appareils, et **liens profonds** — une notification touchée ouvre
    l'écran qu'elle annonce, application fermée comprise.

    La permission push se demande **après** avoir montré ce qu'elle apporte, jamais au
    lancement : la boîte système est à un coup
    ([`docs/decisions-lot-10.md`](docs/decisions-lot-10.md), §3). Au premier plan, rien
    n'affiche de bannière — la pastille et l'écran concerné suffisent.

Le budget de bundle du §14 est **plafonné sur le poids ajouté** par le code applicatif —
le plancher de la pile imposée valant 495 Ko à lui seul — et porte sur le **bundle
initial** : MapLibre est chargé à la demande, dans un morceau séparé qui n'arrive qu'à
l'ouverture d'une course. `pnpm budget` le vérifie, et la CI casse au-delà : **150 Ko
applicatifs sur 250** à ce stade, plus 273 Ko différés.

Avant une mise en production, il manque un **fournisseur de tuiles** :
`EXPO_PUBLIC_MAP_STYLE_URL` vaut par défaut le style de démonstration de MapLibre.

**L'enregistreur demande un appareil.** Service de premier plan tenu trois heures, relance
par le système après un kill, batterie sur une heure de course : rien de tout cela ne se
simule, et c'est la première chose à faire sur un _dev build_
([`docs/decisions-lot-9.md`](docs/decisions-lot-9.md), §9).

Reste les lots 11 à 13. Le prochain est **l'engagement et le partage** : likes,
commentaires, liens de partage, et les pages publiques web sans compte.
