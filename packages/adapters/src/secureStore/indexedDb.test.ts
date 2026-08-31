import { read, remove, write } from './indexedDb';

/**
 * La vraie implémentation, sur des valeurs que la doublure sait cloner. Le
 * chiffrement est testé ailleurs, avec un stockage en mémoire — voir la note
 * de `webSecureStore.ts`.
 */
describe('IndexedDB', () => {
  it('rend ce qui a été écrit', async () => {
    await write('essai', { valeur: 42 });

    expect(await read('essai')).toEqual({ valeur: 42 });
  });

  it('ne rend rien pour une clé absente', async () => {
    expect(await read('jamais-écrite')).toBeUndefined();
  });

  it('remplace une valeur existante', async () => {
    await write('essai', 'premier');
    await write('essai', 'second');

    expect(await read('essai')).toBe('second');
  });

  it('supprime une clé', async () => {
    await write('essai', 'valeur');
    await remove('essai');

    expect(await read('essai')).toBeUndefined();
  });

  it('supprimer une clé absente ne casse rien', async () => {
    await expect(remove('jamais-écrite')).resolves.toBeUndefined();
  });
});
