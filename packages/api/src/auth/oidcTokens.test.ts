import { describe, expect, it } from 'vitest';
import { FixedClock, endsSession, isRunTrackError } from '@runtrack/core';
import { OidcTokens } from './oidcTokens';

const CONFIGURATION = {
  issuerUri: 'https://id.runtrack.test/realms/runtrack',
  clientId: 'runtrack-app',
  redirectUri: 'runtrack://auth/callback',
};

/** A token whose payload carries only what the session needs: the subject. */
const ACCESS_TOKEN =
  'header.' +
  Buffer.from(JSON.stringify({ sub: '0198c4d2-7f31-7a42-9c55-1b2c3d4e5f60' }))
    .toString('base64url') +
  '.signature';

interface Call {
  url: string;
  body: string;
}

function respondWith(status: number, payload: unknown, calls: Call[] = []) {
  return (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, body: typeof init?.body === 'string' ? init.body : '' });
    return Promise.resolve(new Response(JSON.stringify(payload), { status }));
  };
}

/** A transport that never reaches anyone: no status, no body, just a failure. */
function unreachable(): Promise<Response> {
  return Promise.reject(new TypeError('Network request failed'));
}

describe('OidcTokens', () => {
  const clock = new FixedClock(1_000_000);

  it('turns an authorization code into a session', async () => {
    const calls: Call[] = [];
    const tokens = new OidcTokens(
      CONFIGURATION,
      clock,
      respondWith(200, { access_token: ACCESS_TOKEN, refresh_token: 'r1', expires_in: 900 }, calls),
    );

    const session = await tokens.exchangeCode('the-code', 'the-verifier');

    expect(session.userId).toBe('0198c4d2-7f31-7a42-9c55-1b2c3d4e5f60');
    expect(session.refreshToken).toBe('r1');
    expect(session.accessTokenExpiresAt).toBe(1_000_000 + 900_000);
    expect(calls[0]?.url).toBe(`${CONFIGURATION.issuerUri}/protocol/openid-connect/token`);
  });

  /** Without the verifier, an intercepted code would be enough to take the session. */
  it('sends the code verifier along with the code', async () => {
    const calls: Call[] = [];
    const tokens = new OidcTokens(
      CONFIGURATION,
      clock,
      respondWith(200, { access_token: ACCESS_TOKEN, refresh_token: 'r1', expires_in: 900 }, calls),
    );

    await tokens.exchangeCode('the-code', 'the-verifier');

    expect(calls[0]?.body).toContain('code_verifier=the-verifier');
    expect(calls[0]?.body).toContain('grant_type=authorization_code');
  });

  it('exchanges a refresh token for a new session', async () => {
    const calls: Call[] = [];
    const tokens = new OidcTokens(
      CONFIGURATION,
      clock,
      respondWith(200, { access_token: ACCESS_TOKEN, refresh_token: 'r2', expires_in: 900 }, calls),
    );

    const session = await tokens.refresh('r1');

    expect(session.refreshToken).toBe('r2');
    expect(calls[0]?.body).toContain('grant_type=refresh_token');
  });

  /**
   * The one answer that means "this session is over". Left as a generic failure,
   * the application would retry a token the realm has already buried.
   */
  it('reports a rejected refresh as an ended session', async () => {
    const tokens = new OidcTokens(
      CONFIGURATION,
      clock,
      respondWith(400, { error: 'invalid_grant', error_description: 'Token is not active' }),
    );

    await expect(tokens.refresh('stale')).rejects.toSatisfy(
      (error: unknown) => isRunTrackError(error) && endsSession(error),
    );
  });

  /** Any other refusal is a failure, not a reason to sign someone out. */
  it('keeps other refusals out of the sign-out path', async () => {
    const tokens = new OidcTokens(
      CONFIGURATION,
      clock,
      respondWith(500, { error: 'server_error' }),
    );

    await expect(tokens.refresh('r1')).rejects.toSatisfy(
      (error: unknown) => isRunTrackError(error) && !endsSession(error),
    );
  });

  it('refuses a response that carries no tokens', async () => {
    const tokens = new OidcTokens(CONFIGURATION, clock, respondWith(200, { expires_in: 900 }));

    await expect(tokens.refresh('r1')).rejects.toThrow(/incomplète/);
  });

  it('reports an unreachable provider rather than hanging', async () => {
    const tokens = new OidcTokens(CONFIGURATION, clock, unreachable);

    await expect(tokens.refresh('r1')).rejects.toThrow(/injoignable/);
  });

  /**
   * Signing out must not depend on the network: the tokens are dropped locally
   * whatever the realm answers, so a failure here is swallowed on purpose.
   */
  it('signs out even when the realm cannot be reached', async () => {
    const tokens = new OidcTokens(CONFIGURATION, clock, unreachable);

    await expect(tokens.logOut('r1')).resolves.toBeUndefined();
  });
});
