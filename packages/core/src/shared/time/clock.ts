/**
 * Epoch milliseconds. The hexagon never holds a `Date`: a `Date` carries a time
 * zone, a system clock and a formatting locale, which are three platform
 * concerns. Formatting belongs to the shells, arithmetic belongs here.
 */
export type Instant = number;

/**
 * The only way for the hexagon to know what time it is.
 *
 * It exists so that time is an input rather than an ambient fact. Every
 * temporal rule of this application — the 15-minute access token, the 45
 * seconds without a heartbeat that trigger a reconnection, the clock drift
 * measured once at activity start — is testable only if the clock can be held
 * still.
 */
export interface Clock {
  now(): Instant;
}

/**
 * A clock the tests drive by hand.
 *
 * It lives in the hexagon rather than in a test folder on purpose: the shells
 * need it too, to replay a recorded activity or to run a demo.
 */
export class FixedClock implements Clock {
  private current: Instant;

  constructor(start: Instant) {
    this.current = start;
  }

  now(): Instant {
    return this.current;
  }

  /** Moves the clock forward. Time never goes backwards, not even in a test. */
  advanceBy(milliseconds: number): void {
    if (milliseconds < 0) {
      throw new RangeError('Une horloge ne recule pas : advanceBy attend une durée positive.');
    }
    this.current += milliseconds;
  }
}
