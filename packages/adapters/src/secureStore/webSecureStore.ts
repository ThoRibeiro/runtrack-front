import type { SecureStore as SecureStorePort, Session } from '@runtrack/core';
import * as indexedDbStorage from './indexedDb';
import { decodeSession, encodeSession, unavailable } from './sessionCodec';

/**
 * §11 and §15 are categorical: the refresh token never goes into
 * `localStorage`. A browser offers nothing equivalent to a Keychain, so this is
 * the honest best available — and its limits are written down rather than
 * glossed over.
 *
 * **What it does.** The session is encrypted with AES-GCM under a key generated
 * with `extractable: false` and kept in IndexedDB. A non-extractable key can be
 * *used* but its bytes can never be read back — not by this code, not by
 * anyone's. So what sits in storage is ciphertext plus a key that cannot be
 * serialised, and a script that dumps browser storage to a remote server
 * carries away nothing usable. That is the common exfiltration, and it is shut.
 *
 * **What it does not do.** An attacker who can run script *in this origin* can
 * call `decrypt` exactly as this code does. This raises the bar; it does not
 * remove the threat. The real answer is a refresh token in an `httpOnly`
 * cookie, which the client cannot decide on its own — the server would have to
 * set it, and today's `/auth/v1/refresh` returns it in the body.
 *
 * That is a change worth asking for, and it is recorded in
 * `docs/decisions-lot-5.md` rather than quietly worked around.
 */
const KEY_ENTRY = 'session.key';
const PAYLOAD_ENTRY = 'session.payload';

interface EncryptedSession {
  /** Explicitly backed by an `ArrayBuffer`: Web Crypto refuses a shared one. */
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
}

/**
 * The three storage calls, injectable.
 *
 * Not for the sake of abstraction: a browser structured-clones a `CryptoKey`,
 * and the IndexedDB double used in the tests does not. Injecting lets the tests
 * exercise the cryptography for real instead of asserting around a limitation
 * of the double — and `indexedDb.test.ts` covers the real implementation on
 * plain values.
 */
export interface KeyStorage {
  read: (key: string) => Promise<unknown>;
  write: (key: string, value: unknown) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

/** Storage hands back `unknown`; these two say what is usable. */
export function isCryptoKey(value: unknown): value is CryptoKey {
  return value instanceof CryptoKey;
}

export function isEncryptedSession(value: unknown): value is EncryptedSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'iv' in value &&
    'ciphertext' in value &&
    value.iv instanceof Uint8Array &&
    value.ciphertext instanceof ArrayBuffer
  );
}

export class WebSecureStore implements SecureStorePort {
  private cachedKey: CryptoKey | undefined;

  constructor(private readonly storage: KeyStorage = indexedDbStorage) {}

  private async key(): Promise<CryptoKey> {
    if (this.cachedKey !== undefined) return this.cachedKey;

    const existing = await this.storage.read(KEY_ENTRY);
    if (isCryptoKey(existing)) {
      this.cachedKey = existing;
      return existing;
    }

    // Web Crypto only exists in a secure context. The DOM library promises it
    // unconditionally, which is why the check has to be written this way.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (globalThis.crypto?.subtle === undefined) {
      // Falling back to plain text here would be exactly what §15 forbids.
      throw unavailable('Web Crypto absent — le site doit être servi en HTTPS');
    }

    const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
    await this.storage.write(KEY_ENTRY, generated);
    this.cachedKey = generated;
    return generated;
  }

  async read(): Promise<Session | undefined> {
    const stored = await this.storage.read(PAYLOAD_ENTRY);
    if (!isEncryptedSession(stored)) return undefined;

    try {
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: stored.iv },
        await this.key(),
        stored.ciphertext,
      );
      return decodeSession(new TextDecoder().decode(plain));
    } catch {
      // A key rotated, a store half-written, a browser that cleared one of the
      // two entries: unreadable means "no session", not "crash at launch".
      await this.clear();
      return undefined;
    }
  }

  async write(session: Session): Promise<void> {
    // A fresh IV per write. Reusing one under AES-GCM is what turns an
    // encryption into a decoration.
    const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await this.key(),
      new TextEncoder().encode(encodeSession(session)),
    );
    await this.storage.write(PAYLOAD_ENTRY, { iv, ciphertext });
  }

  async clear(): Promise<void> {
    this.cachedKey = undefined;
    await this.storage.remove(PAYLOAD_ENTRY);
    await this.storage.remove(KEY_ENTRY);
  }
}
