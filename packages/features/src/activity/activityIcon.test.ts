import { ACTIVITY_TYPES } from '@runtrack/core';
import { iconNames } from '@runtrack/ui';
import { iconForActivityType } from './activityIcon';

describe('l’icône d’un type de course', () => {
  it('donne au vélo son vélo, et à la marche sa marche', () => {
    // Les trois écrans qui montrent un type affichaient le même tracé de
    // cardio : « Vélo » avec l'icône d'une course à pied.
    expect(iconForActivityType('BIKE')).toBe('bike');
    expect(iconForActivityType('WALK')).toBe('walk');
    expect(iconForActivityType('TRAIL')).toBe('mountain');
    expect(iconForActivityType('RUN')).toBe('activity');
  });

  it('n’en désigne aucune qui n’existe pas dans le jeu', () => {
    for (const type of ACTIVITY_TYPES) {
      expect(iconNames).toContain(iconForActivityType(type));
    }
  });
});
