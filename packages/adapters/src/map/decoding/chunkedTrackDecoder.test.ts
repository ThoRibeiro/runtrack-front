import {
  decodePolyline,
  encodePolyline,
  isTrackDecodingCancelled,
  type GeoPoint,
} from '@runtrack/core';
import { ChunkedTrackDecoder } from './chunkedTrackDecoder';
import { messageChannelYielder, timeoutYielder, yielderForPlatform } from './yielding';

/** A plausible track: a runner heading north-east, one fix every second. */
function aTrack(count: number): GeoPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    latitude: 48.8566 + index * 0.000_02,
    longitude: 2.3522 + index * 0.000_03,
  }));
}

describe('ChunkedTrackDecoder', () => {
  it('rend exactement ce que rend le décodeur de l’hexagone', async () => {
    const polyline = encodePolyline(aTrack(1_000));
    const decoder = new ChunkedTrackDecoder();

    await expect(decoder.decode(polyline).points).resolves.toEqual(decodePolyline(polyline));
  });

  it('rend une trace vide sans céder le fil une seule fois', async () => {
    const yieldToEventLoop = jest.fn(() => Promise.resolve());
    const decoder = new ChunkedTrackDecoder({ yieldToEventLoop });

    await expect(decoder.decode('').points).resolves.toEqual([]);
    expect(yieldToEventLoop).not.toHaveBeenCalled();
  });

  it('découpe une longue trace et rend le fil entre les tranches', async () => {
    const polyline = encodePolyline(aTrack(2_000));
    const yieldToEventLoop = jest.fn(() => Promise.resolve());
    let clock = 0;
    // Une horloge qui avance de 1 ms à chaque lecture : deux lectures suffisent
    // à épuiser le budget, donc chaque tranche tient en un ou deux paquets.
    const decoder = new ChunkedTrackDecoder({
      yieldToEventLoop,
      pointsPerCheck: 100,
      sliceBudgetMillis: 2,
      now: () => {
        clock += 1;
        return clock;
      },
    });

    const points = await decoder.decode(polyline).points;

    expect(points).toHaveLength(2_000);
    expect(yieldToEventLoop).toHaveBeenCalled();
    expect(decoder.lastSliceCount).toBeGreaterThan(1);
    // Une tranche par cession, plus la dernière qui n'a plus rien à céder.
    expect(decoder.lastSliceCount).toBe(yieldToEventLoop.mock.calls.length + 1);
  });

  it('ne cède jamais le fil quand le budget suffit', async () => {
    const yieldToEventLoop = jest.fn(() => Promise.resolve());
    const decoder = new ChunkedTrackDecoder({
      yieldToEventLoop,
      sliceBudgetMillis: Number.POSITIVE_INFINITY,
      now: () => 0,
    });

    await decoder.decode(encodePolyline(aTrack(5_000))).points;

    expect(yieldToEventLoop).not.toHaveBeenCalled();
    expect(decoder.lastSliceCount).toBe(1);
  });

  it('s’arrête quand l’écran se démonte, plutôt que de finir pour personne', async () => {
    const polyline = encodePolyline(aTrack(2_000));
    let released: (() => void) | undefined;
    const decoder = new ChunkedTrackDecoder({
      pointsPerCheck: 10,
      sliceBudgetMillis: 0,
      now: () => 0,
      yieldToEventLoop: () => new Promise<void>((resolve) => (released = resolve)),
    });

    const decoding = decoder.decode(polyline);
    const settled = decoding.points.catch((error: unknown) => error);
    await Promise.resolve();

    decoding.cancel();
    decoding.cancel();
    released?.();

    expect(isTrackDecodingCancelled(await settled)).toBe(true);
  });

  it('ne défait pas un décodage déjà terminé : il n’y a plus rien à épargner', async () => {
    // Une trace de trois points tient dans une tranche, donc elle est décodée
    // avant même que `cancel` soit atteignable. L'annulation est coopérative,
    // pas rétroactive.
    const decoder = new ChunkedTrackDecoder({ sliceBudgetMillis: Number.POSITIVE_INFINITY });
    const decoding = decoder.decode(encodePolyline(aTrack(3)));
    decoding.cancel();

    await expect(decoding.points).resolves.toHaveLength(3);
  });

  it('refuse une polyline tronquée au lieu de rendre une demi-trace', async () => {
    const truncated = encodePolyline(aTrack(50)).slice(0, -1);
    await expect(new ChunkedTrackDecoder().decode(truncated).points).rejects.toThrow(SyntaxError);
  });
});

describe('les façons de rendre le fil', () => {
  it.each([
    ['MessageChannel', messageChannelYielder],
    ['setTimeout', timeoutYielder],
    ['la plateforme', yielderForPlatform],
  ])('%s rend la main sans rien casser', async (_name, make) => {
    await expect(make()()).resolves.toBeUndefined();
  });
});
