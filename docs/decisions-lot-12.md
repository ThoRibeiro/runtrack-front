# Lot 12 — Hors-ligne : les décisions

_Écrit le 2026-09-01._

---

## 1. Une liste blanche, pas une liste noire

Le §12 tient en une phrase : « ce que le §9 énumère, **et rien de plus** ». Le §9 énumère
trois choses — la course en cours, la dernière page de fil, les courses déjà ouvertes — et
il nomme ce qu'il ne faut **pas** garder : les données du direct, qui changent à la seconde
et dont un cache ne montrerait que du faux.

`shouldPersistQuery` est donc une **liste blanche**. Une liste noire voudrait dire que toute
requête ajoutée plus tard est persistée par défaut, et le jour où quelqu'un en ajoute une
qui porte un jeton ou une position en direct, personne ne s'en aperçoit.

Trois exclusions valent d'être dites :

- **le direct**, `['activity', 'live']` : périmé à l'instant où il est écrit ;
- **les j'aime, commentaires et liens de partage** : ils changent sans que ce téléphone en
  sache rien, et un compte figé se lit comme un bug ;
- **la trace décodée**. Dix mille points de JSON — le plus gros objet du cache d'un ordre de
  grandeur — alors qu'elle se reconstruit depuis la polyline en quatre millisecondes
  (mesuré au lot 10). On garde la polyline, pas ce qu'elle produit.

La course en cours n'est pas là du tout : elle vit dans SQLite, écrite avant toute autre
chose (lot 9). Un cache de requêtes serait le mauvais endroit — il ne survit pas à un kill
au milieu d'une écriture, et c'est précisément ce que le tampon doit faire.

## 2. « Pas de spinner infini » demande de savoir qu'on est hors ligne

C'est le vrai travail de ce lot, et il n'est pas dans le cache.

TanStack Query **met une requête en pause** quand il se croit hors ligne, et une requête en
pause est indiscernable d'une requête lente vue de l'écran : `isPending` vaut `true` dans
les deux cas. Un écran qui ne regarde que ça affiche un spinner qui ne s'arrêtera jamais —
exactement le mensonge que le §9 interdit.

Deux choses le règlent :

- **`onlineManager` est branché sur le port `NetworkMonitor`.** Son écouteur par défaut est
  celui d'un navigateur, qui n'existe pas en React Native : sans ça, un téléphone dans un
  tunnel continue de lancer des requêtes et chaque écran tourne. Branché, une pause est une
  pause _connue_ ;
- **les écrans lisent `fetchStatus === 'paused'`** et affichent `OfflineState` — un
  composant du design system, annoncé comme un état et non comme une erreur, avec l'icône
  qui répète ce que disent les mots (§15) et un bouton pour réessayer. Réessayer plutôt
  qu'attendre un signal : le réseau est peut-être déjà revenu, et un écran qui attend
  passivement se lit comme cassé.

`useOnline` lit **le même manager** que celui sur lequel les requêtes se mettent en pause.
C'est ce qui empêche le bug d'à côté : un bandeau « connecté » au-dessus d'une liste qui
attend depuis deux minutes.

## 3. Le réseau sort de l'enregistreur

`NetworkMonitor` était dans la capacité `recording` depuis le lot 9, parce que seul le §6 en
avait besoin. Il est maintenant au premier niveau du runtime : l'histoire du hors-ligne
n'appartient pas au seul enregistreur, et chaque écran doit un état honnête au coureur.

Côté web, `BrowserNetworkMonitor` lit `navigator.onLine`, dont la faiblesse est connue — il
dit qu'une interface réseau existe, pas que quelque chose répond au bout. Il reste utile :
il a raison sur le cas qui compte, l'onglet qui vient de perdre son Wi-Fi, et se tromper
dans l'autre sens coûte une requête qui allait échouer de toute façon.

## 4. Le cache ne garde rien de sensible, et le perdre ne coûte rien

La session n'y est pas : elle vit dans `WebSecureStore` (chiffrée) ou dans le Keychain. La
liste blanche ne laisse passer que le fil et les courses déjà ouvertes.

Et **toute écriture qui échoue est silencieuse**. Quota dépassé, navigation privée, un
navigateur qui refuse l'accès au stockage — sur le web, `localStorage` lève parfois à la
simple lecture. Un cache est une optimisation : ne pas pouvoir l'écrire coûte un
rechargement, et faire tomber l'application pour ça serait absurde. Un cache illisible fait
repartir de zéro plutôt que d'en deviner la moitié.

`maxAge` est d'un jour. Plus long, un coureur ouvre l'application sur un fil de la semaine
dernière présenté comme actuel ; plus court, l'histoire hors-ligne s'arrête sur le trajet
du retour.

## 5. Ce qui n'est pas fait, et pourquoi

- **aucune file d'attente de mutations hors ligne.** Aimer une course sans réseau ne
  s'empile pas pour plus tard, et c'est délibéré : le §9 énumère trois choses en lecture, et
  rien sur l'écriture. La seule écriture qui doit survivre à une coupure est l'ingestion des
  points, qui a son propre tampon depuis le lot 9 — avec sa clé d'idempotence, sans laquelle
  un rejeu créerait des doublons ;
- **le comportement réel dans un tunnel** demande un appareil, comme au lot 9.

## 6. Couverture

| Paquet               | Tests                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| `@runtrack/core`     | 237                                                                           |
| `@runtrack/api`      | 273                                                                           |
| `@runtrack/ui`       | 168                                                                           |
| `@runtrack/adapters` | 86                                                                            |
| `@runtrack/features` | 180 — dont 24 sur ce qui survit, ce qui ne survit pas, et les écrans en pause |
