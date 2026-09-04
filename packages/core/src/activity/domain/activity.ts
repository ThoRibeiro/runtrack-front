import type { ActivityId, UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';
import type { Author } from '../../user/domain/profile';

/** The four kinds the server knows. Anything else is a server the client has outgrown. */
export const ACTIVITY_TYPES = ['RUN', 'TRAIL', 'BIKE', 'WALK'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Who may see it. Ordered from most open to most closed, as the server does. */
export const VISIBILITIES = ['PUBLIC', 'FOLLOWERS', 'PRIVATE'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

/**
 * `live` → `paused` → `live` → `finished` | `discarded`. The last two are
 * terminal.
 *
 * A discriminated union rather than a string, so a `switch` that forgets a case
 * is a compile error — the same guarantee the server gets from its sealed
 * interface.
 */
export type ActivityStatus =
  | { kind: 'live'; since: Instant }
  | { kind: 'paused'; since: Instant }
  | { kind: 'finished'; since: Instant }
  | { kind: 'discarded'; since: Instant };

export interface ActivityStats {
  distanceMetres: number;
  elapsedSeconds: number;
  movingTimeSeconds: number;
  averagePaceSecondsPerKm: number | undefined;
  currentPaceSecondsPerKm: number | undefined;
  elevationGain: number;
  elevationLoss: number;
  averageHeartRate: number | undefined;
  maxHeartRate: number | undefined;
  /**
   * Absente tant que le coureur n'a pas renseigné sa masse : le serveur
   * n'invente pas de chiffre par défaut, qui serait indiscernable d'une mesure.
   */
  estimatedCalories: number | undefined;
}

export interface Activity {
  id: ActivityId;
  ownerId: UserId;
  /**
   * Le coureur, tel que le serveur l'imbrique. Absent des réponses du direct,
   * qui ne rediffusent que des chiffres : l'auteur d'une course ne change pas
   * en cours de route, et l'écran garde celui de sa lecture initiale.
   */
  author: Author | undefined;
  type: ActivityType;
  title: string;
  description: string | undefined;
  visibility: Visibility;
  status: ActivityStatus;
  startedAt: Instant;
  endedAt: Instant | undefined;
  stats: ActivityStats;
  /** La forme du parcours, simplifiée : de quoi dessiner une vignette de liste. */
  previewPolyline: string | undefined;
}

/** The only state that accepts points. The recorder asks before it sends. */
export function acceptsPoints(status: ActivityStatus): boolean {
  return status.kind === 'live';
}

export function isTerminal(status: ActivityStatus): boolean {
  return status.kind === 'finished' || status.kind === 'discarded';
}

export function canPause(status: ActivityStatus): boolean {
  return status.kind === 'live';
}

export function canResume(status: ActivityStatus): boolean {
  return status.kind === 'paused';
}

export function canFinish(status: ActivityStatus): boolean {
  return status.kind === 'live' || status.kind === 'paused';
}

/**
 * §2: the web shell can never record. It is not a permission check — it is a
 * fact about browsers, and the rule lives here so both shells read the same one.
 */
export function canRecordOn(platform: 'mobile' | 'web'): boolean {
  return platform === 'mobile';
}
