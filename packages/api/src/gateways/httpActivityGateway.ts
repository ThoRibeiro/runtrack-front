import type {
  Activity,
  ActivityGateway,
  ActivityId,
  IngestionOutcome,
  Page,
  PageRequest,
  PointBatch,
  Split,
  StartActivityCommand,
  Track,
  UserId,
  Visibility,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import { toPage, type CursorPage, type HttpClient } from '../http/httpClient';
import {
  toActivity,
  toIngestionOutcome,
  toSplit,
  toTrack,
  type IngestionResponseDto,
} from '../mappers/activity';

type ActivityResponse = components['schemas']['ActivityResponse'];
type SplitsResponse = components['schemas']['SplitsResponse'];
type TrackResponse = components['schemas']['TrackResponse'];

/** The paths are the back-end's, not the brief's: see `docs/decisions-lot-3.md` §1. */
export class HttpActivityGateway implements ActivityGateway {
  constructor(private readonly http: HttpClient) {}

  async start(command: StartActivityCommand): Promise<Activity> {
    const dto = await this.http.request<ActivityResponse>('/race/v1', {
      method: 'POST',
      body: {
        type: command.type,
        title: command.title,
        description: command.description,
        visibility: command.visibility,
        // §6: sent once, at the start. The server measures the clock drift from
        // it; sending it again mid-activity would shift the whole track.
        deviceTime: new Date(command.deviceTime).toISOString(),
      },
    });
    return toActivity(dto);
  }

  async byId(id: ActivityId): Promise<Activity> {
    return toActivity(await this.http.request<ActivityResponse>(`/race/v1/${id}`));
  }

  async ingest(batch: PointBatch): Promise<IngestionOutcome> {
    const dto = await this.http.request<IngestionResponseDto>(
      `/race/v1/${batch.activityId}/points`,
      {
        method: 'POST',
        // §6: same key + same body replays the memorised response; same key +
        // a different body answers 409 IDEMPOTENCY_KEY_REUSED.
        idempotencyKey: batch.idempotencyKey,
        body: {
          points: batch.points.map((point) => ({
            sequenceNumber: point.sequenceNumber,
            latitude: point.position.latitude,
            longitude: point.position.longitude,
            elevation: point.elevationMetres,
            recordedAt: new Date(point.recordedAt).toISOString(),
            accuracyMeters: point.accuracyMetres,
            heartRate: point.heartRate,
            cadence: point.cadence,
          })),
        },
      },
    );
    return toIngestionOutcome(dto);
  }

  async pause(id: ActivityId): Promise<Activity> {
    return this.transition(id, 'pause');
  }

  async resume(id: ActivityId): Promise<Activity> {
    return this.transition(id, 'resume');
  }

  async finish(id: ActivityId): Promise<Activity> {
    return this.transition(id, 'finish');
  }

  async discard(id: ActivityId): Promise<Activity> {
    return this.transition(id, 'discard');
  }

  async changeVisibility(id: ActivityId, visibility: Visibility): Promise<Activity> {
    await this.http.requestVoid(`/race/v1/${id}/visibility`, {
      method: 'PUT',
      body: { visibility },
    });
    return this.byId(id);
  }

  async track(id: ActivityId): Promise<Track> {
    return toTrack(await this.http.request<TrackResponse>(`/race/v1/${id}/track`));
  }

  async splits(id: ActivityId): Promise<readonly Split[]> {
    const dto = await this.http.request<SplitsResponse>(`/race/v1/${id}/splits`);
    return (dto.items ?? []).map(toSplit);
  }

  async ofUser(owner: UserId, page: PageRequest): Promise<Page<Activity>> {
    const dto = await this.http.request<CursorPage<ActivityResponse>>(`/user/v1/${owner}/races`, {
      query: { cursor: page.cursor, limit: page.limit },
    });
    return toPage(dto, toActivity);
  }

  async live(): Promise<readonly Activity[]> {
    const dto = await this.http.request<CursorPage<ActivityResponse>>('/race/v1/live');
    return (dto.items ?? []).map(toActivity);
  }

  private async transition(id: ActivityId, move: string): Promise<Activity> {
    return toActivity(
      await this.http.request<ActivityResponse>(`/race/v1/${id}/${move}`, { method: 'POST' }),
    );
  }
}
