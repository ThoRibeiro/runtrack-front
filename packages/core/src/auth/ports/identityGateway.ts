import type { Session } from '../domain/session';

/**
 * The identity provider, as the application needs it.
 *
 * Deliberately smaller than {@link ../ports/authGateway AuthGateway}: signing
 * up, confirming an address and resetting a password are the provider's screens
 * now, reached through the same browser as the sign-in. What is left is what the
 * application still has to do itself — obtain a session, keep it alive, end it.
 *
 * `logIn` hides an entire authorization flow: a browser opens on the provider,
 * the person authenticates there, and a redirect comes back with a code that is
 * exchanged for tokens. None of that belongs in `core` — the port says what is
 * obtained, not how — and the platform-specific half lives in `adapters`.
 */
export interface IdentityGateway {
  /**
   * Opens the provider's flow and settles once a session exists.
   *
   * Rejects if the person closes the browser instead of authenticating, which
   * is a cancellation and not an error: the screen must not shout about it.
   */
  logIn(): Promise<Session>;

  /**
   * Exchanges a refresh token for a new session.
   *
   * Single-use, exactly as before: the realm rotates and detects replay, so the
   * caller must still guarantee one call in flight (§11). `RefreshCoordinator`
   * remains the only thing allowed to call this.
   */
  refresh(refreshToken: string): Promise<Session>;

  /**
   * Ends the session at the provider as well as here.
   *
   * A local sign-out alone would leave the provider's own session standing, and
   * the next "sign in" would come straight back with no question asked — which
   * reads as a sign-out that did not work.
   */
  logOut(refreshToken: string): Promise<void>;
}

/** Raised when the person closed the provider's browser without signing in. */
export const AUTHORIZATION_CANCELLED = 'AUTHORIZATION_CANCELLED';
