import type { GeoPoint } from './geo';

/**
 * Google's encoded-polyline format, decoded here.
 *
 * §8: "la trace historisée arrive encodée. Décode-la, ne demande pas les points
 * bruts." The decoding itself is arithmetic, so it belongs in the hexagon; where
 * it *runs* is the adapter's problem — §8 also says a ten-thousand-point track
 * must be decoded off the main thread, and that is a worker, not an algorithm.
 *
 * The function is written to be resumable in chunks for exactly that reason:
 * `decodePolyline` does the whole thing, `decodePolylineChunk` does a slice and
 * says where it stopped, so an adapter can yield to the event loop between
 * slices without reimplementing the decoder.
 */
const PRECISION = 1e5;

export interface PolylineChunk {
  points: GeoPoint[];
  /** Where to resume. Equal to the input length when the track is fully decoded. */
  nextIndex: number;
  /** The running coordinate, to be handed back on the next call. */
  latitude: number;
  longitude: number;
}

interface Decoded {
  value: number;
  nextIndex: number;
}

/** Reads one variable-length, zig-zag encoded signed integer. */
function readValue(encoded: string, startIndex: number): Decoded {
  let index = startIndex;
  let shift = 0;
  let result = 0;
  let byte: number;

  do {
    const code = encoded.codePointAt(index);
    if (code === undefined) {
      throw new SyntaxError('Polyline tronquée : la valeur ne se termine pas.');
    }
    byte = code - 63;
    if (byte < 0) {
      throw new SyntaxError('Polyline invalide : caractère hors de la plage encodable.');
    }
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  // Zig-zag: the low bit carries the sign.
  return { value: (result & 1) !== 0 ? ~(result >> 1) : result >> 1, nextIndex: index };
}

export function decodePolylineChunk(
  encoded: string,
  options: {
    fromIndex?: number;
    latitude?: number;
    longitude?: number;
    maximumPoints?: number;
  } = {},
): PolylineChunk {
  const {
    fromIndex = 0,
    latitude = 0,
    longitude = 0,
    maximumPoints = Number.POSITIVE_INFINITY,
  } = options;

  const points: GeoPoint[] = [];
  let index = fromIndex;
  let currentLatitude = latitude;
  let currentLongitude = longitude;

  while (index < encoded.length && points.length < maximumPoints) {
    const decodedLatitude = readValue(encoded, index);
    const decodedLongitude = readValue(encoded, decodedLatitude.nextIndex);

    currentLatitude += decodedLatitude.value;
    currentLongitude += decodedLongitude.value;
    index = decodedLongitude.nextIndex;

    points.push({
      latitude: currentLatitude / PRECISION,
      longitude: currentLongitude / PRECISION,
    });
  }

  return { points, nextIndex: index, latitude: currentLatitude, longitude: currentLongitude };
}

export function decodePolyline(encoded: string): GeoPoint[] {
  return decodePolylineChunk(encoded).points;
}

/**
 * The inverse, used by the tests and by an offline export. The application
 * never encodes a track for the server — the server owns that.
 */
export function encodePolyline(points: readonly GeoPoint[]): string {
  let previousLatitude = 0;
  let previousLongitude = 0;
  let encoded = '';

  const writeValue = (value: number): string => {
    let zigzag = value < 0 ? ~(value << 1) : value << 1;
    let chunk = '';
    while (zigzag >= 0x20) {
      chunk += String.fromCodePoint((0x20 | (zigzag & 0x1f)) + 63);
      zigzag >>= 5;
    }
    return chunk + String.fromCodePoint(zigzag + 63);
  };

  for (const point of points) {
    const latitude = Math.round(point.latitude * PRECISION);
    const longitude = Math.round(point.longitude * PRECISION);
    encoded += writeValue(latitude - previousLatitude);
    encoded += writeValue(longitude - previousLongitude);
    previousLatitude = latitude;
    previousLongitude = longitude;
  }

  return encoded;
}
