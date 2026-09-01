import {
  shareLinkId as toShareLinkId,
  type ActivityId,
  type ShareLink,
  type ShareLinkId,
  type SharingGateway,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import type { HttpClient } from '../http/httpClient';
import { required, toInstant, toOptionalInstant, toOptionalString } from '../mappers/primitives';

type ShareLinkResponse = components['schemas']['ShareLinkResponse'];
type ShareLinkListResponse = components['schemas']['ShareLinkListResponse'];

/**
 * The clear token comes back **once**, on creation, and never again — the
 * server says so in its own documentation. A link listed later has no token,
 * which is why the field is empty rather than absent: the screen shows "lien
 * actif" and offers to revoke it, not to copy something it no longer has.
 */
export function toShareLink(dto: ShareLinkResponse): ShareLink {
  return {
    id: toShareLinkId(required(dto.id, 'id de lien de partage')),
    token: toOptionalString(dto.token) ?? '',
    url: dto.url ?? '',
    createdAt: toInstant(required(dto.createdAt, 'date du lien')),
    expiresAt: toOptionalInstant(dto.expiresAt),
    revokedAt: toOptionalInstant(dto.revokedAt),
    viewCount: dto.viewCount ?? 0,
  };
}

export class HttpSharingGateway implements SharingGateway {
  constructor(private readonly http: HttpClient) {}

  async linksOf(activityId: ActivityId): Promise<readonly ShareLink[]> {
    const dto = await this.http.request<ShareLinkListResponse>(
      `/race/v1/${activityId}/share-links`,
    );
    return (dto.items ?? []).map(toShareLink);
  }

  async create(activityId: ActivityId, validForHours?: number): Promise<ShareLink> {
    return toShareLink(
      await this.http.request<ShareLinkResponse>(`/race/v1/${activityId}/share-links`, {
        method: 'POST',
        body: { validForHours },
      }),
    );
  }

  async revoke(id: ShareLinkId): Promise<void> {
    await this.http.requestVoid(`/share-link/v1/${id}`, { method: 'DELETE' });
  }
}
