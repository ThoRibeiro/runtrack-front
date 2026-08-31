import { describe, expect, it } from 'vitest';
import { activityId } from '../../shared/identity/ids';
import { EMPTY_STATS } from '../../testing/fakes';
import type { RecordedPoint } from '../../activity/domain/track';
import { MAXIMUM_POINTS_PER_BATCH, batchesFor, chunk, idempotencyKeyFor } from './batching';
import { correct, isSkewAcceptable, observeSkew, wouldBeRejectedAsFuture } from './clockSkew';
import {
  NO_FIX_REJECTION_THRESHOLD,
  trailingAccuracyRejections,
  warningsFrom,
  type IngestionOutcome,
} from './ingestion';

const ACTIVITY = activityId('activity-1');

function points(count: number, from = 0): RecordedPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    sequenceNumber: from + index,
    position: { latitude: 48.85, longitude: 2.35 },
    elevationMetres: 30,
    recordedAt: 1_700_000_000_000 + index * 1_000,
    accuracyMetres: 5,
  }));
}

describe('dérive d’horloge', () => {
  it('mesure l’écart entre le téléphone et le serveur', () => {
    expect(observeSkew(1_000, 4_000)).toEqual({ offset: 3_000 });
  });

  it('accepte jusqu’à quinze minutes', () => {
    expect(isSkewAcceptable({ offset: 15 * 60_000 })).toBe(true);
    expect(isSkewAcceptable({ offset: -15 * 60_000 })).toBe(true);
    expect(isSkewAcceptable({ offset: 15 * 60_000 + 1 })).toBe(false);
  });

  it('corrige un horodatage comme le serveur le fera', () => {
    expect(correct({ offset: 3_000 }, 1_000)).toBe(4_000);
  });

  it('prédit le rejet d’un point daté au-delà d’une minute dans le futur', () => {
    // §6 : le serveur refuse les points datés à plus de 60 s dans son futur.
    const skew = { offset: 0 };
    expect(wouldBeRejectedAsFuture(skew, 100_000 + 61_000, 100_000)).toBe(true);
    expect(wouldBeRejectedAsFuture(skew, 100_000 + 59_000, 100_000)).toBe(false);
  });

  it('tient compte de la correction avant de conclure au rejet', () => {
    // Un téléphone en avance de deux minutes : sans correction tout serait
    // rejeté, avec correction rien ne l'est.
    const skew = observeSkew(220_000, 100_000);
    expect(wouldBeRejectedAsFuture(skew, 220_000, 100_000)).toBe(false);
  });
});

describe('découpage en lots', () => {
  it('découpe une liste en tranches', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('rend une liste vide pour une entrée vide', () => {
    expect(chunk([], 10)).toEqual([]);
  });

  it('refuse une taille de tranche nulle', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });

  it('plafonne un lot à mille points', () => {
    const batches = batchesFor(ACTIVITY, points(MAXIMUM_POINTS_PER_BATCH + 1));

    expect(batches).toHaveLength(2);
    expect(batches[0]?.points).toHaveLength(MAXIMUM_POINTS_PER_BATCH);
    expect(batches[1]?.points).toHaveLength(1);
  });
});

describe('clé d’idempotence', () => {
  it('est déduite du lot, donc identique d’un rejeu à l’autre', () => {
    // §6 : même clé + même corps rejoue la réponse mémorisée. Une clé tirée au
    // sort ferait passer un rejeu pour un nouveau lot.
    const batch = points(3);
    expect(idempotencyKeyFor(ACTIVITY, batch)).toBe(idempotencyKeyFor(ACTIVITY, batch));
  });

  it('diffère quand la plage de séquences diffère', () => {
    expect(idempotencyKeyFor(ACTIVITY, points(3))).not.toBe(
      idempotencyKeyFor(ACTIVITY, points(3, 10)),
    );
  });

  it('est de portée « une course »', () => {
    expect(idempotencyKeyFor(ACTIVITY, points(2))).not.toBe(
      idempotencyKeyFor(activityId('autre'), points(2)),
    );
  });

  it('refuse un lot vide', () => {
    expect(() => idempotencyKeyFor(ACTIVITY, [])).toThrow(RangeError);
  });
});

describe('lecture des rejets', () => {
  const outcome = (overrides: Partial<IngestionOutcome> = {}): IngestionOutcome => ({
    stats: EMPTY_STATS,
    lastAcceptedSequence: 10,
    acceptedCount: 1,
    rejected: [],
    ...overrides,
  });

  it('ne dit rien quand tout passe et que rien n’attend', () => {
    expect(warningsFrom(outcome(), 0, 0)).toEqual([]);
  });

  it('signale un GPS sans fix au-delà du seuil', () => {
    expect(warningsFrom(outcome(), NO_FIX_REJECTION_THRESHOLD, 0)).toEqual([
      { kind: 'no-gps-fix', consecutiveRejections: NO_FIX_REJECTION_THRESHOLD },
    ]);
  });

  it('signale une dérive d’horloge dès un seul point daté hors bornes', () => {
    const warnings = warningsFrom(
      outcome({
        rejected: [
          { sequenceNumber: 11, reason: 'TIMESTAMP_IN_FUTURE' },
          { sequenceNumber: 12, reason: 'TIMESTAMP_BEFORE_START' },
        ],
      }),
      0,
      0,
    );

    expect(warnings).toContainEqual({ kind: 'clock-drift', rejectedCount: 2 });
  });

  it('compte les points en attente plutôt que d’afficher une icône ambiguë', () => {
    expect(warningsFrom(outcome(), 0, 3)).toContainEqual({ kind: 'points-pending', count: 3 });
  });

  it('cumule les rejets de précision d’un lot à l’autre', () => {
    const refused = outcome({
      acceptedCount: 0,
      lastAcceptedSequence: -1,
      rejected: [
        { sequenceNumber: 0, reason: 'ACCURACY_TOO_LOW' },
        { sequenceNumber: 1, reason: 'ACCURACY_TOO_LOW' },
      ],
    });

    expect(trailingAccuracyRejections(refused, 3)).toBe(5);
  });

  it('remet le compteur à zéro dès qu’un point repasse', () => {
    // Le fix est revenu : la série est cassée, ce n'est plus une série.
    const mixed = outcome({
      acceptedCount: 2,
      lastAcceptedSequence: 5,
      rejected: [{ sequenceNumber: 3, reason: 'ACCURACY_TOO_LOW' }],
    });

    expect(trailingAccuracyRejections(mixed, 4)).toBe(0);
  });

  it('ne compte pas un rejet qui n’est pas de précision', () => {
    const duplicate = outcome({
      acceptedCount: 0,
      lastAcceptedSequence: -1,
      rejected: [{ sequenceNumber: 0, reason: 'DUPLICATE_SEQUENCE' }],
    });

    expect(trailingAccuracyRejections(duplicate, 2)).toBe(0);
  });
});
