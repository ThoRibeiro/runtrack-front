# Lot 3 — `packages/core` : les décisions

_Écrit le 2026-08-31. Le lot que le cahier des charges appelle « le plus important du
projet ». Il ne contient aucune implémentation, aucun appel réseau, aucune horloge système._

---

## 1. Le cahier des charges décrit une API qui n'est pas celle du back-end

C'est le point à trancher avant tout le reste, et il n'est pas mineur. Le §0 annonce une
base `/api/v1` et des chemins `/activities/{id}/stream`, `/users/me/stats`. Le back-end
livré expose autre chose :

| §0 du cahier des charges      | Back-end réel (`/v3/api-docs`)                                      |
| ----------------------------- | ------------------------------------------------------------------- |
| base `/api/v1`                | base `/`, un préfixe **par module**                                 |
| `POST /activities`            | `POST /race/v1`                                                     |
| `GET /activities/{id}/stream` | `GET /race/v1/{id}/stream`                                          |
| `GET /notifications/stream`   | `GET /notification/v1/stream`                                       |
| `GET /users/me/stats`         | `GET /user/v1/me/stats`                                             |
| `POST /users/me/devices`      | `POST /user/v1/me/devices`                                          |
| —                             | `/auth/v1/…`, `/feed/v1`, `/comment/v1/{id}`, `/share-link/v1/{id}` |

**63 endpoints**, pas 58. Le code gagne : `packages/core` et `packages/api` suivent le
back-end. Tout le reste du §0 est exact — `problem+json` avec un champ `code` stable,
pagination par curseur, JWT 15 min / refresh rotatif 30 j, deux flux SSE avec
`Last-Event-ID`, plafond de 1 000 points par lot, `Idempotency-Key`, dérive d'horloge
mesurée une seule fois à partir de `deviceTime`.

**Deuxième écart, qui coûtera au lot 4** : la description OpenAPI est produite par
springdoc avec ses réglages par défaut, et elle est **sous-spécifiée**. Les énumérations y
sont des `string` nus, la réponse de `POST /race/v1/{id}/points` est déclarée `string`
alors qu'elle rend un objet, et aucune réponse d'erreur n'est décrite. Génerer les types
depuis elle telle quelle donnerait `type: string` partout — c'est-à-dire aucun type.

Le §15 interdit de recopier des types d'API à la main, et il a raison. La sortie proposée
pour le lot 4, plutôt que de désobéir : **générer ce qui est générable**, et poser à côté
les unions manquantes — celles que ce lot vient de déclarer — avec un test qui vérifie
qu'elles restent **assignables** aux types générés. Une divergence casse alors le build au
lieu de passer inaperçue. Les valeurs ont été relevées dans le code du back-end, pas
devinées : `ActivityType`, `AudienceScope`, `PointRejection`, `NotificationType`,
`StatsPeriod`, `AccountStatus`, et les **51 codes d'erreur** de `shared/errors/errorCode.ts`.

## 2. Le découpage : domaine d'abord, technique ensuite

```
packages/core/src/
├── shared/       temps, identifiants, pagination, erreurs, aléa
├── measure/      géographie, allure, dénivelé, polyline — les calculs purs
├── activity/     domain · ports
├── recording/    domain · ports · usecases   ← le cœur du §6
├── live/         domain · ports · usecases   ← le cœur du §7
├── auth/ user/ feed/ social/ engagement/ notification/ sharing/ map/
└── testing/      les doublures des ports, exclues de la couverture
```

C'est la structure annoncée au lot 1, et celle de `runtrack-course/` côté serveur. Un
relecteur qui connaît le back-end n'a rien à traduire.

## 3. Les ports : les huit du §2, plus trois

Les huit attendus sont là : `ActivityGateway`, `LiveStream`, `LocationTracker`,
`PointBuffer`, `SecureStore`, `MapRenderer`, `PushRegistry`, `Clock`. Le §2 dit « au
minimum », et trois autres se sont imposés :

- **`Scheduler`** — sans lui, le chien de garde de 45 s du §7 et le rythme d'envoi du §6
  ne sont testables qu'en attendant vraiment. `ManualScheduler` fait avancer le temps à la
  main, comme `FixedClock` ;
- **`Random`** — le jitter du §7 est une exigence explicite, et un jitter non testé est
  exactement ce qui fait reconnecter mille clients dans la même seconde ;
- les **gateways par domaine** (`AuthGateway`, `UserGateway`, `FeedGateway`,
  `SocialGateway`, `EngagementGateway`, `SharingGateway`, `NotificationGateway`,
  `NotificationStream`). Un seul port « l'API » aurait fait une interface de soixante
  méthodes qu'aucune doublure de test ne peut implémenter honnêtement.

`MapRenderer` est **impératif** à dessein. Le piège de performance du §7 — un événement
`position` par seconde pendant trois heures — se règle là : `appendToTrace` pousse un
point dans la carte sans que React l'apprenne.

## 4. La clé d'idempotence est déduite, pas tirée au sort

C'est la décision la moins visible et la plus utile du lot.

Une clé aléatoire fait passer un rejeu pour un nouveau lot : le serveur accepte deux fois
les mêmes points, ou répond 409 `IDEMPOTENCY_KEY_REUSED` sur un corps qu'il n'a jamais vu.
Déduite de la course et de la plage de séquences — `activity-1:0-999` — un rejeu du même
lot porte la **même** clé, et le serveur rejoue sa réponse mémorisée. C'est exactement la
propriété que le §6 demande, et c'est le même choix que le back-end a fait pour sa propre
ingestion.

## 5. Ce que le lot 3 ne contient pas, et pourquoi

**Le refresh unique du §11 n'est pas ici.** L'ordre de livraison le place au lot 4, dans
`packages/api`, et c'est le bon endroit : la coordination porte sur des requêtes en vol,
pas sur une règle de domaine. Ce que `core` fournit, c'est la règle qui décide **quand**
renouveler — `needsRefresh`, avec une marge d'une minute avant l'expiration, pour qu'une
requête partie avec trente secondes de validité n'arrive pas expirée et ne déclenche pas
un 401 de plus.

**Le décodage de polyline est ici, son exécution non.** L'algorithme est de
l'arithmétique ; le §8 exige qu'il tourne hors du fil principal, ce qui est un worker,
donc un adaptateur. `decodePolylineChunk` rend la main et dit où elle s'est arrêtée : un
adaptateur découpe sans réécrire le décodeur.

**Aucune implémentation de port.** `src/testing/` contient des doublures en mémoire —
elles servent aux tests de ce lot, et elles serviront aux coques pour un mode démo ou une
campagne de captures. Elles sont exclues de la couverture : une doublure qui aurait besoin
de ses propres tests serait une doublure qui en fait trop.

## 6. La règle d'isolation a été affinée, pas contournée

Le lot 1 interdisait `Date` dans `core`. Les heures calmes du §12 ont buté dessus : elles
convertissent un instant en heure locale dans le fuseau du destinataire, et
`new Date(epochMillis)` est une conversion de valeur, pas une lecture d'horloge.

La règle distingue maintenant les deux : `new Date()` **sans argument** et `Date.now()`
restent interdits — ce sont eux qui lisent l'horloge système — et `new Date(x)` passe.
Vérifié en écrivant les trois cas et en regardant lesquels tombent.

L'arithmétique de fuseau utilise `Intl`, qui est de l'ECMAScript et non une API de
plateforme. Le fuseau lui-même reste une donnée que la coque fournit.

## 7. Couverture

**194 tests, 99,3 % ligne / 96,2 % branche / 100 % fonction** — le seuil du §13 est à
90 %. Les trois priorités qu'il nomme sont couvertes :

- **le tampon de points** — kill de l'app puis reprise, rejeu sous la même clé après un
  échec réseau, purge jusqu'à `lastAcceptedSequence` **et pas au-delà**, découpe d'un rejeu
  de 1 250 points en deux lots, GPS sans fix signalé après cinq rejets d'affilée ;
- **la reprise SSE** — `Last-Event-ID` renvoyé, doublons ignorés, rejeu désordonné remis
  en ordre, reconnexion sur le **silence** de 45 s et non sur une erreur, recul
  exponentiel espacé, id avancé même sur un événement incompris ;
- **la dérive d'horloge** — mesurée une fois, course abandonnée au-delà de quinze minutes
  d'écart, prédiction du rejet à plus de soixante secondes dans le futur, reprise qui
  **réutilise** la dérive au lieu d'en mesurer une nouvelle.

Les trois pour cent restants sont des gardes de `noUncheckedIndexedAccess` que rien ne
peut atteindre. Aucune exclusion n'a été ajoutée pour rattraper un chiffre.
