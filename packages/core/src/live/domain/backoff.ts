import type { Random } from '../../shared/random/random';
import { SECOND, type Millis } from '../../shared/time/duration';

/**
 * §7: reconnection with exponential backoff **and jitter**. The jitter is not a
 * nicety — without it a thousand clients reconnect in the same second after a
 * deployment, and the server that just came back goes down again.
 *
 * Full jitter (a uniform draw over the whole window) rather than a small wobble
 * around the target: it spreads the herd much more evenly, at the cost of the
 * occasional very fast retry, which is fine.
 */
export const INITIAL_BACKOFF: Millis = SECOND;
export const MAXIMUM_BACKOFF: Millis = 30 * SECOND;

export function backoffDelay(
  attempt: number,
  random: Random,
  options: { initial?: Millis; maximum?: Millis } = {},
): Millis {
  const { initial = INITIAL_BACKOFF, maximum = MAXIMUM_BACKOFF } = options;
  if (attempt < 0) throw new RangeError('Le numéro de tentative part de zéro.');

  const window = Math.min(maximum, initial * 2 ** attempt);
  return Math.round(random.next() * window);
}

/**
 * §7: a heartbeat every fifteen seconds, and its **absence** for forty-five is
 * the signal to reconnect. Not an explicit network error — a dead TCP
 * connection reports nothing at all, which is the whole reason the watchdog
 * exists.
 */
export const HEARTBEAT_INTERVAL: Millis = 15 * SECOND;
export const HEARTBEAT_TIMEOUT: Millis = 45 * SECOND;
