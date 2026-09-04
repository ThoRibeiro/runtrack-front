export {
  ExpoSecureStore,
  WebSecureStore,
  MemoryKeyStorage,
  decodeSession,
  isCryptoKey,
  isEncryptedSession,
  encodeSession,
  secureStoreForPlatform,
} from './secureStore';
export type { KeyStorage } from './secureStore';

// Carte — le décodeur et le contrat du composant. Les deux surfaces vivent
// derrière `@runtrack/adapters/map/native` et `@runtrack/adapters/map/web` :
// mêlées ici, chaque coque embarquerait la carte de l'autre plateforme.
export {
  ChunkedTrackDecoder,
  messageChannelYielder,
  timeoutYielder,
  yielderForPlatform,
} from './map';
export type {
  ChunkedTrackDecoderOptions,
  MapSurfaceColours,
  MapSurfaceComponent,
  MapSurfaceProps,
  Yielder,
} from './map';

// Le champ date — seulement son contrat. Comme la carte, les deux surfaces
// vivent derrière `@runtrack/adapters/datetime/{native,web}` : le calendrier de
// l'OS et celui du navigateur n'ont rien en commun, et chaque coque n'embarque
// que le sien.
export type {
  DateFieldColours,
  DateFieldProps,
  DateFieldSurface,
} from './datetime/dateFieldSurface';

// Le temps et l'aléa de la plateforme, derrière leurs ports.
export { SystemRandom, SystemScheduler } from './system/systemScheduler';
export { AlwaysOnlineMonitor, BrowserNetworkMonitor } from './system/browserNetworkMonitor';

// L'enregistrement n'est pas ici. §2 : seul le mobile enregistre, et tout ce que
// cet index exporte finit dans le bundle web — un tampon SQLite compris.
// Il vit derrière `@runtrack/adapters/recording/native`, qui de surcroît
// enregistre une tâche système au chargement : rien à faire dans un navigateur.
