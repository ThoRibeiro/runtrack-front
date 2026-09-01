import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersister } from '@runtrack/features';

/**
 * §9 : ce qui a déjà été lu reste lisible hors connexion.
 *
 * `AsyncStorage` et non SQLite : le tampon de points a des exigences que ce
 * cache n'a pas — il doit survivre à un kill au milieu d'une écriture. Ici, un
 * cache perdu coûte un rechargement.
 */
export const persister = createPersister(AsyncStorage);

/** Les préférences client passent par le même stockage — une seule abstraction. */
export const preferencesStorage = AsyncStorage;
