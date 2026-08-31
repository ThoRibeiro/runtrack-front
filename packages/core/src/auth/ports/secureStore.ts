import type { Session } from '../domain/session';

/**
 * Where the tokens live: Keychain on iOS, Keystore on Android, and on the web
 * anywhere **but** `localStorage` — §11 and §15 both forbid a refresh token
 * there, because any script on the page can read it.
 *
 * The port hides which, and that is the point: the hexagon must not know that
 * one of the three is a compromise.
 */
export interface SecureStore {
  read(): Promise<Session | undefined>;
  write(session: Session): Promise<void>;
  clear(): Promise<void>;
}
