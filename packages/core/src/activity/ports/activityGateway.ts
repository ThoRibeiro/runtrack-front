import type { Page, PageRequest } from '../../shared/paging/page';
import type { ActivityId, UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';
import type { PointBatch } from '../../recording/domain/batching';
import type { IngestionOutcome } from '../../recording/domain/ingestion';
import type { Activity, ActivityType, Visibility } from '../domain/activity';
import type { Split, Track } from '../domain/track';

export interface StartActivityCommand {
  type: ActivityType;
  title: string;
  description?: string | undefined;
  visibility: Visibility;
  /**
   * §6: sent **once**, at the start. The server measures the clock drift from
   * it and corrects every later point. Sending it again would shift the track.
   */
  deviceTime: Instant;
}

/** The API of activities, behind a port so the domain is testable without a network. */
export interface ActivityGateway {
  start(command: StartActivityCommand): Promise<Activity>;
  byId(id: ActivityId): Promise<Activity>;
  ingest(batch: PointBatch): Promise<IngestionOutcome>;
  pause(id: ActivityId): Promise<Activity>;
  resume(id: ActivityId): Promise<Activity>;
  finish(id: ActivityId): Promise<Activity>;
  discard(id: ActivityId): Promise<Activity>;
  /**
   * Supprime la course et tout ce qu'elle a laissé : points, trace, splits.
   *
   * Distinct de `discard`, qui abandonne une course **en cours**. Une course
   * terminée ne peut plus être abandonnée — le serveur refuse —, et une sortie
   * qu'on ne veut plus voir doit pouvoir disparaître.
   */
  delete(id: ActivityId): Promise<void>;
  changeVisibility(id: ActivityId, visibility: Visibility): Promise<Activity>;
  track(id: ActivityId): Promise<Track>;
  splits(id: ActivityId): Promise<readonly Split[]>;
  ofUser(userId: UserId, page: PageRequest): Promise<Page<Activity>>;
  /** The in-progress activities of the accounts followed. */
  live(): Promise<readonly Activity[]>;
}
