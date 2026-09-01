# Lot 7 — La carte : les décisions

_Écrit le 2026-09-01._

---

## 1. « Hors du fil principal » : l'écart assumé, et sa mesure

Le §8 demande qu'une longue trace soit décodée **hors du fil principal**. Pris à la
lettre, cela veut dire un `Worker` sur le web et un runtime de worklets sur mobile — et
les deux ne savent exécuter que du code **autonome**, ce que le décodeur de l'hexagone
n'est pas : c'est un module, avec une fonction d'aide et une constante à côté.

L'envoyer dans un worker demanderait donc soit de sérialiser un graphe de modules à
l'exécution — fragile, et cassé en silence par la minification —, soit de **réécrire
l'arithmétique une seconde fois** dans un fichier de worker. Un décodeur dupliqué que rien
n'oblige à rester synchrone avec l'original est un bug plus cher que celui qu'on évite.

Le fil n'est donc pas _quitté_, il est **rendu** : `ChunkedTrackDecoder` décode par tranches
d'au plus 2 ms et rend la main à la boucle d'événements entre deux tranches, le temps qu'une
image soit peinte. Ce que le §8 protège — « dix mille points bloquent l'UI » — est un budget
d'image, et il est tenu : `map.perf.test.ts` **mesure** la plus longue tranche sur une trace
de dix mille points et casse le build au-delà d'une image à 60 Hz.

C'est un écart à la lettre du cahier des charges, pas à son intention. Et il est réversible
sans rien réécrire : `TrackDecoder` est un port, un vrai worker se brancherait dessus le
jour où un profil montre que ça vaut le coup. C'est précisément pour ça que le port existe.

## 2. Deux adaptateurs, deux points d'entrée — surtout pas un `Platform.OS`

`secureStoreForPlatform()` choisit son implémentation à l'exécution, et c'est très bien :
les deux tiennent en quelques kilo-octets. Pour la carte, ce serait une faute — **MapLibre
pèse 273 Ko compressés**, et un test à l'exécution laisse les deux implémentations dans les
deux bundles. Un téléphone n'a rien à faire d'une carte WebGL, et réciproquement.

Les surfaces vivent donc derrière `@runtrack/adapters/map/native` et
`@runtrack/adapters/map/web`, et **chaque coque importe la sienne** dans son
`config/runtime.ts`. Le `Runtime` porte le composant ; un écran reçoit une carte, il n'en
choisit jamais une.

## 3. Le budget du §14, et ce que « bundle initial » veut dire

MapLibre est chargé par un `import()` différé. Metro en fait un morceau séparé, et la
mesure le confirme : **entrée 631 Ko, dont 136 Ko applicatifs sur 250** — la carte coûte
6 Ko au premier chargement — plus un morceau de 273 Ko qui n'arrive qu'à l'ouverture d'une
course.

`scripts/check-web-budget.mjs` ne sommait que tous les `.js` du dossier, ce qui aurait fait
tomber le build sur un poids que personne ne télécharge au démarrage. Il pèse désormais
**l'entrée** — le mot du §14 — et **liste les morceaux différés à côté**, hors budget mais
visibles. Cacher un chunk n'est pas l'objectif ; ne pas facturer le LCP de l'accueil du
poids d'un écran qu'on n'a pas ouvert, si.

## 4. La carte est impérative, et sa logique est dans l'hexagone

`ActivityMapPresenter` vit dans `packages/core`. C'est lui qui décide ce que la carte
affiche : la trace d'un coup, les marqueurs, le cadrage, le suivi, le kilomètre qu'on
cadre. Deux raisons, toutes deux dans le cahier des charges :

- **§7.** Une position par seconde pendant trois heures : si chacune passait par React,
  l'arbre rendrait 10 800 fois. Le présentateur _dit_ à la carte, il ne la re-rend pas ;
- **§8.** « La carte cesse de suivre dès que l'utilisateur déplace la vue » est une petite
  machine à états avec un abonnement dedans — exactement ce qui pourrit quand c'est éparpillé
  entre un `useEffect` et deux `ref`.

Seul **le fait que le suivi s'est arrêté** repasse dans React, pour afficher le bouton
« Recentrer ». Un rendu, sur une transition que l'utilisateur a provoquée.

## 5. Ce qui compte comme « l'utilisateur a déplacé la vue »

Le piège est que `easeTo` et `animateCamera` déclenchent **les mêmes événements** que le
doigt. Une carte qui suit un coureur se libérerait donc elle-même au premier recentrage.

Chaque adaptateur distingue les deux avec ce que sa bibliothèque lui donne : MapLibre pose
un `originalEvent` sur les mouvements causés par une personne et rien sur les siens ;
`react-native-maps` porte un `isGesture` dans `onRegionChangeComplete`. Les deux sont
testés — c'est le genre de détail qui ne se voit qu'à l'usage, longtemps après.

## 6. Un bug du lot 6, trouvé en branchant les repères

L'écran affichait `kilometreIndex + 1`. Or le serveur **numérote les splits à partir de 1**
— `SplitCalculator` refuse un index inférieur — donc le premier kilomètre s'appelait
« Kilomètre 2 ». Corrigé, et le test du lot 6 qui fabriquait un split d'index 0 a été
recalé sur ce que l'API rend vraiment.

## 7. Les repères kilométriques arrivent avec les splits, pas avant

Les splits ne se chargent qu'à l'ouverture de leur section (lot 6, §5). La carte n'a donc
ses repères qu'à ce moment-là. Ouvrir « Kilomètres » et voir les bornes apparaître sur le
tracé se lit bien, mais c'est une **conséquence** de cette décision, pas une intention.

Deux détails qui en découlent :

- un **kilomètre partiel n'a pas de repère** et sa ligne n'est pas cliquable : une ligne
  qui a l'air pressable et ne fait rien est pire qu'une ligne inerte ;
- toucher un kilomètre **annonce** le déplacement (`announceForAccessibility`). La caméra
  vole ailleurs, ce qui est parfaitement silencieux pour un lecteur d'écran.

## 8. Le dernier kilomètre tombait à l'eau

Le serveur mesure les splits sur les points bruts ; le client marche une polyline arrondie
à cinq décimales. Sur deux kilomètres, les deux longueurs diffèrent de quelques mètres — et
le repère du dernier kilomètre tombait _juste après_ le dernier point, donc n'était pas
posé du tout.

`pointAtDistance` tolère désormais un dépassement de 2 % de la longueur parcourue et rend
le dernier point. Au-delà, il rend `undefined` : une trace dont les points ont été purgés
est remplacée par une polyline plus grossière, et à ce moment-là, deviner serait inventer.

## 9. Le fond de carte est une configuration, pas du code

§11 : aucune clé d'API dans le dépôt. L'URL du style vient donc de
`EXPO_PUBLIC_MAP_STYLE_URL`, et le repli est le style de démonstration de MapLibre — sans
clé, suffisant pour développer, et manifestement pas un fond de carte de production.

**Ce qui reste à faire avant une mise en production** : choisir un fournisseur de tuiles et
poser la variable. Rien d'autre ne change.

## 10. Ce que les tests ne couvrent pas, et pourquoi

Les deux moteurs de rendu sont testés contre une doublure — 51 tests d'adaptateurs — parce
qu'une décision (quand redessiner, quoi déplacer plutôt que reconstruire, ce qui libère le
suivi) est testable, et qu'un canvas WebGL ne l'est pas. Ce qui n'est **pas** vérifié ici :

- que `react-native-maps` s'affiche sur un appareil : il demande un _dev build_, pas Expo
  Go, et ça se vérifie sur un téléphone ;
- que les tuiles se chargent : c'est le fournisseur du §9 ci-dessus ;
- la fluidité pendant un flux SSE — c'est le lot 8, au profileur, fil JS chargé.

## 11. Couverture

| Paquet               | Tests                               |
| -------------------- | ----------------------------------- |
| `@runtrack/core`     | 231 — 99,1 % ligne, 96,2 % branche  |
| `@runtrack/api`      | 195                                 |
| `@runtrack/ui`       | 166                                 |
| `@runtrack/adapters` | 51, dont la mesure de tranche du §1 |
| `@runtrack/features` | 99                                  |
