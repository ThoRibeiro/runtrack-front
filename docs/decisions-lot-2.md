# Lot 2 — Design system : les décisions

_Écrit le 2026-08-31. Ce que le cahier des charges laisse ouvert, tranché ici. Toutes les
valeurs de contraste citées sont **mesurées**, pas estimées : `packages/ui/src/theme/contrast.test.ts`
les revérifie à chaque build._

> **La palette de ce document n'est plus celle du produit.** L'orange et les pastilles
> colorées ont été remplacés après le lot 13 par cinq bleus-verts — voir
> [`decisions-design.md`](decisions-design.md). Ce qui suit reste le compte rendu de ce qui
> a été décidé au lot 2, y compris les trois écarts de contraste que le test avait trouvés :
> ils expliquent pourquoi le garde-fou existe, et c'est lui qui a validé la nouvelle palette
> avant qu'un seul écran ne soit touché.

---

## 1. Trois écarts sur la palette, et c'est le test qui les a trouvés

Le §3 donne des valeurs « relevées à l'œil » et demande, deux paragraphes plus loin, de
**vérifier les rapports au build**. Fait. Trois d'entre elles ne passent pas le seuil AA de
4,5:1 là où elles servent, exactement comme l'orange que le §3 signale lui-même.

| Token                   | Valeur du §3 | Là où il sert                                    | Mesuré                   | Retenu    | Mesuré |
| ----------------------- | ------------ | ------------------------------------------------ | ------------------------ | --------- | ------ |
| `text-muted`            | `#8A8A8E`    | unités, libellés — donc du **texte**             | **3,44:1** sur blanc     | `#6A6A6D` | 5,39:1 |
| `brand-600`             | `#C8391A`    | texte orange, y compris **sur la carte teintée** | **4,39:1** sur `#FDE8E1` | `#BE3618` | 4,77:1 |
| texte de la puce d'info | `#4C6FE7`    | sur `#E8EDFB`                                    | **3,79:1**               | `#3E5CC4` | 5,08:1 |

`#8A8A8E` n'est pas jeté pour autant : il devient `borderStrong`, la **bordure de champ**,
où le seuil est de 3:1 et où il donne 3,44:1. C'est le même raisonnement que les deux
oranges — une couleur qui échoue comme texte peut très bien servir ailleurs.

**Le bouton plein, troisième conséquence du piège du §3.** Une étiquette blanche sur
`#EE4A22` donne 3,72:1 : le §3 le dit, et n'en tire pas la conclusion. Elle est ici. Le
bouton plein est posé sur **`brand-600`** (`brand.solid`), où le blanc donne **5,18:1**.
Le `brand-500` garde tout ce sur quoi rien n'est écrit : anneau, tracé de carte, forme de
l'onglet actif, pastilles, courbes.

**Les pastilles colorées ne sont pas des éléments porteurs de sens.** Le §5 exige 3:1 pour
un « élément non textuel porteur de sens », et le §5 dit aussi que la pastille porte une
icône **et** un libellé. Ce qui doit donc passer 3:1, c'est **l'icône contre la pastille**,
pas la pastille contre la carte — le jaune `#FDBE1E` ne fait que 1,67:1 sur blanc et n'a
pas à faire mieux. C'est pourquoi chaque accent déclare son `on` : sombre sur le jaune et
sur le vert (11:1), **blanc sur le violet** (4,93:1, contre 3,74:1 en sombre).

**Trois ajouts assumés** : `danger`, `success` et `focusRing`. Le §3 ne les donne pas, et
le §5 les rend obligatoires — une erreur de formulaire n'est pas qu'un bord rouge, et un
focus invisible sur le web est un piège au clavier. L'anneau de focus est **bleu**
délibérément : il doit se distinguer d'un remplissage de marque au premier coup d'œil.

## 2. Forme des tokens, appliquée

Deux couches, comme annoncé au lot 1. `tokens/palette.ts` nomme les couleurs par ce
qu'elles **sont** ; `theme/{light,dark,run}.ts` les nomme par ce à quoi elles **servent**.
Un composant ne lit que la seconde. C'est ce qui rend « du texte `brand-500` sur fond
clair » — l'interdit du §15 — non pas déconseillé mais **inatteignable** : le nom
`brand.text` n'existe qu'en une seule valeur par thème, et elle est mesurée.

Le mouvement est dans le même dossier que les couleurs (`tokens/motion.ts`), et les
dimensions aussi (`tokens/size.ts`) : sans ça, `height: 44` finit écrit à trois endroits
avec trois valeurs.

**Les trois thèmes sont déclarés token par token.** Le thème de course n'est pas une
inversion du clair : son fond teinté est `#2A100A` et non `#3A1A12`, parce que le
`brand-500` y sert de **texte** — 4,79:1 au lieu de 4,22:1. Le test l'a attrapé.

## 3. `FormField` : la règle du §3 rendue impossible à contourner

Le §3 dit que `radio`, `checkbox` et `switch` ne s'utilisent **jamais** seuls. Une
convention se contourne ; un type, non.

`FormField` produit un `FormFieldBinding` marqué par un symbole **non exporté**. `Switch`,
`Checkbox` et `RadioGroup` exigent ce binding. Écrire `<Switch />` hors d'un `FormField`
ne compile pas — il n'existe aucun moyen de fabriquer la marque depuis l'extérieur du
fichier.

Le binding porte le nom accessible (« Heures calmes », « Adresse e-mail, obligatoire »),
l'indice, l'erreur et l'identifiant. C'est le §5 en une valeur.

## 4. Pourquoi `Pressable` n'utilise pas `GestureDetector`

Le §4 demande `react-native-gesture-handler` pour les gestes. Un `Gesture.Tap()` tourne
entièrement sur le fil d'interface, ce qui est mieux — mais **ce n'est pas ce que VoiceOver
et TalkBack activent**, et ça ne donne rien à un clavier sur le web. Le `Pressable` de
React Native porte la sémantique : rôle, focus, `onAccessibilityTap`, Entrée et Espace sur
le web.

Le compromis retenu : la **sémantique** vient de React Native, l'**animation** est une
valeur partagée Reanimated — donc sur le fil d'interface, jamais sur l'état React.
Gesture-handler est utilisé là où il paye vraiment : le panneau glissant, qui doit porter
la vélocité du poignet, et le curseur.

Le panneau, justement, coche les deux critères du §4 : le geste **interrompt** l'animation
(`onBegin` lit la position courante du ressort) et le relâchement **porte la vélocité**
(`projected = position + vélocité × 0,15`, puis accrochage au point projeté).

## 5. Icônes dessinées à la main plutôt qu'une police d'icônes

34 icônes, tracées sur la même grille 24 × 24, même épaisseur, mêmes bouts ronds. Deux
raisons : une police d'icônes embarque **tous** ses glyphes que le bundle les utilise ou
non, et le §14 met le bundle web au régime ; et un jeu tracé sur une seule grille est ce
qui fait qu'un ensemble ressemble à un ensemble.

Une icône est **décorative par défaut** : c'est le `Text` à côté, ou l'`accessibilityLabel`
du bouton autour, qui dit ce qu'elle veut dire. Le §15 est explicite là-dessus, et
`FloatingIconButton` va plus loin : son `accessibilityLabel` est **obligatoire**, sans
valeur par défaut.

## 6. Ce que le lot 2 ne fait pas

- **aucun écran** : le §3 l'interdit avant la fin de ce lot, et il n'y en a aucun ;
- pas de transition d'élément partagé entre la carte du fil et la course : elle a besoin
  des deux écrans pour exister, elle arrive au lot 6 ;
- pas de test Playwright ni `@axe-core` : ils ont besoin d'une coque avec des pages, lot 5 ;
- pas de passe manuelle VoiceOver / TalkBack : elle se fait sur un appareil, avant chaque
  livraison de lot, et elle n'est pas remplaçable par ce qui précède. **Les outils
  automatiques couvrent environ un tiers des critères** — les 166 tests de ce lot vérifient
  rôle, nom et état ; ils ne savent pas dire qu'une carte se lit en quatre fragments.

## 7. Le budget du §14 : la mesure a doublé

Le lot 1 relevait 282 Ko compressés pour une coque **vide**. Avec le design system monté
dans la mise en page racine :

| Étape                             | Bundle web, gzip |
| --------------------------------- | ---------------- |
| coque vide (lot 1)                | 282 Ko           |
| + design system, tel quel         | **556 Ko**       |
| + tree-shaking Metro expérimental | **495 Ko**       |
| budget du §14                     | 250 Ko           |

Il n'y a toujours **aucun écran** dans ces 495 Ko. Le supplément n'est pas fait de mes
composants : c'est `react-native-reanimated`, `react-native-gesture-handler`,
`react-native-svg` et `FlashList` — quatre bibliothèques que les §4, §8 et §14 imposent
eux-mêmes.

La recommandation du lot 1 tient et se précise : plafonner le **poids ajouté par le code
applicatif** plutôt que le total, et servir les pages publiques `/shared/{token}` depuis
une entrée séparée qui n'embarque ni le routeur complet ni le design system. Le total, lui,
est fixé par la pile, pas par la discipline.

**Réglage appliqué** : la route `/gallery` est retirée du bundle de production par le
`blockList` de Metro. Un garde `__DEV__` à l'exécution ne suffisait pas — l'import étant
statique, Metro embarquait la galerie et les 36 composants qu'elle monte.
