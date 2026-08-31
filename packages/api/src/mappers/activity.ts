import {
  ACTIVITY_TYPES,
  POINT_REJECTIONS,
  VISIBILITIES,
  activityId,
  userId,
  type Activity,
  type ActivityStats,
  type ActivityStatus,
  type IngestionOutcome,
  type Split,
  type Track,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import {
  narrow,
  narrowOrThrow,
  required,
  toInstant,
  toOptionalInstant,
  toOptionalString,
} from './primitives';

type ActivityResponse = components['schemas']['ActivityResponse'];
type StatsResponse = components['schemas']['StatsResponse'];
type SplitResponse = components['schemas']['SplitResponse'];
type TrackResponse = components['schemas']['TrackResponse'];

export function toStats(dto: StatsResponse | undefined): ActivityStats {
  return {
    distanceMetres: dto?.distanceMeters ?? 0,
    elapsedSeconds: dto?.elapsedSeconds ?? 0,
    movingTimeSeconds: dto?.movingTimeSeconds ?? 0,
    averagePaceSecondsPerKm: dto?.averagePaceSecondsPerKm,
    currentPaceSecondsPerKm: dto?.currentPaceSecondsPerKm,
    elevationGain: dto?.elevationGain ?? 0,
    elevationLoss: dto?.elevationLoss ?? 0,
    averageHeartRate: dto?.averageHeartRate,
    maxHeartRate: dto?.maxHeartRate,
  };
}

/**
 * The server sends the simple name of its sealed status — `Live`, `Paused`,
 * `Finished`, `Discarded` — and only sends `endedAt` for the two terminal ones.
 *
 * An unrecognised status **throws** rather than falling back. Every other
 * enumeration here degrades gracefully, but the lifecycle decides whether
 * points may be sent and whether the recorder may resume: guessing it wrong is
 * worse than failing loudly.
 */
const STATUS_NAMES = ['Live', 'Paused', 'Finished', 'Discarded'] as const;

export function toStatus(
  status: string | undefined,
  startedAt: number,
  endedAt: number | undefined,
): ActivityStatus {
  const name = narrowOrThrow(status, STATUS_NAMES, 'État de course');

  switch (name) {
    case 'Live':
      return { kind: 'live', since: startedAt };
    case 'Paused':
      return { kind: 'paused', since: startedAt };
    case 'Finished':
      return { kind: 'finished', since: endedAt ?? startedAt };
    case 'Discarded':
      return { kind: 'discarded', since: endedAt ?? startedAt };
  }
}

export function toActivity(dto: ActivityResponse): Activity {
  const startedAt = dto.startedAt === undefined ? 0 : toInstant(dto.startedAt);
  return {
    id: activityId(required(dto.id, 'id de course')),
    ownerId: userId(required(dto.ownerId, 'propriétaire de la course')),
    type: narrow(dto.type, ACTIVITY_TYPES, 'RUN'),
    title: dto.title ?? '',
    description: toOptionalString(dto.description),
    // Fails closed: an unknown scope shows the activity to nobody rather than
    // to everybody.
    visibility: narrow(dto.visibility, VISIBILITIES, 'PRIVATE'),
    status: toStatus(dto.status, startedAt, toOptionalInstant(dto.endedAt)),
    startedAt,
    endedAt: toOptionalInstant(dto.endedAt),
    stats: toStats(dto.stats),
  };
}

export function toSplit(dto: SplitResponse): Split {
  return {
    kilometreIndex: dto.kilometerIndex ?? 0,
    distanceMetres: dto.distanceMeters ?? 0,
    timeSeconds: dto.timeSeconds ?? 0,
    paceSecondsPerKm: dto.paceSecondsPerKm ?? 0,
    elevationGain: dto.elevationGain ?? 0,
    averageHeartRate: dto.averageHeartRate,
    complete: dto.complete ?? false,
  };
}

export function toTrack(dto: TrackResponse): Track {
  return {
    polyline: dto.polyline ?? '',
    pointCount: dto.pointCount ?? 0,
    pointsPurgedAt: toOptionalInstant(dto.pointsPurgedAt),
  };
}

/**
 * The ingestion answer. The OpenAPI description types it as `string` — springdoc
 * could not see through the controller's return type — so the shape comes from
 * the server's own `PointDtos.IngestionResponse`, and this is one of the two
 * places §1 of the lot-4 decisions describes.
 */
export interface IngestionResponseDto {
  stats?: StatsResponse;
  lastAcceptedSequence?: number;
  acceptedCount?: number;
  rejected?: { sequenceNumber?: number; reason?: string }[];
}

export function toIngestionOutcome(dto: IngestionResponseDto): IngestionOutcome {
  return {
    stats: toStats(dto.stats),
    lastAcceptedSequence: dto.lastAcceptedSequence ?? -1,
    acceptedCount: dto.acceptedCount ?? 0,
    rejected: (dto.rejected ?? []).map((rejection) => ({
      sequenceNumber: rejection.sequenceNumber ?? -1,
      // §6: a rejection this build does not recognise must not be silently
      // dropped — it still says a point did not make it.
      reason: narrow(rejection.reason, POINT_REJECTIONS, 'ACCURACY_TOO_LOW'),
    })),
  };
}
