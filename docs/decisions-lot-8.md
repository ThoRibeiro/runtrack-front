# Lot 8 — Le direct : les décisions

_Écrit le 2026-09-01._

---

## 1. `EventSource` est écarté, et pas pour la raison annoncée

Le §7 dit que « `EventSource` n'existe pas en React Native » et qu'il faut un polyfill.
C'est vrai, mais ce n'est pas la raison principale : **`EventSource` ne sait pas porter
d'en-tête**, et le flux de ce serveur est authentifié comme n'importe quel autre endpoint —
`LiveStreamController` lit un `Viewer` depuis le porteur, et une course privée répond
« introuvable » sur ce chemin comme sur les autres.

Les deux contournements habituels sont mauvais : mettre le JWT dans la chaîne de requête le
grave dans les journaux d'accès et l'historique du navigateur ; ouvrir le flux sans jeton
demanderait au serveur une exception d'authentification pour le direct.

Les trames sont donc **analysées à la main**, au-dessus d'un transport qui sait poser un
`Authorization`. Le format est petit et entièrement spécifié — `SseFrameParser` fait
soixante lignes et son test vérifie qu'un message survit à une coupure réseau **à chacun de
ses octets**, CRLF coupé en deux compris.

## 2. Deux transports, choisis sur une capacité et non sur une plateforme

- **navigateur** : `fetch` et la lecture du corps en flux. Rien ne s'accumule ;
- **React Native** : pas de `fetch` en flux (`response.body` y est nul), mais
  `XMLHttpRequest` déclenche `readystatechange` à mesure que `responseText` grandit. Le
  texte s'accumule pour la durée de la connexion — de l'ordre du mégaoctet sur trois
  heures, ce qui est payable — et seule la queue est transmise.

Le choix se fait sur `'body' in Response.prototype`, pas sur `Platform.OS`. Un runtime qui
gagne le `fetch` en flux prend le meilleur chemin sans qu'on livre quoi que ce soit, et une
détection qui se trompe retombe sur XHR, qui marche partout.

Les deux vivent dans `packages/api` et non dans `packages/adapters` : ni l'un ni l'autre ne
touche à une API de plateforme — `fetch`, `XMLHttpRequest` et `ReadableStream` sont des
globales — et le paquet qui parle HTTP est celui-là.

## 3. Le renouvellement du jeton couvre aussi le flux

Un 401 sur le flux renouvelle **une fois** et rouvre, par le même `RefreshCoordinator` que
les requêtes. C'est ce qui étend la promesse du §11 au direct : dix requêtes et une
connexion SSE au lancement ne font toujours qu'un seul renouvellement.

Un second 401 après un jeton neuf n'est plus un problème de jeton : il remonte comme une
erreur, et ne redemande rien.

## 4. Une fermeture propre ressemble à une coupure — et c'est la session qui tranche

Vu du transport, un serveur qui raccroche et un réseau qui meurt sont **le même
événement**. `SseLiveStream` remonte donc les deux comme une erreur.

Le problème est que le serveur raccroche pour de bon quand la course est finie :
`LiveStreamController` rend l'état final puis ferme. Sans garde, chaque fermeture relance
une connexion qui recevra la même chose — une boucle que personne ne regarde.

`LiveSession` **cesse de reconnecter quand l'état connu est terminal**, et le dit :
`LiveSnapshot.ended`. Ce n'est pas la même chose que `!connected`, qui veut dire « je
réessaie dans un instant ». L'écran distingue les deux, et propose le résumé quand la
course s'achève sous les yeux du spectateur.

## 5. Un rendu par seconde, et c'est le hook qui le garantit

Le §7 nomme le piège : un événement `position` par seconde pendant trois heures. S'il
provoque un rendu, l'application chauffe.

`useLiveActivity` n'écoute **aucun** événement. La session tamponne hors de React — c'est
sa raison d'être depuis le lot 3 — et le hook la pompe sur un battement d'une seconde :

- **la carte** reçoit uniquement la queue qu'elle n'a pas dessinée, par
  `ActivityMapPresenter`, sans le moindre rendu. Le premier lot est l'instantané du
  serveur : il est dessiné d'un coup, jamais point par point ;
- **le bandeau** ne rend que si `hasChanged` le dit — ce qui se lit _avant_ de construire
  l'instantané, puisque le construire remet le drapeau à zéro.

Le test le vérifie sur ce qui casse en silence : dix positions livrées dans la même seconde
donnent **un** appel à la carte, et un doublon n'en donne aucun.

## 6. L'annonce est plafonnée dans le hook, pas dans l'écran

§5 : « au plus une annonce toutes les 30 secondes », et « le flux brut n'est jamais
annoncé ». Le plafond est **là où bat la seconde**, donc dans le hook : `LiveView.announced`
ne change qu'une fois par demi-minute, et l'écran se contente d'en faire une phrase.

Conséquence heureuse : la phrase est une fonction pure de ce que l'écran reçoit. Pas
d'effet, pas d'état, pas de second rendu — et la règle ne peut pas se perdre dans un écran
qui recalculerait son texte à chaque tick.

La région vivante elle-même est devenue une propriété du design system (`Text liveRegion`)
plutôt qu'une propriété de plateforme posée dans un écran. Un écran qui atteint
`accessibilityLiveRegion` à la main est un écran qui peut annoncer le flux de positions ;
la propriété porte la règle et son commentaire.

## 7. Ce que le direct ne met pas en cache

Rien. §9 : « les données du direct vivent déjà côté serveur, elles changent à la seconde,
et un cache dessus ne ferait qu'afficher du faux ». TanStack Query gère la course elle-même
— titre, propriétaire, état — parce que c'est une requête ; le flux n'en est pas une.

## 8. Le `Scheduler` et le `Random` ont enfin leur implémentation réelle

Les deux ports existaient depuis le lot 3 sans que rien ne les branche : le chien de garde
de quarante-cinq secondes et le recul avec jitter ne se testent pas autrement.
`SystemScheduler` et `SystemRandom` font quatre lignes chacun, dans `packages/adapters`.
C'est exactement ce que la plateforme ajoute, et c'est la mesure de ce que les ports
faisaient gagner.

## 9. Ce qui n'est pas vérifié ici

- **la fluidité pendant un flux réel** : le §4 demande une mesure au profileur, fil JS
  chargé, sur un appareil. Ce lot tient le budget de rendu _par construction_ et le teste
  logiquement ; le nombre d'images par seconde se mesure au lot 13 ;
- **la consommation batterie** d'une heure de suivi, pour la même raison ;
- **le comportement d'un proxy qui tamponne** : `Cache-Control: no-cache` est envoyé, mais
  un intermédiaire qui décide de mettre le flux en tampon transforme le direct en livraison
  différée, et cela ne se voit qu'en conditions réelles.

## 10. Couverture

| Paquet               | Tests                                                     |
| -------------------- | --------------------------------------------------------- |
| `@runtrack/core`     | 233 — dont l'arrêt des reconnexions sur course terminée   |
| `@runtrack/api`      | 238 — dont 43 sur le SSE : trames, traduction, transports |
| `@runtrack/ui`       | 168                                                       |
| `@runtrack/adapters` | 55                                                        |
| `@runtrack/features` | 110 — dont 11 sur l'écran de direct                       |

Budget web : **141 Ko applicatifs sur 250** — le direct coûte 5 Ko, l'écran compris.
