# Lot 6 — Consultation : les décisions

_Écrit le 2026-08-31._

---

## 1. Le budget du §14, plafonné

Décision prise : le plafond porte sur le **poids ajouté par le code applicatif**, pas sur
le total. Le total est fixé par la pile que le §1 impose, et il valait déjà 495 Ko avant
qu'une seule ligne d'écran n'existe.

`perf/budget.json` porte les deux nombres — le plancher mesuré et les 250 Ko du §14 — et
`scripts/check-web-budget.mjs` **casse le build** au-delà. Il tourne dans la CI après le
lint et les tests.

Au terme de ce lot : **625 Ko au total, dont 130 Ko applicatifs sur 250**. Cinq écrans
d'authentification, sept écrans de consultation, la couche d'i18n, TanStack Query et
Zustand tiennent dans la moitié du budget. La dérive se voit maintenant à chaque build,
ce qui était tout l'intérêt.

## 2. Le trou du contrat social, et ce que l'écran en fait

`GET /user/v1/{id}/followers` et `/following` rendent un `UserIdList` : des **identifiants**
et un compte. `GET /user/v1/me/follow-requests` rend un `followerId`, sans plus.

Et il n'existe **aucun endpoint qui résout un identifiant en profil** :
`GET /user/v1/{handle}` résout par pseudonyme — vérifié dans `UserController.byHandle`.

Conséquence : les écrans « abonnés » et « abonnements » du §10 ne peuvent pas être dessinés
comme la maquette les demande. Trois sorties ont été pesées :

1. **afficher les identifiants bruts** — ils ne veulent rien dire pour un coureur ;
2. **masquer l'écran** — on perd le compte, qui est juste et utile ;
3. **afficher le compte, et dire pourquoi la liste manque.** C'est celle qui est livrée.

**La demande à porter au back-end**, par ordre de préférence :

- que `followers`, `following` et `follow-requests` rendent des `PublicProfile` — ou au
  minimum le pseudonyme, qui suffit à construire un lien ;
- à défaut, un `GET /user/v1/by-id/{id}`.

Sans l'une des deux, l'écran de demandes d'abonnement propose d'accepter ou de refuser
**sans dire qui demande**, ce qui n'est pas une décision qu'on peut prendre.

Deuxième conséquence, plus petite : un en-tête de profil fait **trois** requêtes — le
profil, les abonnés, les abonnements — parce que `PublicProfile` ne porte aucun compteur.

## 3. Ce qu'un test d'accessibilité a corrigé dans le design system

Les cartes-métriques annonçaient « Allure moyenne, 5:08 5 minutes 8 par kilomètre ». La
valeur écrite était lue **en plus** de sa forme parlée.

`MetricCard` et `StatTile` acceptent désormais un `spokenValue` qui **remplace** la valeur
écrite au lieu de s'y ajouter. « 5:12 » lu tel quel donne « cinq deux-points douze », et une
durée « 1:04:22 » n'est pas une phrase. C'est le §5 dans son détail le moins spectaculaire
et le plus fréquent.

## 4. La carte n'est pas là, et l'écran le dit

L'écran de course affiche un cadre explicite à la place de la carte : elle arrive au lot 7,
avec le port `MapRenderer` et ses deux adaptateurs. Une image statique qui ferait semblant
serait pire — c'est le même raisonnement que le §2 sur le bouton « démarrer une course »
grisé côté web.

## 5. Les kilomètres ne se chargent qu'à la demande

Une course finie a un split par kilomètre, et personne ne les lit depuis le fil. Ils sont
une requête distincte, déclenchée par l'ouverture de la section — `enabled` sur le hook, pas
un `useEffect`. Un test vérifie qu'aucune requête ne part avant le geste.

## 6. Les onglets viennent du design system, la navigation du routeur

Expo Router possède les routes ; `TabBar` possède l'apparence et l'accessibilité —
`selected` annoncé, onglet actif **nommé** autant que coloré (§15 : jamais l'information par
la seule couleur).

Trois onglets et non quatre : les notifications arrivent au lot 10, et un onglet qui ne mène
nulle part est pire qu'un onglet absent. La garde de session vit dans la mise en page des
onglets, une fois, plutôt que dans chaque écran.

## 7. La pagination se teste sur le hook, pas sur l'écran

Ce qui compte est le **curseur envoyé**, pas le geste qui déclenche la page suivante.
Toucher aux `props` d'une FlashList pour simuler un défilement teste la doublure de
FlashList ; `renderHook` sur `useFeed` teste ce que le §0 exige — le `nextCursor` reçu est
celui qui repart, et l'absence de curseur veut dire « fin », pas « recommence ».

## 8. Couverture

| Paquet               | Tests                              |
| -------------------- | ---------------------------------- |
| `@runtrack/core`     | 198                                |
| `@runtrack/api`      | 195, dont 65 assertions de contrat |
| `@runtrack/ui`       | 166                                |
| `@runtrack/adapters` | 21                                 |
| `@runtrack/features` | 90                                 |

Le test de contrat couvre maintenant **39 chemins** et **41 champs** : les onze endpoints
sociaux y sont entrés avec la passerelle.
