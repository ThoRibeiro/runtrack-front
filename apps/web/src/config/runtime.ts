import { BrowserNetworkMonitor, secureStoreForPlatform } from '@runtrack/adapters';
import { WebMapSurface } from '@runtrack/adapters/map/web';
import { WebDateField } from '@runtrack/adapters/datetime/web';
import { ExpoImagePicker } from '@runtrack/adapters/media';
import { identityFromEnvironment } from './identity';
import { createRuntime, type Runtime } from '@runtrack/features';

/**
 * Built once, at module load, and shared by every screen.
 *
 * The base URL comes from the environment because it differs between a
 * simulator, a device on the same Wi-Fi and production. `process.env` is typed
 * as `any` here — the shells carry no Node types — so the value is checked
 * rather than trusted.
 *
 * The map surface is injected here and not resolved inside `@runtrack/adapters`
 * (§8): a `Platform.OS` test would leave both implementations in both bundles,
 * and MapLibre has no business being shipped to a phone.
 */
const configured: unknown = process.env['EXPO_PUBLIC_API_URL'];
const baseUrl =
  typeof configured === 'string' && configured !== '' ? configured : 'http://localhost:8080';

const CLOCK = { now: () => Date.now() };

export const runtime: Runtime = createRuntime({
  baseUrl,
  secureStore: secureStoreForPlatform(),
  clock: CLOCK,
  // Absente tant qu'aucun realm n'est configuré : l'application garde alors son
  // formulaire de connexion. Voir `identity.ts`.
  identity: identityFromEnvironment(CLOCK),
  map: WebMapSurface,
  dateField: WebDateField,
  // §9 : `navigator.onLine` est faible, mais il a raison sur le cas qui compte
  // — l'onglet qui vient de perdre le Wi-Fi.
  network: new BrowserNetworkMonitor(),
  // Le même sélecteur : sur le web, il ouvre le champ de fichier du navigateur.
  imagePicker: new ExpoImagePicker(),
});
