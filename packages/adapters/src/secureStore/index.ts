import { Platform } from 'react-native';
import type { SecureStore } from '@runtrack/core';
import { ExpoSecureStore } from './expoSecureStore';
import { WebSecureStore } from './webSecureStore';

export { ExpoSecureStore } from './expoSecureStore';
export { WebSecureStore } from './webSecureStore';
export { isCryptoKey, isEncryptedSession } from './webSecureStore';
export type { KeyStorage } from './webSecureStore';
export { MemoryKeyStorage } from './memoryKeyStorage';
export { decodeSession, encodeSession } from './sessionCodec';

/**
 * The one place that knows there are two of them. Everything upstream sees the
 * `SecureStore` port and nothing else — which is the whole point of §2.
 */
export function secureStoreForPlatform(): SecureStore {
  return Platform.OS === 'web' ? new WebSecureStore() : new ExpoSecureStore();
}
