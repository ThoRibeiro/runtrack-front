# Lot 4 — `packages/api` : les décisions

_Écrit le 2026-08-31._

---

## 1. Générer ce qui est générable, vérifier le reste — plutôt que recopier

Le §15 interdit « des types d'API recopiés à la main au lieu d'être générés depuis
l'OpenAPI ». La difficulté annoncée au lot 3 s'est confirmée : la description produite par
springdoc est **sous-spécifiée**.

- toutes les énumérations y sont des `string` nus — `type`, `visibility`, `status`,
  `period`, `biologicalSex`, `reason` ;
- la réponse de `POST /race/v1/{id}/points` y est déclarée **`string`**, alors qu'elle rend
  un objet avec `lastAcceptedSequence`, `acceptedCount` et `rejected` — exactement les trois
  champs que le §6 demande de lire ;
- aucune réponse d'erreur n'y figure, donc aucun `problem+json`.

Générer depuis elle telle quelle donnerait `string` partout, c'est-à-dire aucun type.

**Ce qui est fait** : `openapi-typescript` génère `src/generated/schema.ts` (2 674 lignes,
jamais édité, exclu du lint) ; les unions manquantes vivent dans `packages/core`, relevées
**dans le code du back-end** et non devinées ; et `src/generated/contract.test.ts` vérifie,
à chaque build, que les **28 chemins appelés** et les **35 champs lus** existent toujours
dans la description. Un endpoint renommé ou un champ disparu casse le build au lieu de
casser un écran.

Ce test surveille aussi la sous-spécification elle-même : le jour où springdoc décrit enfin
la réponse d'ingestion, l'assertion tombe, et c'est le signal de supprimer le type écrit à
la main. **65 assertions** au total.

Ce n'est pas la lettre du §15, c'est son intention : rien n'est recopié sans qu'une machine
vérifie que la copie dit encore vrai.

## 2. Le refresh unique — deux pièges, pas un

Le §11 en décrit un : dix requêtes au lancement, dix 401, dix renouvellements, et
l'utilisateur déconnecté sans avoir rien fait. La parade est un renouvellement en vol,
implémentée dans `RefreshCoordinator`.

**Le second piège n'est pas dans le cahier des charges, et il fait la même chose.** Une
requête dont le 401 arrive _après_ la fin d'un renouvellement repartirait avec le jeton qui
vient d'être consommé : c'est le même rejeu, simplement plus tard. La parade est le
paramètre `staleToken` — l'appelant présente le jeton qu'il tenait, et si le porteur de
session en a déjà un autre, il n'y a rien à faire.

C'est ce qui a imposé `SessionHolder` : la comparaison doit être **synchrone**. Interroger
le stockage sécurisé veut dire attendre, et entre l'attente et la réponse un deuxième
renouvellement est déjà parti.

Sept tests couvrent la mécanique, dont les deux du §11 (« dix requêtes parallèles » et
« dix 401 simultanés »), la déconnexion propre sur `REFRESH_TOKEN_REUSED`, et le cas
inverse : une coupure réseau **ne déconnecte pas** — redemander un mot de passe pour un
problème de réseau serait une déconnexion gratuite.

## 3. Un renouvellement préventif, avant l'envoi

Le §11 décrit la réaction au 401. Le client fait un pas de plus : si le jeton expire dans
moins d'une minute, il est renouvelé **avant** de partir. Une requête qui part avec trente
secondes de validité peut arriver expirée, et chacune de celles-là est un 401 de plus,
donc un risque de ruée de plus. Le chemin du 401 reste, parce que l'horloge du téléphone
n'est pas celle du serveur — c'est la même dérive qu'au §6.

## 4. `SessionResponse` n'a pas d'identifiant de compte

Le serveur rend deux jetons et une durée de vie, rien d'autre. Le domaine, lui, a besoin de
savoir à quel compte la session appartient.

Trois sorties possibles : un aller-retour supplémentaire sur `/user/v1/me` à chaque
connexion, une session sans identifiant que chaque écran doit ensuite traiter à part, ou
**lire la revendication `sub` du jeton**. C'est la troisième, dans `auth/jwt.ts`.

Ce code **lit** un jeton, il n'en vérifie aucun : la signature est l'affaire du serveur, et
la vérifier ici demanderait une clé que le client ne doit jamais détenir. Rien n'en est tiré
au-delà de « à quel compte appartient cette session », que le serveur redérive de toute
façon du même jeton à chaque requête.

Le base64url est décodé à la main plutôt que par `atob` : Hermes ne l'a pas toujours
embarqué, et l'alphabet diffère de deux caractères. Le décodage UTF-8 est testé jusqu'aux
caractères sur quatre octets — un décodeur qui coupe un caractère en deux le fait sans le
dire.

## 5. Ce qu'un mappeur fait quand la réponse est incomplète

Deux comportements, et le choix entre les deux est explicite à chaque champ.

**Replier** — une valeur d'énumération inconnue prend une valeur de repli plutôt que de
faire tomber l'écran. Deux replis sont des décisions de sécurité et non de confort :
`visibility` inconnue devient **`PRIVATE`**, et `accountScope` inconnu aussi. Montrer une
course à tout le monde parce qu'on n'a pas compris la portée serait la pire des sorties.

**Échouer** — un champ sans lequel la réponse n'a pas d'usage lève une `RunTrackError`
disant lequel manque. `?? ''` sur un identifiant ferait semblant d'avoir une valeur de repli
puis échouerait plus loin, dans le constructeur d'identifiant, avec un message qui ne dit
rien de la réponse fautive. Un état de course inconnu échoue pour la même raison : il décide
si des points peuvent partir et si l'enregistreur peut reprendre.

Onze tests « réponse minimale » couvrent les replis un par un — le client survit à une
réponse partielle sans afficher « undefined ».

## 6. Corrections apportées à `packages/core`

Confronter le domaine au contrat réel a corrigé quatre modèles que le lot 3 avait inventés
faute d'avoir lu les DTO :

| Modèle          | Ce que le lot 3 supposait                             | Ce que le serveur envoie                                       |
| --------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `FeedItem`      | polyline, statistiques complètes, `likedByMe`, `live` | une distance, un temps en mouvement, deux compteurs, un statut |
| `PublicProfile` | compteurs d'abonnés et de courses                     | ni l'un ni l'autre — `accountScope` en plus                    |
| `Comment`       | un objet auteur                                       | un **identifiant** d'auteur                                    |
| `Notification`  | destination **déduite** du type                       | un `deepLink` **fourni** par le serveur                        |

Le dernier est le plus intéressant. `destinationOf` recalculait côté client ce que le
serveur envoie déjà : deux vérités qui divergent au premier changement. `parseDeepLink` lit
la chaîne du serveur et la transforme en union typée — et rend `undefined` sur un chemin
que cette version ne connaît pas, parce qu'ouvrir le mauvais écran est pire que de n'en
ouvrir aucun.

## 7. Couverture

**97 tests** dans `packages/api` — **98,3 % ligne, 90,9 % branche** — plus les 65
assertions de contrat. `packages/core` reste à **198 tests, 99,3 % ligne**.

Quatre gateways sont livrés : authentification, courses, comptes, fil. Les quatre autres
(social, engagement, notifications, partage) arrivent avec les lots qui les utilisent —
l'ordre de livraison les y place, et écrire des mappeurs pour des écrans qui n'existent pas
serait écrire du code non vérifié.

## 8. Un piège d'environnement, à noter

`pnpm install` a échoué en cours de lot sur `self-signed certificate in certificate chain`.
C'est le **même piège que Maven** documenté dans la fiche `poste`, côté Node cette fois :
`curl` fait confiance au trousseau macOS, Node non — il n'a que sa propre liste de CA.

Le contournement, à porter sur la commande :

```bash
security find-certificate -a -p /Library/Keychains/System.keychain > /tmp/system-ca.pem
NODE_EXTRA_CA_CERTS=/tmp/system-ca.pem pnpm install
```
