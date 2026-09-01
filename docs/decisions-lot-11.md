# Lot 11 — Engagement et partage : les décisions

_Écrit le 2026-09-01._

---

## 1. Le jeton de partage voyage dans le chemin, pas dans un en-tête

C'est la découverte de ce lot, et elle corrige le lot 4.

`HttpClient` avait une option `shareToken` qui posait un en-tête `X-Share-Token`. **Aucun
filtre du serveur n'a jamais lu cet en-tête.** Le vrai mécanisme est un chemin :
`ShareLinkAccessFilter` intercepte `/shared/v1/{token}`, résout le jeton, pose un
`Viewer.ShareLinkHolder` et **réachemine** vers `/race/v1/{id}` — en reportant le suffixe.
Donc `/shared/v1/{token}/track` lit la trace, et `/shared/v1/{token}/stream` suit le direct.

L'option est supprimée, et `SharedActivityGateway` construit les vrais chemins. Ses
requêtes sont **anonymes** : un lien se lit par quelqu'un qui n'a peut-être pas de compte,
et envoyer un porteur de session ferait répondre le serveur en tant que ce compte plutôt
qu'en tant que porteur du lien.

C'est le troisième écart entre le §0 du cahier des charges et le back-end livré, après les
chemins d'API (lot 3) et la forme de la réponse d'ingestion (lot 4).

## 2. Pas de mise à jour optimiste sur un j'aime

Le serveur répond à chaque j'aime avec **le nouvel état** — le compte et si le lecteur
aime. Le cœur se pose donc sur la vérité un aller-retour plus tard, plutôt que sur un
nombre que le client aurait deviné.

Un compte optimiste devrait être annulé quand l'appel échoue, et un cœur qui se remplit
puis se vide est pire qu'un cœur qui se remplit avec un instant de retard. L'état est aussi
**dans le nom accessible** — « Aimé, 12 j'aime » contre « Aimer, 12 j'aime » — parce que le
§15 interdit qu'une information tienne au seul remplissage de l'icône.

## 3. Le jeton en clair n'existe qu'une fois, et l'écran le dit là où ça compte

Le serveur rend le jeton **à la création uniquement** : un lien listé plus tard a un
identifiant, un compte d'ouvertures et une date, mais pas de jeton.

Deux conséquences tenues par le code :

- le lien créé est **écrit dans le cache tel quel**, jamais rechargé. Un rechargement le
  remplacerait par sa version listée — sans jeton — et le lien disparaîtrait sous les yeux
  de la personne en train de le copier ;
- la feuille de partage affiche l'avertissement **au moment de la création**, pas dans une
  documentation que personne ne lit.

Elle dit aussi ce qu'un lien **fait** avant d'en créer un : quiconque l'a peut voir la
course, y compris quelqu'un que le coureur a bloqué. Ce n'est pas un détail à enterrer.

## 4. Un commentaire supprimé garde sa place

Le serveur le modélise ainsi et il a raison : un fil troué se lit comme un bug, et une
réponse à un commentaire disparu perd son sens. La ligne reste, sans son texte, et
s'annonce « commentaire supprimé ».

**L'auteur est un identifiant.** Le serveur envoie des ids plutôt que de répéter deux cents
fois le même profil, et il n'existe toujours aucun endpoint qui résout un id en profil —
le même trou qu'au lot 6, §2. Un commentaire est donc attribué à « un coureur » plutôt
qu'à un nom faux. **La demande au back-end reste la même** : que les identifiants
d'auteur voyagent avec au moins un pseudonyme.

## 5. La page publique n'offre que ce qu'un lien permet

Pas de j'aime, pas de commentaire, pas d'abonnement : tout cela demande un compte, et la
règle du §2 s'applique — un bouton grisé avec une infobulle est pire que pas de bouton.
Le lien montre une course ; l'application est ailleurs.

Un lien révoqué, expiré ou inventé donne **exactement le même écran**, parce que le serveur
donne exactement la même réponse aux trois : distinguer confirmerait à qui tâtonne qu'un
autre jeton, lui, a existé.

## 6. Ce qui reste à faire, et ce qui n'est pas vérifiable

- le **direct d'une course partagée** existe côté serveur (`/shared/v1/{token}/stream`) et
  `SharedActivityGateway.streamUrl` le construit ; la page publique affiche la trace et les
  statistiques, pas encore le suivi seconde par seconde. C'est une soudure à faire, pas une
  inconnue ;
- **le presse-papiers** est branché sur `expo-clipboard` dans les deux coques, et se vérifie
  sur un appareil ou un navigateur — pas en test.

## 7. Couverture

| Paquet               | Tests                                                        |
| -------------------- | ------------------------------------------------------------ |
| `@runtrack/core`     | 237                                                          |
| `@runtrack/api`      | 273 — dont 17 sur l'engagement, le partage et les liens      |
| `@runtrack/ui`       | 168                                                          |
| `@runtrack/adapters` | 86                                                           |
| `@runtrack/features` | 156 — dont 15 sur les j'aime, les commentaires et le partage |

Budget web : **159 Ko applicatifs sur 250**.
