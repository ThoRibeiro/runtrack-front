/**
 * Cumulative climb and descent from a series of altitudes.
 *
 * The threshold is the whole point: a GPS altitude wanders by a couple of
 * metres while standing still, and summing every wobble turns a flat 10 km into
 * 200 m of climb. Anything below the threshold is noise, not terrain.
 */
export const ELEVATION_NOISE_THRESHOLD_METRES = 3;

export interface ElevationChange {
  gain: number;
  loss: number;
}

export function elevationChange(
  altitudes: readonly number[],
  threshold: number = ELEVATION_NOISE_THRESHOLD_METRES,
): ElevationChange {
  let gain = 0;
  let loss = 0;
  let reference = altitudes[0];

  if (reference === undefined) return { gain, loss };

  for (const altitude of altitudes) {
    const delta = altitude - reference;
    if (Math.abs(delta) < threshold) continue;
    if (delta > 0) gain += delta;
    else loss -= delta;
    reference = altitude;
  }

  return { gain, loss };
}
