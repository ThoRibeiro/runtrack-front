import type { GeoPoint } from '../../measure/geo';

/**
 * Decoding an encoded polyline **off the main thread** (§8).
 *
 * The arithmetic itself lives in `measure/polyline` and is pure. What is not
 * pure — and what this port exists for — is *where it runs*: a ten-thousand
 * point track blocks the UI for long enough to drop frames, so the web shell
 * hands it to a worker and the mobile shell slices it across event-loop turns.
 * Neither of those is something the hexagon can express.
 *
 * The handle is deliberately not a bare `Promise`: a screen that unmounts
 * mid-decode has to be able to stop the work, and a promise cannot be told to
 * stop. `cancel()` is idempotent, and the promise then rejects with
 * `TrackDecodingCancelled` rather than resolving with half a track — a partial
 * trace drawn on a map is worse than no trace.
 */
export class TrackDecodingCancelled extends Error {
  constructor() {
    super('Décodage de la trace annulé.');
    this.name = 'TrackDecodingCancelled';
  }
}

export function isTrackDecodingCancelled(error: unknown): error is TrackDecodingCancelled {
  return error instanceof TrackDecodingCancelled;
}

export interface TrackDecoding {
  readonly points: Promise<readonly GeoPoint[]>;
  cancel(): void;
}

export interface TrackDecoder {
  decode(polyline: string): TrackDecoding;
}
