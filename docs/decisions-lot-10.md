# Lot 10 — Notifications : les décisions

_Écrit le 2026-09-01._

---

## 1. Deux flux, une seule mécanique

Le §0 donne deux flux SSE — une course et une boîte de réception — et ils ne diffèrent que
par **leur chemin**. Tout le reste est identique : le porteur, le renouvellement unique sur
401, `Last-Event-ID`, l'assemblage des trames.

`SseSubscriber` porte cette mécanique, et `SseLiveStream` comme `SseNotificationStream` ne
font plus qu'apporter une URL. Écrire la seconde en copiant la première aurait donné deux
endroits où se tromper sur le renouvellement du §11 — et le second n'aurait pas eu les
quarante tests du premier.

## 2. Une notification qui arrive ne fait rien d'autre que rafraîchir

§12 : « l'application au premier plan **n'affiche pas** de bannière système : elle met à
jour la pastille et l'écran concerné. »

`NotificationStreamProvider` ne fait donc littéralement que cela : à l'arrivée d'un
événement, il invalide deux requêtes. La pastille change, une boîte ouverte se recharge, et
un coureur en train de lire un écran n'est pas interrompu par le système.

Il ne garde **aucun état**. Les notifications viennent de la requête de boîte, qui est de
l'état serveur : le §9 interdit de le recopier, et un flux qui tiendrait sa propre liste
serait exactement cette copie.

Le gestionnaire d'`expo-notifications` dit la même chose côté plateforme —
`shouldShowBanner: false` — pour le cas où une poussée arrive pendant que l'application est
au premier plan.

## 3. La permission push a deux moments, et les confondre est le piège

- **au lancement**, le jeton est réenregistré **si la permission existe déjà**. Il change
  tout seul — réinstallation, restauration de sauvegarde — et le serveur traite un doublon
  comme une non-opération. Rien n'est demandé, rien n'est montré ;
- **au geste**, après un écran qui a montré ce que les notifications apportent, la
  permission est demandée.

Jamais au premier lancement. La boîte de dialogue système est **à un coup** : un refus sur
une invite que personne n'a comprise ne se reprend qu'en passant par les réglages du
téléphone, et `canAskAgain` le dit — l'écran affiche alors ce chemin plutôt qu'un bouton
qui ne ferait plus rien.

Trois tests tiennent cette règle, dont celui qui vérifie qu'au lancement **rien n'est
demandé**.

## 4. Le serveur envoie une destination, la coque possède ses routes

Un lien profond voyage comme un **chemin** — `/activities/{id}/live`. L'hexagone le traduit
en destination typée (`parseDeepLink`), et chaque coque traduit la destination en route.
Trois responsabilités, trois endroits, et un `switch` que le compilateur vérifie exhaustif :
le jour où une destination s'ajoute, il montre les fichiers à modifier.

**Une destination que ce build ne sait pas lire n'ouvre rien.** Un serveur plus récent peut
en envoyer une inconnue, et ouvrir le mauvais écran est pire que n'en ouvrir aucun (§11).
Même règle pour une nature de notification inconnue : elle s'affiche quand même, avec son
lien, plutôt que de faire tomber toute la boîte.

L'application fermée et l'application en arrière-plan sont **deux cas distincts** —
`getLastNotificationResponse` pour la première, un écouteur pour la seconde. N'en traiter
qu'un est le bug classique : le lien marche quand l'application tourne, et ne marche pas
quand elle a été tuée, c'est-à-dire la plupart du temps.

## 5. La liste des natures vient du serveur

`NotificationPreferences` gagne un champ `availableTypes`, et la raison est écrite dans le
contrôleur du back-end : sans lui, l'écran de réglages tiendrait sa propre liste, qui
divergerait de celle du serveur à la première nature ajoutée — sans que personne le
remarque.

`NOTIFICATION_TYPES` reste, pour les `switch` qui doivent être exhaustifs à la compilation.
C'est l'écran qui énumère l'autre.

Deux détails du contrat, tous deux vérifiés par un test :

- le PATCH **remplace la liste entière** des natures coupées. C'est l'écran qui l'envoie, il
  connaît l'état complet, et un remplacement ne peut pas dériver comme une paire
  ajout/retrait ;
- supprimer les heures calmes s'envoie comme **`null`**, jamais comme un champ absent.
  Omettre laisserait l'ancienne plage en place, et un coureur qui les désactive resterait
  silencieux.

## 6. Le fuseau des heures calmes vient de la coque

« Pas avant 7 h » n'a de sens que là où se trouve la personne. Le fuseau est donc obligatoire
dès qu'une plage existe, et c'est la coque qui le lit — `Intl.DateTimeFormat().resolvedOptions()`.
L'hexagone fait l'arithmétique de fuseau mais ne devine pas où est le téléphone.

Deux curseurs plutôt qu'un sélecteur d'heure : un sélecteur est une modale spécifique à
chaque plateforme, avec sa propre histoire d'accessibilité, et « 22 h » à « 7 h » n'a besoin
ni de minutes ni de précision.

## 7. Deux trous du design system, trouvés en s'en servant

- **`Slider` n'avait jamais été exporté** depuis le lot 2. Le composant existait, testé et
  documenté, et rien ne pouvait l'importer. Il l'est maintenant, et il est dans la galerie ;
- **`Avatar` n'avait pas de `decorative`.** Dans une ligne de boîte de réception, la ligne
  entière est déjà une annonce ; l'avatar répétait le texte, et un lecteur d'écran lisait
  tout deux fois. La propriété existe désormais, comme sur `Text`.

Les deux sont le genre de chose qu'aucun test ne trouve avant qu'un écran ne s'en serve.

## 8. Une mesure de performance du lot 7, reprise

`map.perf.test.ts` vérifiait que la plus longue tranche de décodage restait sous une image
à 60 Hz. Il a flanché une fois pendant ce lot, machine chargée — et en regardant pourquoi :
dix mille points se décodent en **quatre millisecondes au total, en deux tranches**. Un
maximum sur deux échantillons n'est pas une mesure, c'est un tirage.

Il vérifie maintenant ce qu'il peut garantir : que le fil est rendu au moins une fois — la
garantie architecturale, binaire — et que le décodage entier reste très en deçà de cent
millisecondes. Le détail est dans `docs/decisions-lot-7.md`, §1, mis à jour.

## 9. Ce qui n'est pas vérifié ici

- **une poussée réelle.** APNs et FCM demandent un _dev build_, un projet EAS et des
  identifiants de poussée. Ce lot teste tout ce qui est en amont — la permission, le jeton,
  l'enregistrement, le lien profond une fois la notification touchée — mais pas qu'Apple ou
  Google la livre ;
- **le lien profond application fermée**, pour la même raison : il demande de tuer
  l'application et de toucher une vraie notification ;
- **le comportement des heures calmes de bout en bout**, qui se décide côté serveur : le
  client envoie une plage et un fuseau, et c'est le back-end qui décide de ne pas pousser.

## 10. Couverture

| Paquet               | Tests                                                           |
| -------------------- | --------------------------------------------------------------- |
| `@runtrack/core`     | 237                                                             |
| `@runtrack/api`      | 256 — dont 18 sur la boîte, les préférences et les appareils    |
| `@runtrack/ui`       | 168                                                             |
| `@runtrack/adapters` | 86 — dont 9 sur les liens profonds                              |
| `@runtrack/features` | 141 — dont 18 sur la boîte, le flux, les préférences et le push |
