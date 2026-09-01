import { MemoryKeyValueStore, createPersister } from '@runtrack/features';
import type { KeyValueStore } from '@runtrack/features';

/**
 * §9 : ce qui a déjà été lu reste lisible hors connexion.
 *
 * `localStorage` quand il existe — une fenêtre privée, un navigateur qui bloque
 * le stockage et il n'existe pas — et une mémoire volatile sinon. Le cache est
 * une optimisation : ne pas pouvoir l'écrire coûte un rechargement, pas un
 * écran cassé.
 *
 * Rien de sensible n'y va : la session vit dans `WebSecureStore`, chiffrée, et
 * la liste blanche de `shouldPersistQuery` ne laisse passer que le fil et les
 * courses déjà ouvertes.
 */
function storage(): KeyValueStore {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Un navigateur qui refuse l'accès au stockage lève à la lecture même.
  }
  return new MemoryKeyValueStore();
}

export const persister = createPersister(storage());
