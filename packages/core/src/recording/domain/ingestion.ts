import type { ActivityStats } from '../../activity/domain/activity';

/**
 * Why the server refused a point. §6: these are not to be ignored — a repeated
 * `ACCURACY_TOO_LOW` means the GPS has no fix, and the runner has to hear about
 * it before covering ten kilometres for nothing.
 */
export const POINT_REJECTIONS = [
  'ACCURACY_TOO_LOW',
  'IMPLAUSIBLE_SPEED',
  'TIMESTAMP_IN_FUTURE',
  'TIMESTAMP_BEFORE_START',
  'DUPLICATE_SEQUENCE',
] as const;

export type PointRejection = (typeof POINT_REJECTIONS)[number];

export interface RejectedPoint {
  sequenceNumber: number;
  reason: PointRejection;
}

export interface IngestionOutcome {
  stats: ActivityStats;
  /** §6: purge the buffer up to here, and no further. */
  lastAcceptedSequence: number;
  acceptedCount: number;
  rejected: readonly RejectedPoint[];
}

/**
 * How many consecutive accuracy rejections before the runner is told. One is
 * a building; five in a row is a phone that does not know where it is.
 */
export const NO_FIX_REJECTION_THRESHOLD = 5;

export type RecordingWarning =
  | { kind: 'no-gps-fix'; consecutiveRejections: number }
  | { kind: 'clock-drift'; rejectedCount: number }
  /**
   * Le serveur a refusé des points, pour une raison qui n'est ni l'horloge ni
   * une panne de GPS : un saut de position, un doublon. Sans cela, la distance
   * reste à zéro et **rien à l'écran ne l'explique** — le coureur croit que
   * l'application n'envoie pas, alors qu'elle envoie et se fait refuser.
   */
  | { kind: 'points-refused'; count: number; reason: PointRejection }
  | { kind: 'points-pending'; count: number };

/**
 * Reads a batch of rejections and says what, if anything, the runner should be
 * told. Returning the reasons rather than a boolean is deliberate: "3 points en
 * attente" is worth more than an ambiguous icon (§6).
 */
export function warningsFrom(
  outcome: IngestionOutcome,
  consecutiveAccuracyRejections: number,
  pendingCount: number,
): RecordingWarning[] {
  const warnings: RecordingWarning[] = [];

  if (consecutiveAccuracyRejections >= NO_FIX_REJECTION_THRESHOLD) {
    warnings.push({ kind: 'no-gps-fix', consecutiveRejections: consecutiveAccuracyRejections });
  }

  const clockRejections = outcome.rejected.filter(
    (rejection) =>
      rejection.reason === 'TIMESTAMP_IN_FUTURE' || rejection.reason === 'TIMESTAMP_BEFORE_START',
  ).length;
  if (clockRejections > 0) {
    warnings.push({ kind: 'clock-drift', rejectedCount: clockRejections });
  }

  // Le reste des refus, sous la raison qui revient le plus : dire « 27 points
  // refusés » sans dire pourquoi ne laisse rien faire à personne.
  const others = outcome.rejected.filter(
    (rejection) =>
      rejection.reason !== 'TIMESTAMP_IN_FUTURE' && rejection.reason !== 'TIMESTAMP_BEFORE_START',
  );
  const dominant = mostFrequentReason(others);
  if (dominant !== undefined) {
    warnings.push({ kind: 'points-refused', count: others.length, reason: dominant });
  }

  if (pendingCount > 0) {
    warnings.push({ kind: 'points-pending', count: pendingCount });
  }

  return warnings;
}

/** La raison la plus fréquente d'un lot de refus, celle qui vaut d'être dite. */
function mostFrequentReason(rejections: readonly RejectedPoint[]): PointRejection | undefined {
  const counts = new Map<PointRejection, number>();
  for (const rejection of rejections) {
    counts.set(rejection.reason, (counts.get(rejection.reason) ?? 0) + 1);
  }

  let best: PointRejection | undefined;
  let bestCount = 0;
  for (const [reason, count] of counts) {
    if (count > bestCount) {
      best = reason;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Counts accuracy rejections that run to the end of the batch. A run broken by
 * an accepted point is not a run — the fix came back.
 */
export function trailingAccuracyRejections(
  outcome: IngestionOutcome,
  previousStreak: number,
): number {
  if (outcome.acceptedCount > 0) {
    const lastRejected = outcome.rejected[outcome.rejected.length - 1];
    if (lastRejected === undefined || lastRejected.sequenceNumber <= outcome.lastAcceptedSequence) {
      return 0;
    }
  }
  const accuracyRejections = outcome.rejected.filter(
    (rejection) => rejection.reason === 'ACCURACY_TOO_LOW',
  ).length;
  return accuracyRejections === 0 ? 0 : previousStreak + accuracyRejections;
}
