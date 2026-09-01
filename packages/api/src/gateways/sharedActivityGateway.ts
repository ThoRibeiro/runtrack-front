import type { Activity, Split, Track } from '@runtrack/core';
import type { components } from '../generated/schema';
import type { HttpClient } from '../http/httpClient';
import { toActivity, toSplit, toTrack } from '../mappers/activity';

type ActivityResponse = components['schemas']['ActivityResponse'];
type SplitsResponse = components['schemas']['SplitsResponse'];
type TrackResponse = components['schemas']['TrackResponse'];

/**
 * A shared activity, read without an account (§10, web).
 *
 * **The token travels in the path, not in a header.** The server resolves
 * `/shared/v1/{token}` and *forwards* internally to `/race/v1/{id}`, carrying
 * the suffix over — so `/shared/v1/{token}/track` reads the track of the
 * activity the link points at, and `/shared/v1/{token}/stream` follows it live.
 *
 * That is worth spelling out because lot 4 guessed otherwise: `HttpClient` had
 * a `shareToken` option that sent an `X-Share-Token` header, and no filter on
 * the server has ever read one. The option is gone; this is the real mechanism.
 *
 * Every request here is **anonymous**: a share link is read by someone who may
 * have no account at all, and sending a stale bearer would have the server
 * answer as that person rather than as the link's holder.
 */
export class SharedActivityGateway {
  constructor(
    private readonly http: HttpClient,
    private readonly token: string,
  ) {}

  private path(suffix = ''): string {
    return `/shared/v1/${encodeURIComponent(this.token)}${suffix}`;
  }

  async activity(): Promise<Activity> {
    return toActivity(await this.http.request<ActivityResponse>(this.path(), { anonymous: true }));
  }

  async track(): Promise<Track> {
    return toTrack(
      await this.http.request<TrackResponse>(this.path('/track'), { anonymous: true }),
    );
  }

  async splits(): Promise<readonly Split[]> {
    const dto = await this.http.request<SplitsResponse>(this.path('/splits'), {
      anonymous: true,
    });
    return (dto.items ?? []).map(toSplit);
  }

  /** The path the live stream is opened on. */
  streamUrl(baseUrl: string): string {
    return `${baseUrl}${this.path('/stream')}`;
  }
}
