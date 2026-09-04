import type { IdentityGateway, Session } from '@runtrack/core';

/**
 * What this adapter needs from the authorization library, and nothing more.
 *
 * Named here rather than imported as a type from `expo-auth-session` so that the
 * flow can be driven by a stub in tests: the real one opens a browser and waits
 * for a human, which no test can do.
 */
export interface AuthorizationFlow {
  /**
   * Opens the provider and settles when the browser comes back.
   *
   * Resolves with the code on success, with `cancelled` when the person closed
   * the browser, and rejects only on an actual failure.
   */
  authorize(): Promise<
    { type: 'success'; code: string; codeVerifier: string } | { type: 'cancelled' }
  >;
}

/** The token exchanges, as `packages/api` implements them. */
export interface TokenExchanges {
  exchangeCode(code: string, codeVerifier: string): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  logOut(refreshToken: string): Promise<void>;
}

/**
 * The identity provider, driven through the platform's browser.
 *
 * The split is the point: everything that can be tested — the exchanges, the
 * error mapping — lives in `packages/api`, and what is left here is opening a
 * browser and reading what comes back. A public client cannot hold a secret, so
 * PKCE is what stands between an intercepted redirect and a stolen session; the
 * library generates and carries the verifier.
 */
export class ExpoIdentityGateway implements IdentityGateway {
  constructor(
    private readonly flow: AuthorizationFlow,
    private readonly tokens: TokenExchanges,
  ) {}

  async logIn(): Promise<Session | undefined> {
    const result = await this.flow.authorize();

    // Closing the browser is an answer, not a failure. Raised as an error it
    // would reach the screen as a banner saying something went wrong, next to a
    // sign-in button the person had just decided not to press.
    if (result.type === 'cancelled') {
      return undefined;
    }
    return this.tokens.exchangeCode(result.code, result.codeVerifier);
  }

  async refresh(refreshToken: string): Promise<Session> {
    return this.tokens.refresh(refreshToken);
  }

  async logOut(refreshToken: string): Promise<void> {
    return this.tokens.logOut(refreshToken);
  }
}
