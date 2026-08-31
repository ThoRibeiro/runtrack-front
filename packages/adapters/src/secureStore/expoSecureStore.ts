import * as SecureStore from 'expo-secure-store';
import type { SecureStore as SecureStorePort, Session } from '@runtrack/core';
import { decodeSession, encodeSession } from './sessionCodec';

/**
 * Keychain on iOS, Keystore on Android — §11's requirement, and the only
 * storage on a phone that a rooted-device check cannot replace.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` is chosen deliberately: the token is not
 * carried into an iCloud backup and does not follow the user onto a new phone.
 * A refresh token restored from a backup is a token the server has long since
 * rotated, and presenting it triggers the reuse detection of §11 — the user
 * would be signed out for restoring a backup.
 */
const KEY = 'runtrack.session';

export class ExpoSecureStore implements SecureStorePort {
  async read(): Promise<Session | undefined> {
    return decodeSession(await SecureStore.getItemAsync(KEY));
  }

  async write(session: Session): Promise<void> {
    await SecureStore.setItemAsync(KEY, encodeSession(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  }
}
