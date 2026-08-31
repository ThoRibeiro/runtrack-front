import {
  ACCOUNT_STATUSES,
  ACTIVITY_TYPES,
  BIOLOGICAL_SEXES,
  STATS_PERIODS,
  VISIBILITIES,
  userId,
  type FeedAuthor,
  type MyProfile,
  type Physiology,
  type PublicProfile,
  type RunnerTotals,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import { narrow, required, toInstant, toOptionalInstant, toOptionalString } from './primitives';

type PublicProfileDto = components['schemas']['PublicProfile'];
type MyProfileDto = components['schemas']['MyProfile'];
type PhysiologyDto = components['schemas']['PhysiologyPayload'];
type TotalsDto = components['schemas']['RunnerTotalsResponse'];
type AuthorDto = components['schemas']['AuthorDto'];

export function toPublicProfile(dto: PublicProfileDto): PublicProfile {
  return {
    id: userId(required(dto.id, 'id de profil')),
    handle: dto.handle ?? '',
    displayName: dto.displayName ?? '',
    avatarUrl: toOptionalString(dto.avatarUrl),
    bio: toOptionalString(dto.bio),
    // Fails closed: an unknown scope is treated as the most private one.
    accountScope: narrow(dto.accountScope, VISIBILITIES, 'PRIVATE'),
  };
}

export function toMyProfile(dto: MyProfileDto): MyProfile {
  return {
    id: userId(required(dto.id, 'id de profil')),
    handle: dto.handle ?? '',
    displayName: dto.displayName ?? '',
    avatarUrl: toOptionalString(dto.avatarUrl),
    bio: toOptionalString(dto.bio),
    accountScope: narrow(dto.accountScope, VISIBILITIES, 'PRIVATE'),
    email: dto.email ?? '',
    status: narrow(dto.status, ACCOUNT_STATUSES, 'ACTIVE'),
    registeredAt: dto.registeredAt === undefined ? 0 : toInstant(dto.registeredAt),
  };
}

export function toPhysiology(dto: PhysiologyDto): Physiology {
  return {
    birthDate: toOptionalString(dto.birthDate),
    biologicalSex: narrow(dto.biologicalSex, BIOLOGICAL_SEXES, 'UNSPECIFIED'),
    weightKilograms: dto.weightKilograms,
    // The server spells it the American way; the domain does not.
    heightCentimetres: dto.heightCentimeters,
  };
}

export function toRunnerTotals(dto: TotalsDto): RunnerTotals {
  return {
    period: narrow(dto.period, STATS_PERIODS, 'MONTH'),
    since: toOptionalInstant(dto.since),
    activityCount: dto.activityCount ?? 0,
    distanceMetres: dto.distanceMeters ?? 0,
    movingTimeSeconds: dto.movingTimeSeconds ?? 0,
    elevationGain: dto.elevationGain ?? 0,
    byType: (dto.byType ?? []).map((totals) => ({
      type: narrow(totals.type, ACTIVITY_TYPES, 'RUN'),
      activityCount: totals.activityCount ?? 0,
      distanceMetres: totals.distanceMeters ?? 0,
      movingTimeSeconds: totals.movingTimeSeconds ?? 0,
    })),
  };
}

export function toAuthor(dto: AuthorDto | undefined): FeedAuthor {
  return {
    id: userId(required(dto?.id, 'auteur')),
    handle: dto?.handle ?? '',
    displayName: dto?.displayName ?? '',
    avatarUrl: toOptionalString(dto?.avatarUrl),
  };
}
