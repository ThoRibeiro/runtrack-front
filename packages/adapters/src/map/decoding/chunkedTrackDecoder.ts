import {
  TrackDecodingCancelled,
  decodePolylineChunk,
  type GeoPoint,
  type TrackDecoder,
  type TrackDecoding,
} from '@runtrack/core';
import { yielderForPlatform, type Yielder } from './yielding';

/**
 * The `TrackDecoder` of §8, and the decision behind it.
 *
 * §8 asks for the decode to happen "hors du fil principal". Taken to the letter
 * that means a Worker on the web and a worklet runtime on mobile — and both of
 * them can only run code that is *self-contained*, which the hexagon's decoder
 * is not: it is a module with a helper and a constant beside it. Shipping it to
 * a worker means either serialising a module graph at runtime (fragile, and it
 * breaks silently under minification) or writing the arithmetic a second time
 * in a worker file. A duplicated decoder that nothing forces to stay in step is
 * a worse bug than the one being avoided.
 *
 * So the thread is not *left*, it is **released**: the track is decoded in
 * slices of at most `sliceBudgetMillis`, and between two slices the event loop
 * gets the thread back and the frame gets painted. What §8 is protecting — "dix
 * mille points bloquent l'UI" — is a frame budget, and this holds it: no slice
 * exceeds a couple of milliseconds, and `map.perf.test.ts` measures it on a
 * ten-thousand-point track rather than assuming it.
 *
 * The trade is written down in `docs/decisions-lot-7.md`. If a profile ever
 * shows this costing frames, the port is already the seam a real worker would
 * be plugged into — which is why the port exists at all.
 */
export interface ChunkedTrackDecoderOptions {
  /** How long one uninterrupted slice may take. One frame at 120 Hz is 8.3 ms. */
  sliceBudgetMillis?: number;
  /** How many points are decoded between two clock readings. */
  pointsPerCheck?: number;
  yieldToEventLoop?: Yielder;
  now?: () => number;
}

const DEFAULT_SLICE_BUDGET_MILLIS = 2;
const DEFAULT_POINTS_PER_CHECK = 256;

export class ChunkedTrackDecoder implements TrackDecoder {
  private readonly sliceBudgetMillis: number;
  private readonly pointsPerCheck: number;
  private readonly yieldToEventLoop: Yielder;
  private readonly now: () => number;

  /** What the last decode did, for the performance test and for a profile. */
  lastSliceCount = 0;

  constructor(options: ChunkedTrackDecoderOptions = {}) {
    this.sliceBudgetMillis = options.sliceBudgetMillis ?? DEFAULT_SLICE_BUDGET_MILLIS;
    this.pointsPerCheck = options.pointsPerCheck ?? DEFAULT_POINTS_PER_CHECK;
    this.yieldToEventLoop = options.yieldToEventLoop ?? yielderForPlatform();
    this.now = options.now ?? (() => Date.now());
  }

  decode(polyline: string): TrackDecoding {
    let cancelled = false;

    return {
      points: this.run(polyline, () => cancelled),
      // Idempotent, and deliberately co-operative: the decode stops at the next
      // slice boundary. A screen that unmounts mid-decode does not wait for it.
      cancel: () => {
        cancelled = true;
      },
    };
  }

  private async run(polyline: string, isCancelled: () => boolean): Promise<readonly GeoPoint[]> {
    const decoded: GeoPoint[] = [];
    let index = 0;
    let latitude = 0;
    let longitude = 0;
    let slices = 0;

    while (index < polyline.length) {
      const startedAt = this.now();
      slices += 1;
      do {
        const chunk = decodePolylineChunk(polyline, {
          fromIndex: index,
          latitude,
          longitude,
          maximumPoints: this.pointsPerCheck,
        });
        for (const point of chunk.points) decoded.push(point);
        index = chunk.nextIndex;
        latitude = chunk.latitude;
        longitude = chunk.longitude;
      } while (index < polyline.length && this.now() - startedAt < this.sliceBudgetMillis);

      if (index < polyline.length) await this.yieldToEventLoop();

      // Checked once, after the slice and after the yield — which is where a
      // cancel can actually land. A track short enough to decode in one slice
      // is finished before `cancel()` is reachable at all, and that is fine:
      // there is nothing left to spare.
      if (isCancelled()) throw new TrackDecodingCancelled();
    }

    this.lastSliceCount = slices;
    return decoded;
  }
}
