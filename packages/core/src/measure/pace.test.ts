import { describe, expect, it } from 'vitest';
import { paceFromSpeed, paceOver, paceParts, speedFromPace } from './pace';
import { elevationChange } from './elevation';

describe('allure', () => {
  it('convertit une vitesse en allure', () => {
    // 3,2 m/s, soit 5:12 au kilomètre.
    expect(paceFromSpeed(3.2)).toBeCloseTo(312.5, 1);
  });

  it('n’a pas d’allure à l’arrêt, plutôt qu’une allure infinie', () => {
    // Renvoyer l'infini afficherait « ∞:00 ».
    expect(paceFromSpeed(0)).toBeUndefined();
    expect(paceFromSpeed(-1)).toBeUndefined();
    expect(paceFromSpeed(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it('fait l’aller-retour entre allure et vitesse', () => {
    expect(speedFromPace(312.5)).toBeCloseTo(3.2, 6);
    expect(speedFromPace(0)).toBeUndefined();
  });

  it('calcule une allure moyenne sur une distance et une durée', () => {
    expect(paceOver(10_000, 3_000)).toBe(300);
  });

  it('n’invente pas d’allure sans distance ni durée', () => {
    expect(paceOver(0, 100)).toBeUndefined();
    expect(paceOver(100, 0)).toBeUndefined();
  });

  it('garde les heures pour une allure très lente', () => {
    // Une marche en montagne dépasse l'heure au kilomètre : tronquer
    // afficherait 5:15 pour 65:15.
    expect(paceParts(3_915)).toEqual({ hours: 1, minutes: 5, seconds: 15 });
  });
});

describe('dénivelé', () => {
  it('somme les montées et les descentes au-delà du bruit', () => {
    expect(elevationChange([100, 110, 105, 130])).toEqual({ gain: 35, loss: 5 });
  });

  it('ignore le tremblement du GPS à l’arrêt', () => {
    // Sans seuil, dix kilomètres de plat produisent 200 m de dénivelé.
    expect(elevationChange([100, 101, 100, 102, 99, 100])).toEqual({ gain: 0, loss: 0 });
  });

  it('rend zéro sur une série vide', () => {
    expect(elevationChange([])).toEqual({ gain: 0, loss: 0 });
  });

  it('accepte un seuil explicite', () => {
    expect(elevationChange([100, 101], 0.5)).toEqual({ gain: 1, loss: 0 });
  });
});
