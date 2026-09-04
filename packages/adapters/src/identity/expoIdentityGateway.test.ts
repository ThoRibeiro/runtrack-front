import { userId, type Session } from '@runtrack/core';
import { ExpoIdentityGateway, type AuthorizationFlow, type TokenExchanges } from './expoIdentityGateway';

const SESSION: Session = {
  userId: userId('0198c4d2-7f31-7a42-9c55-1b2c3d4e5f60'),
  accessToken: 'access',
  refreshToken: 'refresh',
  accessTokenExpiresAt: 1_000_000,
};

function exchanges(overrides: Partial<TokenExchanges> = {}): TokenExchanges & { codes: string[] } {
  const codes: string[] = [];
  return {
    codes,
    exchangeCode: (code: string) => {
      codes.push(code);
      return Promise.resolve(SESSION);
    },
    refresh: () => Promise.resolve(SESSION),
    logOut: () => Promise.resolve(),
    ...overrides,
  };
}

const succeeds: AuthorizationFlow = {
  authorize: () =>
    Promise.resolve({ type: 'success', code: 'the-code', codeVerifier: 'the-verifier' }),
};

const cancelled: AuthorizationFlow = {
  authorize: () => Promise.resolve({ type: 'cancelled' }),
};

describe('ExpoIdentityGateway', () => {
  it('turns a completed authorization into a session', async () => {
    const tokens = exchanges();

    const session = await new ExpoIdentityGateway(succeeds, tokens).logIn();

    expect(session).toEqual(SESSION);
    expect(tokens.codes).toEqual(['the-code']);
  });

  /**
   * Someone who closes the browser has answered "not now". Raised as an error,
   * this would reach the screen as a failure banner beside the button they had
   * just decided not to press.
   */
  it('reports a closed browser as no session rather than as a failure', async () => {
    const tokens = exchanges();

    await expect(new ExpoIdentityGateway(cancelled, tokens).logIn()).resolves.toBeUndefined();
    expect(tokens.codes).toEqual([]);
  });

  it('passes the refresh through to the token endpoint', async () => {
    let asked: string | undefined;
    const tokens = exchanges({
      refresh: (token: string) => {
        asked = token;
        return Promise.resolve(SESSION);
      },
    });

    await new ExpoIdentityGateway(succeeds, tokens).refresh('r1');

    expect(asked).toBe('r1');
  });

  it('ends the provider session on sign-out', async () => {
    let signedOut = false;
    const tokens = exchanges({
      logOut: () => {
        signedOut = true;
        return Promise.resolve();
      },
    });

    await new ExpoIdentityGateway(succeeds, tokens).logOut('r1');

    expect(signedOut).toBe(true);
  });
});
