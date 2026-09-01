# Lot 9 — L'enregistreur : les décisions

_Écrit le 2026-09-01._

---

## 1. La tâche d'arrière-plan écrit elle-même quand personne n'écoute

C'est la décision qui tient la promesse du §6 — « une application tuée par le système ne
doit rien perdre » — et elle n'est pas évidente.

Sur les deux plateformes, les positions sont livrées à une **tâche**, pas à un composant.
Tant que l'application vit, cette tâche peut passer les points à qui les attend. Mais quand
le système a tué l'application et relance **uniquement le JavaScript** pour exécuter la
tâche, personne n'écoute : le module vient d'être ré-importé, l'enregistreur n'existe pas,
et le point serait jeté.

La tâche a donc deux modes, et `backgroundLocation.ts` tranche entre eux : **livrer s'il y
a quelqu'un, écrire s'il n'y a personne**. Le chemin d'écriture n'a besoin de rien d'autre
que le tampon — la course en cours est dans sa propre table, le numéro de séquence vient de
lui, et l'envoi est le problème de plus tard. C'est exactement pour ça que le §6 met le
tampon avant le réseau.

## 2. Le tampon est testé contre un vrai SQLite, pas contre une doublure

Le §13 nomme le tampon en premier « parce que ça casse en silence » : kill de l'app,
reprise, rejeu, purge après accusé. Une doublure ne prouve rien de tout ça — ce qui casse
dans un tampon d'écriture, c'est le **SQL** : un `<` là où il faut un `<=`, un compteur
qu'une purge remet à zéro.

`sql.js` — SQLite compilé en WebAssembly, dépendance de développement, aucune compilation
native — donne le vrai moteur. Le test du kill ferme la base, la rouvre **sur les mêmes
octets** et vérifie que les points sont là et que la numérotation reprend où elle en était.

Deux colonnes portent plus que leur poids, et les tests les gardent :

- **`next_sequence` vit à côté de la course, pas en mémoire.** §6 : le numéro doit survivre
  à un kill parce que c'est lui qui porte l'idempotence côté serveur. Une application
  relancée qui recommencerait à zéro verrait ses points rejetés comme des doublons, en
  silence, pour le reste de la course ;
- **une purge n'y touche jamais.** Purger parle de ce que le serveur a accusé ; numéroter
  parle de ce que le téléphone a capté. Lier les deux est la façon classique de perdre une
  course dans un tunnel.

## 3. Mettre en pause coupe le GPS

`Recorder.pause()` arrête le suivi, `resume()` le relance. Ce n'était pas le cas avant ce
lot, et les deux raisons sont dans le cahier des charges : une pause est un feu rouge ou
une fontaine, et garder un fix de qualité navigation pendant ce temps dépense de la
batterie pour une trace que personne ne veut ; surtout, **le serveur refuse les points
d'une course en pause**, donc enregistrer quand même remplirait le tampon de rejets et
viderait de son sens l'avertissement du §6.

## 4. Le battement d'envoi appartient à la coque, le découpage à l'hexagone

`Recorder.flush()` sait découper en lots de mille et purger jusqu'à `lastAcceptedSequence`.
Il ne sait pas **quand** — c'est un minuteur et un écouteur de connectivité, deux choses de
plateforme. Le store porte donc le battement de sept secondes (§6 : « toutes les 5 à 10
secondes ») et l'écoute du retour réseau.

`NetworkMonitor` ne signale que le **front** hors-ligne → en ligne. Un écouteur brut se
déclenche à chaque changement, y compris entre deux antennes en zone blanche, et réveiller
la radio pour ça ne sert à rien.

Un envoi qui échoue **n'est pas remonté à l'écran** : les points restent au tampon et
repartent au battement suivant, sous la même clé d'idempotence dérivée. C'est toute
l'histoire du hors-ligne du §9, et afficher une erreur pour ça apprendrait au coureur à
ignorer les erreurs.

## 5. Ce que l'écran de course affiche vient du serveur, sauf la durée

Distance, allure et dénivelé sont **les chiffres du serveur**, renvoyés à chaque ingestion :
il filtre les points improbables et lisse le dénivelé, donc une distance calculée sur le
téléphone diverge de celle que la course aura à la fin. Mieux vaut la vérité avec sept
secondes de retard qu'un nombre qui sera corrigé plus tard.

La **durée** est locale et avance à la seconde : sinon elle sauterait par pas de sept
secondes, ce qui se lit comme un écran figé. C'est aussi la seule chose qui re-rend sur cet
écran — §14 : une mise à jour d'interface par seconde au maximum, quoi que fasse le GPS.

## 6. Le résumé de fin est l'écran de course

Le §10 liste « préparation, en cours, pause, résumé de fin ». Les trois premiers sont des
écrans à part ; le quatrième **est** l'écran de course du lot 7 — carte, splits, tuiles de
statistiques — vers lequel on navigue en terminant. Écrire un second écran qui montre les
mêmes chiffres autrement, c'est deux écrans à maintenir et deux occasions de diverger.

## 7. Le web n'en parle pas, et ne l'embarque pas

§2 : « Le web n'affiche jamais un bouton "démarrer une course" grisé avec une infobulle. »
Ici, cela va plus loin qu'un bouton absent :

- `Runtime.recording` vaut `undefined` sur le web, et le store **lève** si on le construit
  quand même. Une capacité absente est un type, pas une condition à l'exécution ;
- l'onglet « Courir » n'existe que dans la coque mobile — quatre onglets sur mobile, trois
  sur le web ;
- et l'enregistrement est sorti des index partagés. `@runtrack/features/recording` et
  `@runtrack/adapters/recording/native` sont des points d'entrée séparés, parce que tout ce
  qu'un index exporte finit dans le bundle web : sans ça, un navigateur embarquait un
  tampon SQLite qu'il n'ouvrira jamais.

Le budget mesure la différence : **146 Ko applicatifs sur 250**, contre 141 avant ce lot.
Les cinq kilo-octets restants sont le catalogue de traductions et l'hexagone, que les deux
coques partagent pour de bon.

## 8. Les autorisations, et le moment où on les demande

§6 : la permission « toujours » se demande **quand le coureur démarre sa première course,
avec une explication avant la boîte de dialogue système**. La boîte système ne se rejoue
pas : un refus sur une invite que personne n'a comprise ne se reprend qu'en passant par les
réglages. L'écran de préparation est donc d'abord une explication, et le bouton
« Démarrer » est ce qui déclenche la demande.

Deux détails de plateforme qui coûtent une course quand on les rate :

- **Android refuse d'afficher la boîte d'arrière-plan** tant que le premier plan n'est pas
  accordé. Demander l'arrière-plan d'abord rend « refusé » sans que personne n'ait rien vu ;
- **`pausesUpdatesAutomatically` est désactivé.** iOS décide volontiers qu'un coureur arrêté
  au feu a fini de bouger et cesse de livrer. Il reprend plus tard, et la trace a un trou.

## 9. Ce qui n'est pas vérifié ici, et ne peut pas l'être

C'est le lot où l'écart entre « les tests passent » et « ça marche » est le plus grand. Ce
qui est prouvé : le tampon contre un vrai moteur SQLite, l'orchestration du `Recorder`, le
battement d'envoi, l'écran. Ce qui **demande un appareil** :

- que le **service de premier plan** Android tienne trois heures écran verrouillé ;
- que **iOS relance l'application dans la tâche** après l'avoir tuée, et que les points
  écrits alors soient bien là au retour ;
- la **consommation batterie** sur une heure de course — §14 fixe la limite, et 20 % en une
  heure signifie que personne ne s'en sert deux fois ;
- le comportement **dans le métro**, qui est le scénario que tout ceci existe pour tenir.

Rien de tout cela ne se simule dans jest, et le prétendre serait pire que de l'écrire ici.
C'est la première chose à faire sur un _dev build_, avant le lot 10.

## 10. Couverture

| Paquet               | Tests                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `@runtrack/core`     | 237 — dont la pause qui coupe le GPS                               |
| `@runtrack/api`      | 238                                                                |
| `@runtrack/ui`       | 168                                                                |
| `@runtrack/adapters` | 76 — dont 21 sur le tampon, contre un vrai SQLite                  |
| `@runtrack/features` | 123 — dont 13 sur l'enregistreur, du refus de permission au tampon |
