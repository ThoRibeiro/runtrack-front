# `@runtrack/api` — client HTTP et types générés

Livré au **lot 4**. Il implémente les gateways de `@runtrack/core` par-dessus `fetch`, et il
est le seul paquet à connaître la forme du réseau.

## Régénérer les types

```bash
pnpm --filter @runtrack/api openapi:refresh   # recopie l'openapi.json du back-end
pnpm --filter @runtrack/api generate          # openapi-typescript → src/generated/schema.ts
```

`openapi/openapi.json` est **versionné** volontairement : `runtrack-app/target/` est un
artefact de build, et une génération qui dépend d'un `mvn verify` récent est une génération
qui casse en CI. L'instantané est le contrat contre lequel ce client a été écrit ; le
rafraîchir est un geste délibéré qui apparaît dans un diff.

Le fichier est produit par `OpenApiIT` côté back-end :

```bash
JAVA_HOME=~/.sdkman/candidates/java/25-tem mvn -o verify
```

## Ce qu'il ne faut pas chercher ici

- **le refresh unique du §11 n'est pas dans le client HTTP** mais dans
  `auth/refreshCoordinator.ts`, parce que c'est une règle de coordination et pas de
  transport. Le client l'appelle, il ne l'implémente pas ;
- **les adaptateurs de plateforme** (GPS, SQLite, Keychain, carte, push) sont dans
  `packages/adapters` : ils diffèrent d'une cible à l'autre, ce client non.
