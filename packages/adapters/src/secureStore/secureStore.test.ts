import { userId, type Session } from '@runtrack/core';
import { ExpoSecureStore } from './expoSecureStore';
import { MemoryKeyStorage } from './memoryKeyStorage';
import { WebSecureStore, isCryptoKey, isEncryptedSession } from './webSecureStore';
import { decodeSession, encodeSession } from './sessionCodec';

const session: Session = {
  userId: userId('u-42'),
  accessToken: 'access-secret',
  refreshToken: 'refresh-secret',
  accessTokenExpiresAt: 1_700_000_900_000,
};

describe.each([
  ['Keychain / Keystore', () => new ExpoSecureStore()],
  ['navigateur, chiffré', () => new WebSecureStore(new MemoryKeyStorage())],
])('%s', (_name, make) => {
  it('rend une session écrite', async () => {
    const store = make();
    await store.write(session);

    expect(await store.read()).toEqual(session);
  });

  it('ne rend rien avant la première écriture', async () => {
    const store = make();
    await store.clear();

    expect(await store.read()).toBeUndefined();
  });

  it('oublie tout après une déconnexion', async () => {
    const store = make();
    await store.write(session);
    await store.clear();

    expect(await store.read()).toBeUndefined();
  });

  it('remplace la session au lieu d’en accumuler', async () => {
    const store = make();
    await store.write(session);
    await store.write({ ...session, refreshToken: 'rotated' });

    expect((await store.read())?.refreshToken).toBe('rotated');
  });
});

describe('stockage web', () => {
  const asText = (buffer: ArrayBuffer): string =>
    [...new Uint8Array(buffer)].map((byte) => String.fromCodePoint(byte)).join('');

  const encrypted = (storage: MemoryKeyStorage) => {
    const stored = storage.peek('session.payload');
    if (!isEncryptedSession(stored)) throw new Error('charge chiffrée attendue');
    return stored;
  };

  const storedKey = (storage: MemoryKeyStorage) => {
    const key = storage.peek('session.key');
    if (!isCryptoKey(key)) throw new Error('clé attendue');
    return key;
  };

  it('n’écrit aucun jeton en clair dans le stockage du navigateur', async () => {
    // §15 : « un jeton de rafraîchissement dans localStorage ». Ce test regarde
    // ce qui atterrit vraiment, pas ce que l'API promet.
    const storage = new MemoryKeyStorage();
    await new WebSecureStore(storage).write(session);

    const stored = asText(encrypted(storage).ciphertext);
    expect(stored).not.toContain('refresh-secret');
    expect(stored).not.toContain('access-secret');
    expect(stored).not.toContain('u-42');
    expect(stored.length).toBeGreaterThan(0);
  });

  it('garde une clé que personne ne peut extraire, pas même nous', async () => {
    const storage = new MemoryKeyStorage();
    await new WebSecureStore(storage).write(session);

    const key = storedKey(storage);

    expect(key.extractable).toBe(false);
    // C'est ce qui rend inutile le vidage du stockage vers un serveur distant :
    // la clé refuse d'être sérialisée.
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  });

  it('change de vecteur d’initialisation à chaque écriture', async () => {
    // Réutiliser un IV sous AES-GCM transforme le chiffrement en décoration.
    const storage = new MemoryKeyStorage();
    const store = new WebSecureStore(storage);

    await store.write(session);
    const first = [...encrypted(storage).iv];
    await store.write(session);
    const second = [...encrypted(storage).iv];

    expect(first).not.toEqual(second);
  });

  it('réutilise la même clé d’une écriture à l’autre', async () => {
    const storage = new MemoryKeyStorage();
    const store = new WebSecureStore(storage);

    await store.write(session);
    const first = storedKey(storage);
    await store.write({ ...session, refreshToken: 'rotated' });

    expect(storedKey(storage)).toBe(first);
    expect((await store.read())?.refreshToken).toBe('rotated');
  });

  it('relit une session écrite par une autre instance', async () => {
    // Le cas du rechargement de page : la clé vient du stockage, pas du cache.
    const storage = new MemoryKeyStorage();
    await new WebSecureStore(storage).write(session);

    expect(await new WebSecureStore(storage).read()).toEqual(session);
  });

  it('repart d’une session vide plutôt que de tomber si la charge est illisible', async () => {
    const storage = new MemoryKeyStorage();
    const store = new WebSecureStore(storage);
    await store.write(session);
    await storage.write('session.payload', {
      iv: new Uint8Array(12),
      ciphertext: new ArrayBuffer(16),
    });

    expect(await store.read()).toBeUndefined();
    // Et il nettoie derrière lui, pour ne pas réessayer à chaque lancement.
    expect(storage.peek('session.payload')).toBeUndefined();
  });
});

describe('codec de session', () => {
  it('fait l’aller-retour', () => {
    expect(decodeSession(encodeSession(session))).toEqual(session);
  });

  it('rend « pas de session » sur tout ce qui n’en est pas une', () => {
    // Ce qui revient a pu être écrit par une version plus ancienne : renvoyer
    // « pas de session » envoie à l'écran de connexion, ce qui est la bonne
    // sortie. Tomber au lancement ne l'est pas.
    for (const raw of [
      null,
      undefined,
      '',
      'pas du json',
      '[]',
      '{}',
      '{"userId":"","accessToken":"a","refreshToken":"r","accessTokenExpiresAt":1}',
      '{"userId":"u","accessToken":"a","refreshToken":"r"}',
      '{"userId":"u","accessToken":"a","refreshToken":"r","accessTokenExpiresAt":"bientôt"}',
    ]) {
      expect(decodeSession(raw)).toBeUndefined();
    }
  });
});
