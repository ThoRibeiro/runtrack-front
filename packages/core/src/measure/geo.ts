/**
 * Geography, in metres and degrees. No projection, no map library: what the
 * application needs is the distance between two fixes and a bounding box to
 * frame a track, and both are arithmetic.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METRES = 6_371_008.8;
const DEGREES_TO_RADIANS = Math.PI / 180;

export function isValidGeoPoint(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

/**
 * Great-circle distance, in metres.
 *
 * Haversine and not the flat approximation: over a marathon the flat one drifts
 * by tens of metres, and a distance is the number the whole application is about.
 */
export function distanceBetween(from: GeoPoint, to: GeoPoint): number {
  if (!isValidGeoPoint(from) || !isValidGeoPoint(to)) {
    throw new RangeError('Coordonnée hors des bornes terrestres.');
  }

  const fromLatitude = from.latitude * DEGREES_TO_RADIANS;
  const toLatitude = to.latitude * DEGREES_TO_RADIANS;
  const deltaLatitude = (to.latitude - from.latitude) * DEGREES_TO_RADIANS;
  const deltaLongitude = (to.longitude - from.longitude) * DEGREES_TO_RADIANS;

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Total length of a polyline, in metres. */
export function pathLength(points: readonly GeoPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous === undefined || current === undefined) continue;
    total += distanceBetween(previous, current);
  }
  return total;
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * The box a map has to frame to show the whole track (§8: automatic framing).
 * Returns `undefined` on an empty track rather than a degenerate box, because
 * "nothing to frame" and "a box of size zero" are different instructions to a map.
 */
export function boundingBoxOf(points: readonly GeoPoint[]): BoundingBox | undefined {
  const first = points[0];
  if (first === undefined) return undefined;

  let box: BoundingBox = {
    south: first.latitude,
    north: first.latitude,
    west: first.longitude,
    east: first.longitude,
  };

  for (const point of points) {
    box = {
      south: Math.min(box.south, point.latitude),
      north: Math.max(box.north, point.latitude),
      west: Math.min(box.west, point.longitude),
      east: Math.max(box.east, point.longitude),
    };
  }
  return box;
}
