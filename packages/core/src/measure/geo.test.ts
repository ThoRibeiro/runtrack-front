import { describe, expect, it } from 'vitest';
import { boundingBoxOf, distanceBetween, isValidGeoPoint, pathLength } from './geo';

const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const LYON = { latitude: 45.764, longitude: 4.8357 };

describe('distanceBetween', () => {
  it('retrouve la distance Paris–Lyon à moins d’un kilomètre près', () => {
    // 392 km à vol d'oiseau, valeur de référence.
    expect(distanceBetween(PARIS, LYON)).toBeGreaterThan(391_000);
    expect(distanceBetween(PARIS, LYON)).toBeLessThan(393_000);
  });

  it('rend zéro entre un point et lui-même', () => {
    expect(distanceBetween(PARIS, PARIS)).toBeCloseTo(0, 6);
  });

  it('est symétrique', () => {
    expect(distanceBetween(PARIS, LYON)).toBeCloseTo(distanceBetween(LYON, PARIS), 6);
  });

  it('reste juste sur une courte distance, là où l’approximation plate dérive', () => {
    const a = { latitude: 48.8566, longitude: 2.3522 };
    const b = { latitude: 48.8566, longitude: 2.3536 };
    // 0,0014° de longitude à cette latitude : environ 102 m.
    expect(distanceBetween(a, b)).toBeGreaterThan(95);
    expect(distanceBetween(a, b)).toBeLessThan(110);
  });

  it('refuse une coordonnée hors des bornes terrestres', () => {
    expect(() => distanceBetween(PARIS, { latitude: 91, longitude: 0 })).toThrow(RangeError);
    expect(() => distanceBetween({ latitude: 0, longitude: 181 }, PARIS)).toThrow(RangeError);
  });
});

describe('isValidGeoPoint', () => {
  it('rejette NaN, que les bornes numériques laisseraient passer', () => {
    expect(isValidGeoPoint({ latitude: Number.NaN, longitude: 0 })).toBe(false);
    expect(isValidGeoPoint({ latitude: 0, longitude: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it('accepte les extrêmes légitimes', () => {
    expect(isValidGeoPoint({ latitude: -90, longitude: 180 })).toBe(true);
  });
});

describe('pathLength', () => {
  it('somme les segments', () => {
    const total = pathLength([PARIS, LYON, PARIS]);
    expect(total).toBeCloseTo(distanceBetween(PARIS, LYON) * 2, 3);
  });

  it('rend zéro pour zéro ou un point', () => {
    expect(pathLength([])).toBe(0);
    expect(pathLength([PARIS])).toBe(0);
  });
});

describe('boundingBoxOf', () => {
  it('encadre tous les points', () => {
    expect(boundingBoxOf([PARIS, LYON])).toEqual({
      south: 45.764,
      north: 48.8566,
      west: 2.3522,
      east: 4.8357,
    });
  });

  it('ne rend rien pour une trace vide, plutôt qu’une boîte de taille nulle', () => {
    // « rien à cadrer » et « une boîte plate » sont deux consignes différentes
    // pour une carte.
    expect(boundingBoxOf([])).toBeUndefined();
  });

  it('encadre un point unique par une boîte plate', () => {
    expect(boundingBoxOf([PARIS])).toEqual({
      south: 48.8566,
      north: 48.8566,
      west: 2.3522,
      east: 2.3522,
    });
  });
});
