import type { Cancel, Millis, Random, Scheduler } from '@runtrack/core';

/**
 * The real clock behind the `Scheduler` and `Random` ports.
 *
 * They are two lines each, and that is the point: the hexagon declares them so
 * that a forty-five-second watchdog and a jittered backoff can be tested in
 * microseconds, and *this* is all the platform ever adds.
 *
 * `Cancel` is idempotent, as the port promises — `clearTimeout` on a timer that
 * already fired is a no-op, and calling it twice has to stay harmless.
 */
export class SystemScheduler implements Scheduler {
  after(delay: Millis, run: () => void): Cancel {
    const handle = setTimeout(run, delay);
    return () => {
      clearTimeout(handle);
    };
  }

  every(interval: Millis, run: () => void): Cancel {
    const handle = setInterval(run, interval);
    return () => {
      clearInterval(handle);
    };
  }
}

export class SystemRandom implements Random {
  next(): number {
    return Math.random();
  }
}
