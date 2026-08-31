import type { UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';
import type { ActivityType, Visibility } from '../../activity/domain/activity';

export const ACCOUNT_STATUSES = ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const BIOLOGICAL_SEXES = ['FEMALE', 'MALE', 'UNSPECIFIED'] as const;
export type BiologicalSex = (typeof BIOLOGICAL_SEXES)[number];

export interface PublicProfile {
  id: UserId;
  handle: string;
  displayName: string;
  avatarUrl: string | undefined;
  bio: string | undefined;
  /** Who may see this account's activities by default. */
  accountScope: Visibility;
}

export interface MyProfile extends PublicProfile {
  email: string;
  status: AccountStatus;
  registeredAt: Instant;
}

/**
 * Read and written through its own endpoint, not folded into the profile: it is
 * health data, and keeping it separate keeps it out of every profile response.
 */
export interface Physiology {
  /** ISO date, no time: a birth date has no hour. */
  birthDate: string | undefined;
  biologicalSex: BiologicalSex;
  weightKilograms: number | undefined;
  heightCentimetres: number | undefined;
}

export const STATS_PERIODS = ['WEEK', 'MONTH', 'YEAR', 'ALL'] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

export interface TotalsByType {
  type: ActivityType;
  activityCount: number;
  distanceMetres: number;
  movingTimeSeconds: number;
}

export interface RunnerTotals {
  period: StatsPeriod;
  since: Instant | undefined;
  activityCount: number;
  distanceMetres: number;
  movingTimeSeconds: number;
  elevationGain: number;
  byType: readonly TotalsByType[];
}

/**
 * How far through a weekly goal the runner is — the ring on the home screen.
 * Clamped, because a goal beaten by 40 % must not draw an arc going round twice.
 */
export function goalProgress(totals: RunnerTotals, goalMetres: number): number {
  if (goalMetres <= 0) return 0;
  return Math.min(1, totals.distanceMetres / goalMetres);
}
