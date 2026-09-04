import { RunTrackError, type Clock, type Session } from '@runtrack/core';
import { subjectOf } from './jwt';
import type { Fetch } from '../http/httpClient';

/**
 * The realm's token endpoint, and nothing else.
 *
 * These three exchanges are plain form posts, so they are written here rather
 * than left to the authorization library: they run far more often than a sign-in
 * — every refresh, on every launch — and this way they are covered by tests that
 * need neither a browser nor a device.
 *
 * The application's own `HttpClient` is not used: it speaks to the RunTrack API,
 * carries a bearer, and would refresh on a 401. Pointing it at the provider
 * would be asking the thing that renews sessions to renew a session.
 */
export interface OidcConfiguration {
  /** The realm, as it appears in the `iss` claim. */
  issuerUri: string;
  clientId: string;
  redirectUri: string;
}

/**
 * The provider's answer, read field by field.
 *
 * Asserting a shape onto `response.json()` would be trusting a remote body to be
 * what it claims; the lint rules forbid it, and rightly — a malformed answer
 * would surface as `undefined` somewhere far from here.
 */
interface TokenResponse {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  expiresInSeconds: number;
  error: string | undefined;
  errorDescription: string | undefined;
}

function readTokenResponse(payload: unknown): TokenResponse {
  const fields: Record<string, unknown> =
    typeof payload === 'object' && payload !== null ? { ...payload } : {};
  const expiresIn = fields['expires_in'];

  return {
    accessToken: readString(fields, 'access_token'),
    refreshToken: readString(fields, 'refresh_token'),
    expiresInSeconds: typeof expiresIn === 'number' ? expiresIn : 0,
    error: readString(fields, 'error'),
    errorDescription: readString(fields, 'error_description'),
  };
}

function readString(fields: Record<string, unknown>, key: string): string | undefined {
  const value = fields[key];
  return typeof value === 'string' ? value : undefined;
}

export class OidcTokens {
  private readonly fetchImpl: Fetch;

  constructor(
    private readonly configuration: OidcConfiguration,
    private readonly clock: Clock,
    fetchImpl?: Fetch,
  ) {
    this.fetchImpl = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  }

  get authorizationEndpoint(): string {
    return `${this.configuration.issuerUri}/protocol/openid-connect/auth`;
  }

  get tokenEndpoint(): string {
    return `${this.configuration.issuerUri}/protocol/openid-connect/token`;
  }

  get endSessionEndpoint(): string {
    return `${this.configuration.issuerUri}/protocol/openid-connect/logout`;
  }

  /**
   * Turns an authorization code into a session.
   *
   * `code_verifier` is what makes this safe on a public client: the code alone
   * is useless to whoever intercepts the redirect, since only the app that
   * started the flow holds the secret it was derived from.
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<Session> {
    return this.post({
      grant_type: 'authorization_code',
      client_id: this.configuration.clientId,
      redirect_uri: this.configuration.redirectUri,
      code,
      code_verifier: codeVerifier,
    });
  }

  /** §11: single-use, one call in flight. `RefreshCoordinator` guarantees it. */
  async refresh(refreshToken: string): Promise<Session> {
    return this.post({
      grant_type: 'refresh_token',
      client_id: this.configuration.clientId,
      refresh_token: refreshToken,
    });
  }

  /**
   * Ends the session at the realm.
   *
   * A failure is swallowed: this device is signing out either way, and leaving
   * someone on a screen they cannot leave because the network is down would be
   * the worse outcome. The tokens are dropped locally regardless.
   */
  async logOut(refreshToken: string): Promise<void> {
    try {
      await this.fetchImpl(this.endSessionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({
          client_id: this.configuration.clientId,
          refresh_token: refreshToken,
        }),
      });
    } catch {
      // Nothing to recover: the session is gone from this device either way.
    }
  }

  private async post(fields: Record<string, string>): Promise<Session> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form(fields),
      });
    } catch {
      // No status, no body: the catalogue has no code for "the network gave up",
      // and inventing one would only be silently narrowed back to UNKNOWN.
      throw new RunTrackError({
        code: 'UNKNOWN',
        message: 'Le fournisseur d’identité est injoignable',
      });
    }

    const payload = readTokenResponse(await response.json().catch(() => undefined));
    if (!response.ok) {
      // `invalid_grant` is the expired, revoked or already-replayed refresh
      // token — the one answer that means the session is over rather than that
      // something went wrong. It is mapped onto the catalogue's own code so that
      // `endsSession` recognises it and the app signs out instead of retrying.
      throw new RunTrackError({
        code: payload.error === 'invalid_grant' ? 'REFRESH_TOKEN_EXPIRED' : 'UNKNOWN',
        message: payload.errorDescription ?? 'Le fournisseur d’identité a refusé la demande',
      });
    }

    const { accessToken, refreshToken } = payload;
    if (accessToken === undefined || refreshToken === undefined) {
      throw new RunTrackError({
        code: 'UNKNOWN',
        message: 'Réponse du fournisseur d’identité incomplète',
      });
    }

    return {
      // The realm's `sub` is the account identifier, by decision: see the
      // back-end's docs/decisions-keycloak.md.
      userId: subjectOf(accessToken),
      accessToken,
      refreshToken,
      accessTokenExpiresAt: this.clock.now() + payload.expiresInSeconds * 1000,
    };
  }
}

function form(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}
