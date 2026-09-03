import type { ActivityType } from '@runtrack/core';
import type { IconName } from '@runtrack/ui';

/**
 * L'icône d'un type de course.
 *
 * Une table plutôt qu'un `switch` disséminé : trois écrans montrent ce type, et
 * ils affichaient tous le même tracé de cardio — « Vélo » avec l'icône d'une
 * course à pied. Le compilateur exige une entrée par type, donc en ajouter un
 * au domaine casse ici, avant l'écran.
 */
const ICONS: Record<ActivityType, IconName> = {
  RUN: 'activity',
  TRAIL: 'mountain',
  BIKE: 'bike',
  WALK: 'walk',
};

export function iconForActivityType(type: ActivityType): IconName {
  return ICONS[type];
}
