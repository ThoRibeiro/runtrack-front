import type { Instant } from './clock';

/** Milliseconds. Named so a duration is never confused with an instant. */
export type Millis = number;

export const SECOND: Millis = 1_000;
export const MINUTE: Millis = 60 * SECOND;
export const HOUR: Millis = 60 * MINUTE;

export function secondsBetween(from: Instant, to: Instant): number {
  return (to - from) / SECOND;
}

/**
 * Splits a number of seconds into the parts a screen shows. It is here rather
 * than in the shells because all three show the same thing, and because
 * splitting is arithmetic — only the *wording* around it is locale-dependent,
 * and that stays in the internationalisation layer.
 */
export interface ClockParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export function splitSeconds(totalSeconds: number): ClockParts {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    throw new RangeError('Une durée affichée ne peut être ni négative ni infinie.');
  }
  const whole = Math.floor(totalSeconds);
  return {
    hours: Math.floor(whole / 3600),
    minutes: Math.floor((whole % 3600) / 60),
    seconds: whole % 60,
  };
}
