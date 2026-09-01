import { activityId, type LocationFix, type PointBuffer } from '@runtrack/core';
import { deliverFixes, onLocationFixes, persistFixes } from './backgroundLocation';
import { SqlitePointBuffer } from './sqlitePointBuffer';
import { SqlJsDatabase } from './testing/sqlJsDatabase';

const RUN = activityId('a1');

function aFix(seconds: number): LocationFix {
  return {
    position: { latitude: 48.8566, longitude: 2.3522 + seconds * 0.0001 },
    elevationMetres: 35,
    recordedAt: 1_700_000_000_000 + seconds * 1000,
    accuracyMetres: 6,
  };
}

async function aBuffer(): Promise<PointBuffer> {
  return SqlitePointBuffer.open(await SqlJsDatabase.open());
}

describe('la livraison des positions', () => {
  it('remet les positions à qui écoute', () => {
    const received: LocationFix[][] = [];
    const stop = onLocationFixes((fixes) => received.push([...fixes]));

    expect(deliverFixes([aFix(1), aFix(2)])).toBe(true);
    expect(received[0]).toHaveLength(2);

    stop();
  });

  it('dit que personne n’écoute quand l’application a été tuée', () => {
    expect(deliverFixes([aFix(1)])).toBe(false);
  });

  it('ne remet rien pour une rafale vide', () => {
    const stop = onLocationFixes(() => undefined);

    expect(deliverFixes([])).toBe(false);

    stop();
  });
});

describe('l’écriture directe, application tuée', () => {
  it('écrit les positions dans la course en cours, numérotées à la suite', async () => {
    const buffer = await aBuffer();
    await buffer.remember({ activityId: RUN, skew: { offset: 0 }, startedAt: 1_000 });
    await buffer.reserveSequenceNumber(RUN);

    const written = await persistFixes(buffer, [aFix(1), aFix(2)]);

    expect(written).toBe(2);
    const pending = await buffer.pending(RUN, 10);
    expect(pending.map((point) => point.sequenceNumber)).toEqual([1, 2]);
  });

  it('n’écrit rien quand plus aucune course n’est en cours', async () => {
    const buffer = await aBuffer();

    expect(await persistFixes(buffer, [aFix(1)])).toBe(0);
  });

  it('n’écrit rien pour une rafale vide', async () => {
    const buffer = await aBuffer();
    await buffer.remember({ activityId: RUN, skew: { offset: 0 }, startedAt: 1_000 });

    expect(await persistFixes(buffer, [])).toBe(0);
  });
});
