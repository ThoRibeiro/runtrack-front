import { encodePolyline, type GeoPoint } from '@runtrack/core';
import { ChunkedTrackDecoder } from './decoding/chunkedTrackDecoder';

/**
 * The measurement behind the decision recorded in `chunkedTrackDecoder.ts`.
 *
 * §8 asks for a long track to be decoded off the main thread because "dix
 * mille points bloquent l'UI". What is actually being protected is a frame, and
 * this measures whether that holds — on exactly the ten-thousand-point track
 * the brief names.
 *
 * Two assertions, and what each is worth:
 *
 *  - **the thread is released at least once.** This is the architectural
 *    guarantee, and it is binary: a decoder that stopped slicing would produce
 *    a single slice, and this catches it;
 *  - **the whole decode costs well under a hundred milliseconds of CPU.** A
 *    generous ceiling on purpose — it is a regression detector, not a
 *    stopwatch, and a machine under load must not fail a build over scheduling
 *    noise.
 *
 * What is deliberately *not* asserted is the longest single slice. The measured
 * decode takes about four milliseconds in total across two slices, so a slice
 * maximum is two samples wide: one garbage collection landing in the wrong
 * place moves it past any threshold, and the number says nothing about the
 * decoder. That flake happened, which is why this is written the way it is.
 */
const DECODE_BUDGET_MILLIS = 100;
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
    // Le fil a bien été rendu : c'est la garantie que le port existe pour.
    expect(slices.length).toBeGreaterThan(1);
    expect(slices.reduce((total, slice) => total + slice, 0)).toBeLessThan(DECODE_BUDGET_MILLIS);
  });
});
