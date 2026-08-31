import { splitSeconds, type ClockParts } from '../shared/time/duration';

/**
 * Pace is seconds per kilometre — the unit a runner reads. Speed is metres per
 * second, the unit a sensor produces. Converting between them is the kind of
 * thing that gets written three times slightly differently if it is not written
 * once here.
 */
export type SecondsPerKm = number;
export type MetresPerSecond = number;

export function paceFromSpeed(speed: MetresPerSecond): SecondsPerKm | undefined {
  // Standing still has no pace. Returning Infinity would print "∞:00".
  if (speed <= 0 || !Number.isFinite(speed)) return undefined;
  return 1000 / speed;
}

export function speedFromPace(pace: SecondsPerKm): MetresPerSecond | undefined {
  if (pace <= 0 || !Number.isFinite(pace)) return undefined;
  return 1000 / pace;
}

export function paceOver(distanceMetres: number, elapsedSeconds: number): SecondsPerKm | undefined {
  if (distanceMetres <= 0 || elapsedSeconds <= 0) return undefined;
  return (elapsedSeconds / distanceMetres) * 1000;
}

/**
 * The parts of a pace, for display: 315 s/km is 5 min 15 s. Hours are kept
 * rather than dropped — a walk in the mountains can genuinely exceed an hour
 * per kilometre, and truncating it would show 5:15 for 65:15.
 */
export function paceParts(pace: SecondsPerKm): ClockParts {
  return splitSeconds(pace);
}
