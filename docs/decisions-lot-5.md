# Lot 5 — Authentification de bout en bout : les décisions

_Écrit le 2026-08-31._

---

## 1. Le stockage sécurisé sur le web — ce qu'on peut faire, et ce qu'on ne peut pas

Le §11 et le §15 sont catégoriques : le jeton de rafraîchissement ne va **jamais** dans
`localStorage`. Sur mobile, la réponse est écrite dans le cahier des charges — Keychain et
Keystore, via `expo-secure-store`. Sur le web, il n'existe aucun équivalent, et il faut le
dire plutôt que de faire semblant.

**Ce qui est livré.** La session est chiffrée en AES-GCM sous une clé générée avec
`extractable: false` et rangée dans IndexedDB. Une clé non extractible peut être
**utilisée** mais ses octets ne peuvent jamais être relus — ni par ce code, ni par
personne. Ce qui traîne dans le stockage est donc du chiffré plus une clé qui refuse d'être
sérialisée : un script qui vide le stockage du navigateur vers un serveur distant n'emporte
rien d'exploitable. C'est l'exfiltration la plus courante, et elle est fermée. Un vecteur
d'initialisation neuf à chaque écriture — le réutiliser sous AES-GCM transformerait le
chiffrement en décoration.

**Ce qui n'est pas résolu.** Un attaquant capable d'exécuter du script **dans cette
origine** peut appeler `decrypt` exactement comme ce code le fait. La barre est relevée, la
menace n'est pas supprimée.

**La vraie réponse est côté serveur** : un jeton de rafraîchissement dans un cookie
`httpOnly`, que le client ne peut pas décider seul — aujourd'hui `/auth/v1/refresh` le rend
dans le corps. C'est une demande à porter au back-end, et elle est écrite ici plutôt que
contournée en silence.

Le test regarde ce qui atterrit vraiment dans le stockage, pas ce que l'API promet : aucun
des trois secrets n'y apparaît en clair, et `exportKey` sur la clé rejette.

**`WHEN_UNLOCKED_THIS_DEVICE_ONLY` sur iOS**, pour une raison précise : un jeton de
rafraîchissement restauré depuis une sauvegarde est un jeton que le serveur a fait tourner
depuis longtemps, et le présenter déclenche la détection de rejeu du §11. L'utilisateur
serait déconnecté pour avoir restauré une sauvegarde.

## 2. Une couche d'internationalisation, dès le premier écran

Le §15 interdit « des textes en dur non traduits — même si la v1 n'a qu'une langue ». La
raison n'est pas la langue : c'est qu'une chaîne écrite dans un écran est une chaîne que
personne ne retrouve.

Une bibliothèque d'i18n a été pesée puis écartée : le §14 compte chaque kilooctet du bundle
initial, et ce dont une application à une seule langue a besoin, c'est d'une recherche et
d'une interpolation. Le dictionnaire est un objet `as const`, et le type des clés en
**dérive** — `t('auth.signIn.titel')` ne compile pas.

## 3. Chaque code d'erreur a sa phrase, et le compilateur le vérifie

Le §15 interdit « un `catch` qui affiche “une erreur est survenue” sans regarder le champ
`code` ». `describeError` fait ce travail une fois pour toutes.

Ce qui rend la règle tenable, c'est que l'exhaustivité est **prouvée à la compilation** :
`keyFor` rend le type `` `error.${ErrorCode}` ``, qui ne s'assigne à `TranslationKey` que si
le dictionnaire porte les cinquante et une clés. Ajouter un code au catalogue sans écrire sa
phrase casse le build avant qu'aucun test ne tourne.

Trois cas distincts, et la distinction compte pour l'utilisateur :

- un code connu → la phrase du dictionnaire, plus le détail du serveur qui en dit souvent
  davantage (« thomas est déjà pris ») ;
- un code inconnu → « quelque chose n'a pas fonctionné », avec la référence de corrélation
  du §11 que l'utilisateur citera ;
- **pas de `RunTrackError` du tout** → la requête n'est jamais partie. « Pas de réseau » est
  plus utile que n'importe quelle autre phrase, et c'est un cas que le §15 ne mentionne pas.

## 4. Les écrans ne connaissent pas le routeur

`SignInScreen` reçoit `onSignedIn`, `onForgotPassword`, `onSignUp` — des fonctions, pas un
`useRouter`. Deux conséquences : les écrans se montent dans un test sans routeur, et
`packages/features` ne dépend pas d'Expo Router, donc les deux coques câblent leurs propres
routes vers les mêmes écrans.

C'est aussi ce qui rendra le §2 lisible au lot 6 : le web n'aura tout simplement pas de
route vers l'enregistreur.

## 5. Le seul `useEffect` du lot, et ce n'est pas un chargement

Le §1 interdit `useEffect` **pour aller chercher des données**. Il y en a exactement un dans
`packages/features` : celui qui lit le trousseau au montage, dans `SessionProvider`. Il n'a
ni cache, ni invalidation, ni serveur derrière — c'est l'effet de montage que la règle
laisse en place, et il est seul.

Tout le reste passe par TanStack Query : mutations pour la connexion, l'inscription et le
mot de passe ; **query** pour la confirmation d'adresse, parce que c'est un `GET`.

`status` vaut trois choses et pas deux. « Pas connecté » et « on n'a pas encore regardé »
sont différents : les confondre fait clignoter l'écran de connexion à chaque démarrage à
froid pour quelqu'un qui est connecté, ce qui se lit comme un bug.

## 6. Ce qu'un test a trouvé et qu'aucune relecture n'aurait vu

`useVerifyEmail` rendait `Promise<void>`. TanStack Query traite un résultat `undefined`
comme un échec : l'écran restait sur son indicateur d'attente **pour toujours** — le spinner
infini que le §9 appelle un mensonge. La requête rend maintenant `true`, et le test qui
attend l'écran de confirmation est ce qui l'a révélé.

## 7. Deux détails qui protègent l'utilisateur

**L'oubli de mot de passe ne dit pas si le compte existe.** Répondre « adresse inconnue »
transformerait ce formulaire en oracle d'énumération de comptes. Le serveur répond pareil
dans les deux cas ; l'écran aussi, et un test le vérifie.

**La déconnexion efface localement même quand le serveur refuse.** Une déconnexion qui
échoue sur le réseau reste une déconnexion du point de vue de cet appareil ; laisser la
session en place serait pire.

**La validation du mot de passe diffère entre connexion et inscription** : présence à la
connexion, douze caractères à l'inscription. Imposer la longueur à la connexion empêcherait
un ancien compte de se connecter. Et elle compte les **caractères**, pas les unités de
code : douze emojis font douze caractères pour la personne qui les tape.

## 8. Couverture et budget

| Paquet               | Tests                         |
| -------------------- | ----------------------------- |
| `@runtrack/core`     | 198                           |
| `@runtrack/api`      | 97 + 65 assertions de contrat |
| `@runtrack/ui`       | 166                           |
| `@runtrack/adapters` | 21                            |
| `@runtrack/features` | 51                            |

Le bundle web passe de 495 à **598 Ko compressés** — cinq écrans, TanStack Query, Zustand et
la couche d'i18n. Le budget du §14 reste à 250 Ko, et la recommandation des lots 1 et 2 ne
change pas : plafonner le poids **ajouté** plutôt que le total.

## 9. Un piège de plate-forme

Le bundle iOS échouait sur `Unable to resolve module buffer` : `react-native-svg` importe
`buffer`, que React Native ne fournit pas. Le polyfill est déclaré dans les deux coques.
Le web ne le montrait pas — un navigateur a `Buffer` par une autre route — ce qui est
exactement le genre d'écart qu'un build des **deux** cibles attrape et qu'un build d'une
seule laisse passer jusqu'au store.
