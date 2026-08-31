/**
 * Randomness as a port, for the same reason as the clock: without it, the
 * jitter of §7's reconnection backoff cannot be tested, and an untested jitter
 * is how a thousand clients end up reconnecting in the same second after a
 * deployment.
 */
export interface Random {
  /** A number in [0, 1). */
  next(): number;
}

/** A generator that always returns the same value. For tests, and only for tests. */
export class FixedRandom implements Random {
  constructor(private readonly value: number) {
    if (value < 0 || value >= 1) {
      throw new RangeError('Un tirage se situe dans [0, 1).');
    }
  }

  next(): number {
    return this.value;
  }
}
