import { describe, expect, it } from 'vitest';
import { FixedClock } from './clock';

describe('FixedClock', () => {
  it('rend la même instant tant que personne ne la fait avancer', () => {
    const clock = new FixedClock(1_700_000_000_000);

    expect(clock.now()).toBe(1_700_000_000_000);
    expect(clock.now()).toBe(1_700_000_000_000);
  });

  it('avance de la durée demandée', () => {
    const clock = new FixedClock(0);

    clock.advanceBy(45_000);

    expect(clock.now()).toBe(45_000);
  });

  it('refuse de reculer', () => {
    const clock = new FixedClock(0);

    expect(() => {
      clock.advanceBy(-1);
    }).toThrow(RangeError);
  });
});
