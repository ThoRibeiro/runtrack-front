import { encodePolyline, type GeoPoint } from '@runtrack/core';
import { ChunkedTrackDecoder } from './decoding/chunkedTrackDecoder';

/**
 * The measurement behind the decision recorded in `chunkedTrackDecoder.ts`.
 *
 * §8 asks for a long track to be decoded off the main thread because "dix mille
 * points bloquent l'UI". What is actually being protected is a frame: this
 * asserts that no single uninterrupted slice comes near one, on exactly the
 * ten-thousand-point track the brief names.
 *
 * The ceiling is a frame at 60 Hz and not the 2 ms budget on purpose — a CI
 * runner under load must not turn an architecture guarantee into a flake. The
 * budget is what the decoder aims at; sixteen milliseconds is what would be a
 * regression worth failing a build over.
 */
const FRAME_AT_60_HZ_MILLIS = 16;
const POINTS = 10_000;

function aLongTrack(): GeoPoint[] {
  return Array.from({ length: POINTS }, (_, index) => ({
    latitude: 48.8566 + Math.sin(index / 200) * 0.01,
    longitude: 2.3522 + index * 0.000_015,
  }));
}

describe('décoder une trace de dix mille points', () => {
  it('ne tient jamais le fil plus d’une image', async () => {
    const polyline = encodePolyline(aLongTrack());
    const slices: number[] = [];
    let sliceStartedAt = 0;

    const decoder = new ChunkedTrackDecoder({
      yieldToEventLoop: () => {
        slices.push(performance.now() - sliceStartedAt);
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            sliceStartedAt = performance.now();
            resolve();
          }, 0);
        });
      },
      now: () => performance.now(),
    });

    sliceStartedAt = performance.now();
    const points = await decoder.decode(polyline).points;
    slices.push(performance.now() - sliceStartedAt);

    expect(points).toHaveLength(POINTS);
    expect(Math.max(...slices)).toBeLessThan(FRAME_AT_60_HZ_MILLIS);
  });
});
