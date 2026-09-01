import { distanceBetween, type GeoPoint } from '../../measure/geo';
import type { Split } from '../../activity/domain/track';

/**
 * Where things sit *along* a track, as opposed to where they sit on the globe.
 *
 * The kilometre marks of §8 are the reason this exists: the server sends splits
 * as durations and distances, never as coordinates, so the only way to pin
 * "kilometre 3" on the map is to walk the decoded trace until three thousand
 * metres have gone by.
 */

/** A distance along the trace, and the point that sits there. */
export interface PointOnTrack {
  point: GeoPoint;
  /** How far along the trace it is, in metres. */
  atMetres: number;
  /** Index of the point that precedes it. Useful to slice the trace in two. */
  afterIndex: number;
}

/**
 * Linear interpolation between two fixes.
 *
 * Flat, not great-circle: consecutive GPS fixes are a few metres apart, where
 * the two agree to well under a centimetre. `distanceBetween` stays haversine
 * because it accumulates over a marathon; this one never does.
 */
function interpolate(from: GeoPoint, to: GeoPoint, fraction: number): GeoPoint {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * fraction,
    longitude: from.longitude + (to.longitude - from.longitude) * fraction,
  };
}

/**
 * How far past the end of the trace a mark may still land.
 *
 * The server measures splits on the raw fixes; the client walks a polyline
 * rounded to five decimal places, and the two disagree by a few metres over a
 * kilometre. The last kilometre of a round track therefore falls *just* beyond
 * the last point — and refusing to place it would drop exactly the mark the
 * runner cares most about. Two per cent of the traversed length absorbs the
 * rounding without ever reaching the next kilometre.
 */
const END_TOLERANCE_RATIO = 0.02;

/**
 * The point reached after walking `metres` along the trace.
 *
 * Returns `undefined` when the trace is genuinely shorter than asked — which
 * happens for real: a track whose raw points were purged is replaced by a
 * coarser polyline, and past the tolerance above, guessing would be inventing.
 */
export function pointAtDistance(
  points: readonly GeoPoint[],
  metres: number,
): PointOnTrack | undefined {
  const first = points[0];
  if (first === undefined) return undefined;
  if (metres <= 0) return { point: first, atMetres: 0, afterIndex: 0 };

  let covered = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous === undefined || current === undefined) continue;

    const segment = distanceBetween(previous, current);
    if (covered + segment >= metres) {
      // A zero-length segment cannot carry the crossing: two fixes at the same
      // spot (a runner stopped at a light) would divide by zero.
      const fraction = segment === 0 ? 0 : (metres - covered) / segment;
      return {
        point: interpolate(previous, current, fraction),
        atMetres: metres,
        afterIndex: index - 1,
      };
    }
    covered += segment;
  }

  const last = points[points.length - 1];
  if (last !== undefined && metres - covered <= covered * END_TOLERANCE_RATIO) {
    return { point: last, atMetres: covered, afterIndex: points.length - 1 };
  }
  return undefined;
}

/**
 * The cumulative distance at which each split *ends*.
 *
 * The server numbers splits from **1** and sends each one's own length, not a
 * running total — verified in `SplitCalculator.byKilometer`. So kilometre 3 ends
 * at the sum of the first three, which is 3 000 m on a clean track and slightly
 * less when the last one is partial.
 */
export function splitEndDistances(splits: readonly Split[]): readonly number[] {
  const ends: number[] = [];
  let running = 0;
  for (const split of splits) {
    running += split.distanceMetres;
    ends.push(running);
  }
  return ends;
}

/**
 * Where each **complete** kilometre falls on the trace.
 *
 * Partial splits are left out on purpose: the last one does not mark a kilometre,
 * and a pin sitting on the finish line saying "km 8" over a marker already
 * saying "arrivée" is noise on a small screen — and two overlapping targets for
 * a screen reader.
 */
export function kilometreMarks(
  points: readonly GeoPoint[],
  splits: readonly Split[],
): readonly (PointOnTrack & { kilometreIndex: number })[] {
  const ends = splitEndDistances(splits);
  const marks: (PointOnTrack & { kilometreIndex: number })[] = [];

  splits.forEach((split, index) => {
    if (!split.complete) return;
    const end = ends[index];
    if (end === undefined) return;
    const found = pointAtDistance(points, end);
    if (found === undefined) return;
    marks.push({ ...found, kilometreIndex: split.kilometreIndex });
  });

  return marks;
}

const METRES_PER_DEGREE_LATITUDE = 111_320;
const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * A square box of the given half-width around a point, for framing one split
 * (§8: the kilometre marks are clickable, and clicking one has to show it).
 *
 * The equirectangular approximation is fine at this scale — a few hundred
 * metres — and degrades gracefully: near the poles the box gets wider in
 * longitude, which frames *more* than asked rather than less. It is clamped so
 * a track crossing 80° north cannot produce a box wider than the world.
 */
export function boundingBoxAround(
  centre: GeoPoint,
  halfWidthMetres: number,
): { south: number; west: number; north: number; east: number } {
  const latitudeSpan = halfWidthMetres / METRES_PER_DEGREE_LATITUDE;
  const shrink = Math.max(Math.cos(centre.latitude * DEGREES_TO_RADIANS), 0.01);
  const longitudeSpan = Math.min(latitudeSpan / shrink, 180);

  return {
    south: Math.max(centre.latitude - latitudeSpan, -90),
    north: Math.min(centre.latitude + latitudeSpan, 90),
    west: Math.max(centre.longitude - longitudeSpan, -180),
    east: Math.min(centre.longitude + longitudeSpan, 180),
  };
}
