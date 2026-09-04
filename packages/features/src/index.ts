export * from './i18n';
export * from './format';
export * from './runtime';
export * from './query';
export * from './session';
export * from './auth';
export * from './feed';
export * from './activity';
export * from './user';
export * from './social';
export * from './map';
export * from './live';
export * from './notification';
export * from './engagement';
export * from './preferences';

// Les échanges avec le fournisseur d'identité sont dans `@runtrack/api`, dont
// les coques ne dépendent pas — elles ne connaissent que cette façade. Les
// ré-exporter ici leur évite d'ouvrir une dépendance sur la couche HTTP pour
// trois lignes d'assemblage.
export { OidcTokens } from '@runtrack/api';
export type { OidcConfiguration } from '@runtrack/api';

// L'enregistrement n'est pas ici : §2, seul le mobile enregistre, et un
// `export *` mettrait ses écrans dans le bundle web — sept kilo-octets de code
// qu'un navigateur ne peut pas exécuter. Il vit derrière
// `@runtrack/features/recording`, que seule la coque mobile importe.
