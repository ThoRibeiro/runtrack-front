# La refonte visuelle : les décisions

_Écrit le 2026-09-01, après les treize lots._

---

## 1. Une palette qui règle le problème que l'ancienne créait

Les cinq couleurs sont celles du propriétaire du projet : `#137C8B`, `#709CA7`, `#B8CBD0`,
`#7A90A4`, `#344D59`. Elles remplacent l'orange unique de la référence, et elles sont un
meilleur jeu pour une raison **mesurable** :

|                           | sur blanc  | conséquence                                           |
| ------------------------- | ---------- | ----------------------------------------------------- |
| `#EE4A22` (ancien accent) | 3,72:1     | non lisible comme texte → il fallait **deux** oranges |
| `#137C8B` (nouvel accent) | **4,90:1** | lisible comme texte **et** comme remplissage          |

Le §3 de l'ancien cahier des charges imposait `brand-500` pour les remplissages et
`brand-600` pour le texte, avec une règle que personne ne retient et que le §15 devait
rappeler (« du texte brand-500 sur fond clair » figurait dans la liste des choses
interdites). **Cette règle disparaît** : une seule couleur fait les deux métiers.

Deux nuances sont dérivées, parce que deux métiers n'avaient pas de couleur dans le jeu :

- **`#5A7182`** pour le texte secondaire. `#7A90A4` donne 3,31:1 — correct pour une bordure
  ou une icône, sous le seuil AA pour des mots. Foncé jusqu'à 5,10:1, pas plus ;
- **`#25AABE`** pour l'accent sur fond sombre. `#137C8B` y tombe à 3,79:1, ce qui est un
  remplissage, pas un mot. Éclairci jusqu'à 6,70:1.

Les 119 assertions de contraste passent sur les trois thèmes sans exception ajoutée.

## 2. Le minimalisme, en quatre décisions concrètes

« Minimaliste » n'est pas une intention, c'est ce qu'on retire. Quatre choses ont été
retirées :

- **les pastilles colorées des métriques.** Un cœur jaune, une allure menthe et un dénivelé
  violet sur un même écran lisent comme trois produits différents. Le §15 interdit déjà
  qu'une information tienne à la couleur seule — chaque métrique a une icône et un libellé —
  donc la couleur ne portait que le bruit. La pastille est devenue la surface alternative,
  l'icône porte l'accent ;
- **les ombres.** `elevation.card` est désormais exactement zéro, et une carte se distingue
  par un filet d'un pixel. Une carte qui flotte demande de l'attention, et sur un écran où
  toutes flottent, aucune n'en obtient ;
- **les grands rayons.** 24 sur une carte lisait « application ludique ». L'échelle est
  resserrée — 12 sur une carte, 6 sur un champ — et la pilule est réservée à ce qui se
  presse. La forme distingue désormais ce qu'on remplit de ce qu'on touche ;
- **la moitié des onglets colorés.** Voir §4.

Deux choses ont été **ajoutées**, et ce sont les seules :

- **`hero`**, pour un écran qui n'a qu'une chose à dire ;
- **`overline`** — petit, espacé, en capitales. C'est la marque la plus reconnaissable de ce
  registre. La mise en capitales est faite par le composant `Text` et non par l'appelant :
  un `toUpperCase()` dans un écran est une chaîne qu'un lecteur d'écran épelle lettre par
  lettre.

## 3. Le thème sombre partage la teinte de l'accent

Ses gris sont construits à partir de `#344D59` plutôt qu'à partir d'un charbon neutre. Un
sombre qui partage la famille se lit comme le même produit lumières éteintes ; un charbon
neutre se lit comme une autre application.

Le thème de course descend plus bas encore — `#0A0F12` — et prend l'accent d'un cran plus
clair : ce qui survit au plein soleil, c'est le contraste, et ce que ce thème existe pour
tenir, c'est un nombre lu à bout de bras avec un bras qui bouge.

## 4. Quatre onglets, et une cloche

L'ajout d'un onglet « Réglages » aurait porté la barre à **six** entrées sur mobile. Une
barre à six est une barre qu'on ne lit plus.

Les notifications sont donc reparties sur **la cloche de l'accueil**, avec leur pastille de
non-lues — là où la maquette de référence les mettait au départ. Résultat : quatre onglets
sur le web, cinq sur mobile (l'enregistrement, que le web n'a pas). Rien n'est devenu
inatteignable ; une chose a cessé d'occuper une place permanente.

## 5. La présentation, et ce qu'elle ne fait pas

Trois panneaux, une idée chacun, une seule chose à presser. Un onboarding qui explique six
fonctions n'en enseigne aucune, et quelqu'un qui ouvre une application de course sait déjà à
quoi elle sert. Ce qu'il ignore, c'est ce qui distingue celle-ci : l'enregistrement écran
verrouillé, le suivi en direct, le lien qui s'ouvre sans compte.

**Elle ne demande aucune permission.** Les §6 et §12 sont explicites : l'invite de
localisation appartient à la première course, celle des notifications au moment où
quelqu'un en veut. Un écran de bienvenue qui ouvre deux boîtes de dialogue système est la
façon la plus sûre de se les faire refuser toutes les deux.

**Elle ne détourne que les points d'entrée** — `/` et `/sign-in`. Un lien de partage reçu
par quelqu'un qui n'a pas l'application, ou une notification qui pointe vers une course,
ouvrent ce qu'ils annoncent. Une garde qui happe toutes les routes casse exactement ce que
les liens profonds existent pour faire ; la suite de bout en bout le vérifie.

## 6. Les réglages : ce qui appartient au téléphone, et ce qui appartient au compte

Le partage compte, et il est facile de le rater : **le thème et la visibilité par défaut
d'une nouvelle course appartiennent à ce téléphone**, tandis que la visibilité du compte et
les préférences de notification appartiennent au serveur et ont leur propre écran. Les
mélanger dans une seule liste suggérerait que changer le thème ici le change sur l'autre
appareil.

« Selon le système » est un **vrai troisième choix**, pas l'absence de choix : un téléphone
qui bascule au coucher du soleil doit emmener l'application avec lui, ce qu'un `'dark'`
stocké ne ferait pas. Il est donc résolu à chaque rendu, jamais enregistré.

La visibilité par défaut **échoue fermée** — `FOLLOWERS` — comme toutes les visibilités de
cette application. Et une préférence illisible retombe sur sa valeur par défaut plutôt que
d'être crue : un fichier à demi écrit ne doit pas mettre l'application dans un état pour
lequel elle n'a pas de code.

## 7. Ce qui n'a pas changé

L'accessibilité. Les 119 assertions de contraste, les regroupements d'annonce, les cibles de
44 points, le texte qui survit à 200 % : rien n'a été assoupli pour faire passer une
couleur. C'était le risque d'une refonte de palette, et le test de contraste est ce qui l'a
rendu impossible — il tournait à chaque étape, et il a validé la nouvelle palette avant que
le premier écran ne soit touché.
