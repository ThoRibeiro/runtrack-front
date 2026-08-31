import { describe, expect, it } from 'vitest';
import { FixedClock } from '../../shared/time/clock';
import { userId } from '../../shared/identity/ids';
import { REFRESH_MARGIN, isAccessTokenUsable, needsRefresh } from './session';

const session = (expiresAt: number) => ({
  userId: userId('u1'),
  accessToken: 'access',
  refreshToken: 'refresh',
  accessTokenExpiresAt: expiresAt,
});

describe('validité du jeton d’accès', () => {
  it('est utilisable tant qu’il reste plus que la marge', () => {
    const clock = new FixedClock(1_000);

    expect(isAccessTokenUsable(session(1_000 + REFRESH_MARGIN + 1), clock)).toBe(true);
  });

  it('cesse de l’être une marge avant l’expiration', () => {
    // Une requête partie avec trente secondes de validité peut arriver expirée,
    // et chacune de celles-là est un 401 qui risque une ruée sur le refresh.
    const clock = new FixedClock(1_000);

    expect(isAccessTokenUsable(session(1_000 + REFRESH_MARGIN), clock)).toBe(false);
  });

  it('demande un renouvellement quand la session existe et n’est plus utilisable', () => {
    const clock = new FixedClock(1_000);

    expect(needsRefresh(session(0), clock)).toBe(true);
    expect(needsRefresh(session(1_000 + REFRESH_MARGIN * 2), clock)).toBe(false);
  });

  it('ne demande rien sans session : il n’y a rien à renouveler', () => {
    expect(needsRefresh(undefined, new FixedClock(1_000))).toBe(false);
  });
});
