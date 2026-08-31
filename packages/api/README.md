# `@runtrack/api` — client HTTP

**Livré au lot 4.**

- types **générés** depuis l'OpenAPI du back-end, jamais recopiés à la main. La
  description est produite par `OpenApiIT` et déposée dans
  `runtrack/runtrack-app/target/openapi/openapi.json` ; elle est aussi servie sur
  `/v3/api-docs` et publiée sur GitHub Pages ;
- lecture des erreurs `application/problem+json` **par leur champ `code`**, jamais par le
  statut ;
- pagination par curseur ;
- **un seul refresh en vol** (§11), avec son test des dix requêtes parallèles ;
- `X-Correlation-Id` sur chaque requête.
