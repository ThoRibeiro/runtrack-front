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
