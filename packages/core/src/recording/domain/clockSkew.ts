import { MINUTE, type Millis } from '../../shared/time/duration';
import type { Instant } from '../../shared/time/clock';

/**
 * The gap between the phone's clock and the server's, measured **once** at the
 * start of an activity.
 *
 * §6 is emphatic about the "once": the server measures the drift from the
 * `deviceTime` sent with `POST /race/v1`, and corrects every later point with
 * it. Sending a fresh `deviceTime` mid-activity would shift the track.
 *
 * This is the client's copy of the same rule, and it exists for one reason: the
 * server refuses to start above fifteen minutes of drift (`DEVICE_CLOCK_TOO_FAR_OFF`),
 * and finding that out after the runner has set off is too late. The client can
 * see it coming as soon as it has one server response.
 */
export const MAXIMUM_ACCEPTABLE_SKEW: Millis = 15 * MINUTE;

/**
 * §6: the server rejects points dated more than sixty seconds into its own
 * future. That is the residual tolerance *after* the drift correction, so a
 * client that keeps re-measuring is fighting the server rather than helping it.
 */
export const MAXIMUM_FUTURE_DRIFT: Millis = 60_000;

export interface ClockSkew {
  /** Positive when the phone is behind the server. */
  offset: Millis;
}

export function observeSkew(deviceTime: Instant, serverTime: Instant): ClockSkew {
  return { offset: serverTime - deviceTime };
}

export function isSkewAcceptable(skew: ClockSkew): boolean {
  return Math.abs(skew.offset) <= MAXIMUM_ACCEPTABLE_SKEW;
}

/** What the server will make of a device timestamp, so the client can predict a rejection. */
export function correct(skew: ClockSkew, deviceTime: Instant): Instant {
  return deviceTime + skew.offset;
}

/**
 * Whether a point would be refused as being in the server's future.
 *
 * The recorder uses it to warn rather than to drop: the server has the last
 * word, and a client that silently discards points hides a broken clock instead
 * of showing it.
 */
export function wouldBeRejectedAsFuture(
  skew: ClockSkew,
  deviceTime: Instant,
  serverNow: Instant,
): boolean {
  return correct(skew, deviceTime) > serverNow + MAXIMUM_FUTURE_DRIFT;
}
