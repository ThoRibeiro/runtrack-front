import { describe, expect, it } from 'vitest';
import { decodePolyline, decodePolylineChunk, encodePolyline } from './polyline';

/** Le jeu d'essai de la spécification Google, qui sert de vérité extérieure. */
const REFERENCE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
const REFERENCE_POINTS = [
  { latitude: 38.5, longitude: -120.2 },
  { latitude: 40.7, longitude: -120.95 },
  { latitude: 43.252, longitude: -126.453 },
];

describe('decodePolyline', () => {
  it('décode le jeu d’essai de référence', () => {
    const points = decodePolyline(REFERENCE);
    expect(points).toHaveLength(3);
    points.forEach((point, index) => {
      const expected = REFERENCE_POINTS[index];
      expect(point.latitude).toBeCloseTo(expected?.latitude ?? 0, 5);
      expect(point.longitude).toBeCloseTo(expected?.longitude ?? 0, 5);
    });
  });

  it('rend une trace vide pour une chaîne vide', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('refuse une polyline tronquée plutôt que de rendre une trace fausse', () => {
    expect(() => decodePolyline('_p~iF~ps|U_ulL')).toThrow(SyntaxError);
  });

  it('refuse un caractère hors de la plage encodable', () => {
    // Tout ce qui est en dessous de « ? » (63) sort de l'alphabet du format.
    expect(() => decodePolyline('')).toThrow(SyntaxError);
  });
});

describe('encodePolyline', () => {
  it('fait l’aller-retour sans perte au-delà de la précision du format', () => {
    const encoded = encodePolyline(REFERENCE_POINTS);
    const decoded = decodePolyline(encoded);

    decoded.forEach((point, index) => {
      expect(point.latitude).toBeCloseTo(REFERENCE_POINTS[index]?.latitude ?? 0, 5);
      expect(point.longitude).toBeCloseTo(REFERENCE_POINTS[index]?.longitude ?? 0, 5);
    });
  });

  it('produit exactement la chaîne de référence', () => {
    expect(encodePolyline(REFERENCE_POINTS)).toBe(REFERENCE);
  });

  it('encode une trace vide en chaîne vide', () => {
    expect(encodePolyline([])).toBe('');
  });
});

describe('decodePolylineChunk', () => {
  it('permet de reprendre là où on s’est arrêté', () => {
    // §8 : dix mille points bloquent le fil principal. Le découpage est ce qui
    // permet à un adaptateur de rendre la main entre deux tranches.
    const first = decodePolylineChunk(REFERENCE, { maximumPoints: 1 });
    expect(first.points).toHaveLength(1);
    expect(first.nextIndex).toBeGreaterThan(0);
    expect(first.nextIndex).toBeLessThan(REFERENCE.length);

    const rest = decodePolylineChunk(REFERENCE, {
      fromIndex: first.nextIndex,
      latitude: first.latitude,
      longitude: first.longitude,
    });

    expect([...first.points, ...rest.points]).toHaveLength(3);
    expect(rest.points[1]?.latitude).toBeCloseTo(43.252, 5);
  });

  it('signale la fin par un index égal à la longueur', () => {
    expect(decodePolylineChunk(REFERENCE).nextIndex).toBe(REFERENCE.length);
  });
});
