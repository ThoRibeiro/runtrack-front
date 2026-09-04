import type { ActivityType } from '@runtrack/core';
import { formatPace, formatSpeed, spokenPace, spokenSpeed } from './units';
import { translate } from '../i18n';

/**
 * Ce qu'un écran affiche d'un effort : une allure, ou une vitesse.
 *
 * Le vélo se lit en km/h, la course à pied en min/km — et les deux mesures d'un
 * même écran partagent forcément l'unité, sinon l'instantanée et la moyenne ne
 * se comparent plus.
 */
export interface Effort {
  value: string;
  unit: string;
  spoken: string;
}

/** §: seul le vélo roule assez vite pour que la vitesse parle mieux que l'allure. */
export function usesSpeed(type: ActivityType): boolean {
  return type === 'BIKE';
}

export function effortOf(type: ActivityType, secondsPerKm: number | undefined): Effort {
  return usesSpeed(type)
    ? {
        value: formatSpeed(secondsPerKm),
        unit: translate('common.kmPerHour'),
        spoken: spokenSpeed(secondsPerKm),
      }
    : {
        value: formatPace(secondsPerKm),
        unit: translate('common.perKm'),
        spoken: spokenPace(secondsPerKm),
      };
}
