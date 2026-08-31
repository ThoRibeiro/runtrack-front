import { describe, expect, it } from 'vitest';
import { FixedRandom } from '../../shared/random/random';
import { MAXIMUM_BACKOFF, backoffDelay } from './backoff';

describe('recul exponentiel avec jitter', () => {
  it('double la fenêtre à chaque tentative', () => {
    const random = new FixedRandom(1 - Number.EPSILON);

    expect(backoffDelay(0, random)).toBeCloseTo(1_000, -1);
    expect(backoffDelay(1, random)).toBeCloseTo(2_000, -1);
    expect(backoffDelay(2, random)).toBeCloseTo(4_000, -1);
  });

  it('tire dans toute la fenêtre, pas autour d’une cible', () => {
    // §7 : sans jitter, mille clients reconnectent ensemble après un
    // déploiement. Le tirage plein est ce qui étale vraiment la horde.
    expect(backoffDelay(3, new FixedRandom(0))).toBe(0);
    expect(backoffDelay(3, new FixedRandom(0.5))).toBe(4_000);
  });

  it('plafonne la fenêtre', () => {
    const random = new FixedRandom(1 - Number.EPSILON);

    expect(backoffDelay(20, random)).toBeLessThanOrEqual(MAXIMUM_BACKOFF);
  });

  it('accepte des bornes explicites', () => {
    expect(backoffDelay(0, new FixedRandom(0.5), { initial: 200, maximum: 1_000 })).toBe(100);
  });

  it('refuse un numéro de tentative négatif', () => {
    expect(() => backoffDelay(-1, new FixedRandom(0))).toThrow(RangeError);
  });
});
