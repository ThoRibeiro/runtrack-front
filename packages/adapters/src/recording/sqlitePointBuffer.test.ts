import { activityId, type RecordedPoint } from '@runtrack/core';
import { SqlitePointBuffer } from './sqlitePointBuffer';
import { SqlJsDatabase } from './testing/sqlJsDatabase';

const RUN = activityId('a1');
const OTHER = activityId('a2');

function aPoint(sequenceNumber: number, overrides: Partial<RecordedPoint> = {}): RecordedPoint {
  return {
    sequenceNumber,
    position: { latitude: 48.8566 + sequenceNumber * 0.0001, longitude: 2.3522 },
    elevationMetres: 35,
    recordedAt: 1_700_000_000_000 + sequenceNumber * 1000,
    accuracyMetres: 5,
    heartRate: undefined,
    cadence: undefined,
    ...overrides,
  };
}

/** Enregistre `count` points, comme le ferait le `Recorder`. */
async function record(buffer: SqlitePointBuffer, count: number): Promise<RecordedPoint[]> {
  const written: RecordedPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const sequenceNumber = await buffer.reserveSequenceNumber(RUN);
    const point = aPoint(sequenceNumber);
    await buffer.append(RUN, point);
    written.push(point);
  }
  return written;
}

describe('SqlitePointBuffer', () => {
  let database: SqlJsDatabase;
  let buffer: SqlitePointBuffer;

  beforeEach(async () => {
    database = await SqlJsDatabase.open();
    buffer = await SqlitePointBuffer.open(database);
  });

  it('numérote à partir de zéro, sans trou ni doublon', async () => {
    const written = await record(buffer, 5);

    expect(written.map((point) => point.sequenceNumber)).toEqual([0, 1, 2, 3, 4]);
  });

  it('rend les points en attente dans l’ordre des séquences', async () => {
    await record(buffer, 3);

    const pending = await buffer.pending(RUN, 10);

    expect(pending.map((point) => point.sequenceNumber)).toEqual([0, 1, 2]);
    expect(pending[0]?.position.latitude).toBeCloseTo(48.8566, 4);
    expect(pending[0]?.accuracyMetres).toBe(5);
  });

  it('rend le cardio et la cadence quand ils existent, et rien sinon', async () => {
    await buffer.append(RUN, aPoint(0, { heartRate: 148, cadence: 172 }));
    await buffer.append(RUN, aPoint(1));

    const pending = await buffer.pending(RUN, 10);

    expect(pending[0]?.heartRate).toBe(148);
    expect(pending[0]?.cadence).toBe(172);
    expect(pending[1]?.heartRate).toBeUndefined();
    expect(pending[1]?.cadence).toBeUndefined();
  });

  it('respecte la limite demandée : un lot est plafonné à mille points', async () => {
    await record(buffer, 12);

    expect(await buffer.pending(RUN, 5)).toHaveLength(5);
  });

  it('purge jusqu’au numéro accusé, celui-là compris — et pas un de plus', async () => {
    await record(buffer, 5);

    await buffer.purgeUpTo(RUN, 2);

    expect((await buffer.pending(RUN, 10)).map((point) => point.sequenceNumber)).toEqual([3, 4]);
    expect(await buffer.pendingCount(RUN)).toBe(2);
  });

  it('ne purge rien quand le serveur n’a rien accepté', async () => {
    await record(buffer, 3);

    // `lastAcceptedSequence` vaut -1 quand un lot entier est refusé.
    await buffer.purgeUpTo(RUN, -1);

    expect(await buffer.pendingCount(RUN)).toBe(3);
  });

  it('ne remet jamais le compteur à zéro en purgeant', async () => {
    await record(buffer, 3);
    await buffer.purgeUpTo(RUN, 2);

    // §6 : le numéro porte l'idempotence côté serveur. Repartir de zéro après
    // une purge ferait rejeter tout le reste de la course comme des doublons.
    expect(await buffer.reserveSequenceNumber(RUN)).toBe(3);
  });

  it('survit à un kill de l’application : les points et le compteur sont là', async () => {
    await record(buffer, 4);
    await buffer.remember({
      activityId: RUN,
      skew: { offset: 1_200 },
      startedAt: 1_700_000_000_000,
    });

    await database.restart();
    const reopened = await SqlitePointBuffer.open(database);

    expect(await reopened.pendingCount(RUN)).toBe(4);
    expect(await reopened.reserveSequenceNumber(RUN)).toBe(4);
    expect(await reopened.interrupted()).toEqual({
      activityId: RUN,
      skew: { offset: 1_200 },
      startedAt: 1_700_000_000_000,
    });
  });

  it('n’a rien à reprendre quand aucune course n’est en cours', async () => {
    expect(await buffer.interrupted()).toBeUndefined();
  });

  it('garde la dérive mesurée au départ quand la course reprend', async () => {
    await buffer.remember({ activityId: RUN, skew: { offset: 900 }, startedAt: 1_000 });
    await record(buffer, 2);

    // La reprise réécrit la ligne : elle ne doit pas repartir de zéro.
    await buffer.remember({ activityId: RUN, skew: { offset: 900 }, startedAt: 1_000 });

    expect(await buffer.reserveSequenceNumber(RUN)).toBe(2);
  });

  it('propose la course la plus récente quand deux traînent après un crash', async () => {
    await buffer.remember({ activityId: RUN, skew: { offset: 0 }, startedAt: 1_000 });
    await buffer.remember({ activityId: OTHER, skew: { offset: 0 }, startedAt: 9_000 });

    expect((await buffer.interrupted())?.activityId).toBe(OTHER);
  });

  it('oublie tout d’une course terminée, points compris', async () => {
    await buffer.remember({ activityId: RUN, skew: { offset: 0 }, startedAt: 1_000 });
    await record(buffer, 3);

    await buffer.forget(RUN);

    expect(await buffer.pendingCount(RUN)).toBe(0);
    expect(await buffer.interrupted()).toBeUndefined();
  });

  it('ne mélange pas deux courses', async () => {
    await record(buffer, 3);
    await buffer.append(OTHER, aPoint(0));

    await buffer.purgeUpTo(RUN, 2);

    expect(await buffer.pendingCount(RUN)).toBe(0);
    expect(await buffer.pendingCount(OTHER)).toBe(1);
  });

  it('ignore un point déjà écrit plutôt que de faire tomber l’enregistrement', async () => {
    await buffer.append(RUN, aPoint(0));

    // Un rejeu du même point — une reprise après crash, un double appel — ne
    // doit pas lever : perdre la course pour une clé dupliquée serait absurde.
    await buffer.append(RUN, aPoint(0));

    expect(await buffer.pendingCount(RUN)).toBe(1);
  });

  it('numérote un point arrivé avant même que la course soit mémorisée', async () => {
    // Le premier fix peut précéder `remember` d'un cheveu : mieux vaut un
    // numéro et un point gardé qu'une exception et un point perdu.
    expect(await buffer.reserveSequenceNumber(RUN)).toBe(0);
    expect(await buffer.reserveSequenceNumber(RUN)).toBe(1);
  });
});
