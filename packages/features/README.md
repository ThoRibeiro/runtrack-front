# `@runtrack/features` — les écrans, découpés par domaine

**Livré à partir du lot 5.**

Les écrans vivent ici et non dans `apps/*` pour une raison : web et mobile partagent toute
la consultation (§2). Les dossiers `src/app/` des deux coques ne contiennent que des
routes fines qui pointent vers un écran d'ici — c'est ce qui rend visible, dans
l'arborescence des routes, ce que le web n'a pas.

Découpage de premier niveau **fonctionnel**, comme au back-end : `auth/`, `activity/`,
`feed/`, `social/`, `engagement/`, `notification/`, `sharing/`, `user/`.
