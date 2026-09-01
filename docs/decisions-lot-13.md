# Lot 13 — Mesures, accessibilité et livraison : les décisions

_Écrit le 2026-09-01._

---

## 1. Ce lot a trouvé six vrais défauts, et c'est son intérêt

La suite de bout en bout n'a pas confirmé un travail déjà fait : elle a échoué six fois au
premier passage, sur des choses qu'aucun test unitaire ne pouvait voir.

- **`autocomplete="password"` n'est pas une valeur HTML.** Les valeurs sont
  `current-password` et `new-password`. Un gestionnaire de mots de passe ne savait pas quoi
  faire du champ de connexion, et axe le classait « serious » ;
- **`lang="fr"` manquait sur le document.** La clé `web.lang` d'`app.json` ne pose que le
  titre de l'onglet, pas l'attribut. Sans lui, un lecteur d'écran lit du français avec une
  voix anglaise. Corrigé par un `+html.tsx` ;
- **aucune page n'avait de titre** — WCAG 2.4.2. Pire, l'export contient **deux** balises
  `<title>` : celle du document et une vide, injectée par le gestionnaire de `<head>` du
  routeur, et c'est la vide qui compte. `DocumentTitle` écrit `document.title` à chaque
  changement de route, ce qui règle le critère **et** l'exigence du §5 (« un changement de
  route annonce le nouveau titre ») ;
- **une route inconnue levait une erreur React (#418)**, une erreur d'hydratation de l'écran
  interne du routeur. Un `+not-found.tsx` sur les deux coques ;
- **le LCP dépasse le budget** — voir §3 ;
- et le premier passage a servi à découvrir tout cela, ce qu'aucune relecture n'aurait fait.

Ce sont exactement les régressions que le §5 dit qu'un outil automatique attrape : un
attribut mal orthographié, un libellé perdu dans un refactor, un contraste changé par une
retouche de token.

## 2. La suite tourne contre l'export de production, sans back-end

Deux décisions liées :

- **contre `dist`, pas contre le serveur de développement.** Les budgets du §14 et les
  contrastes du §5 sont des propriétés de ce qui est livré, et un bundle de développement
  en diffère sur les deux ;
- **le réseau est intercepté.** L'objectif est l'écran, son contraste et son ordre de
  tabulation — pas le serveur, qui a ses propres tests. Une suite qui demande une base de
  données en marche est une suite que personne ne lance, et une suite qu'on ne lance pas
  ne protège rien.

La logique des écrans, elle, reste testée dans `packages/features` avec une doublure de
runtime : bien plus vite et bien plus précisément qu'un navigateur ne le permet. Ce que
seul un navigateur prouve, c'est que l'export **démarre**, que le routeur résout, que les
polices et les styles arrivent, et qu'on passe d'un écran au suivant.

## 3. Le budget LCP du §14 n'est pas tenu, et le dire vaut mieux que le maquiller

**Mesuré sur l'export de production, en 4G simulée : 4 620 / 4 604 / 4 604 ms.** Stable.
Sans bridage : **192 ms**. L'écart est donc du transfert, pas du rendu.

Le §14 vise 2 500 ms. Il est hors d'atteinte, et pour la même raison que le budget de bundle
du lot 6 : **641 Ko compressés à 200 Ko/s font 3,2 s de téléchargement à eux seuls**, dont
495 Ko de plancher de pile — React, react-native-web, Reanimated, gesture-handler,
react-native-svg, FlashList, que les §1 et §4 imposent. Une coque **vide** dépasserait déjà
les 2,5 s.

Ce qui reste possible est hors du code applicatif : HTTP/2, Brotli plutôt que gzip, un CDN
proche du visiteur, et le découpage par route le jour où `asyncRoutes` d'Expo Router sera
stable. Aucun ne se décide ici.

Le test assert donc un **plafond** (6 s) et non le budget, comme détecteur de régression sur
une machine dont le processeur est partagé — et il journalise le jour où le budget serait
tenu, plutôt que de rester muet. Les deux nombres, la mesure et la raison sont dans
`perf/budget.json`, à côté du plancher de bundle qu'ils prolongent.

`pnpm lcp` refait la mesure en trois passages bridés et un sans bridage : c'est l'écart
entre les deux qui dit où part le temps.

## 4. Ce que je n'ai pas pu faire, et qui reste dû

C'est la partie la plus importante de ce document, parce que le §13 demande explicitement
des choses qui ne se simulent pas.

**La passe manuelle VoiceOver / TalkBack n'a pas eu lieu.** Le §5 est catégorique : les
outils automatiques couvrent environ un tiers des critères, et « aucun outil automatique
n'attrape "les quatre fragments décousus" ». Les regroupements d'annonce ont été écrits avec
soin et sont vérifiés par des assertions de libellé dans 180 tests d'écran — mais vérifier
qu'un libellé est présent n'est pas l'écouter. **Cette passe est due avant toute mise en
ligne**, rideau d'écran activé, sur le chemin critique.

**La fluidité n'a pas été mesurée au profileur.** Le §4 demande 60 images par seconde
plancher, mesurées **fil JS chargé** — pendant qu'une course tourne et qu'un flux SSE
arrive à la seconde. L'architecture est construite pour : la carte est pilotée
impérativement, le direct ne provoque qu'un rendu par seconde, les animations sont sur le
fil d'interface. Mais « construit pour » n'est pas « mesuré », et seul un appareil le dira.

**Les parcours Maestro sont écrits, jamais exécutés.**
`apps/mobile/.maestro/record-a-run.yaml` couvre le chemin critique du §6 et
`talkback-critical-path.yaml` le fait en ne désignant que des noms accessibles — ce qui
prouve qu'un lecteur d'écran aurait trouvé chaque cible. Les deux demandent un _dev build_
(`expo-location`, `expo-sqlite` et `react-native-maps` sont natifs, absents d'Expo Go) et un
appareil. Les commandes sont en tête de chaque fichier.

**Les builds iOS et Android n'ont pas été produits.** Ils demandent Xcode, un SDK Android ou
un projet EAS. Le build **web** de production, lui, est produit et mesuré à chaque CI.

**Il n'y a pas de captures d'écran.** Elles demandent un simulateur.

## 5. Ce que la CI fait désormais tomber

Au lint, aux types, aux tests, au format et au budget de bundle s'ajoutent :

- **zéro violation axe** sur les pages publiques, en WCAG 2.0/2.1/2.2 niveau AA ;
- **la langue du document** et **le focus visible au clavier** ;
- **l'ordre de tabulation** du formulaire de connexion ;
- **aucune erreur de console** au démarrage, et aucune sur une route inconnue ;
- **le plafond de LCP**.

Ces garde-fous existent parce que, comme le dit le §5, « les bonnes intentions ne survivent
pas à trois sprints ».

## 6. Couverture, au terme des treize lots

| Paquet               | Tests                                  |
| -------------------- | -------------------------------------- |
| `@runtrack/core`     | 237 — 98,6 % ligne, seuil à 90 %       |
| `@runtrack/api`      | 273                                    |
| `@runtrack/ui`       | 168 — dont 119 assertions de contraste |
| `@runtrack/adapters` | 86                                     |
| `@runtrack/features` | 180                                    |
| bout-en-bout web     | 12, dont 3 audits axe                  |

**956 tests.** Budget web : 159 Ko applicatifs sur 250, plus 273 Ko différés.
