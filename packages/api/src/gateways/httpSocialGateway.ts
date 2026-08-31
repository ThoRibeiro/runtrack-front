import {
  userId,
  type FollowRequest,
  type FollowStatus,
  type PublicProfile,
  type SocialGateway,
  type UserId,
  type UserIdList,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import type { HttpClient } from '../http/httpClient';
import { narrow, required, toInstant } from '../mappers/primitives';
import { toPublicProfile } from '../mappers/user';

type PublicProfileDto = components['schemas']['PublicProfile'];
type UserIdListDto = components['schemas']['UserIdList'];
type PendingRequestDto = components['schemas']['PendingRequest'];
type FollowResponseDto = components['schemas']['FollowResponse'];

const FOLLOW_STATUSES = ['NONE', 'PENDING', 'ACCEPTED'] as const;

export class HttpSocialGateway implements SocialGateway {
  constructor(private readonly http: HttpClient) {}

  async profileOf(handle: string): Promise<PublicProfile> {
    return toPublicProfile(
      await this.http.request<PublicProfileDto>(`/user/v1/${encodeURIComponent(handle)}`),
    );
  }

  /** Not paginated: the endpoint answers a plain list, so neither does this. */
  async search(query: string): Promise<readonly PublicProfile[]> {
    const dto = await this.http.request<PublicProfileDto[]>('/user/v1', {
      query: { search: query },
    });
    return dto.map(toPublicProfile);
  }

  async followers(id: UserId): Promise<UserIdList> {
    return toUserIdList(await this.http.request<UserIdListDto>(`/user/v1/${id}/followers`));
  }

  async following(id: UserId): Promise<UserIdList> {
    return toUserIdList(await this.http.request<UserIdListDto>(`/user/v1/${id}/following`));
  }

  async follow(id: UserId): Promise<FollowStatus> {
    const dto = await this.http.request<FollowResponseDto>(`/user/v1/${id}/follow`, {
      method: 'POST',
    });
    return narrow(dto.status, FOLLOW_STATUSES, dto.pending === true ? 'PENDING' : 'ACCEPTED');
  }

  async unfollow(id: UserId): Promise<void> {
    await this.http.requestVoid(`/user/v1/${id}/follow`, { method: 'DELETE' });
  }

  async block(id: UserId): Promise<void> {
    await this.http.requestVoid(`/user/v1/${id}/block`, { method: 'POST' });
  }

  async unblock(id: UserId): Promise<void> {
    await this.http.requestVoid(`/user/v1/${id}/block`, { method: 'DELETE' });
  }

  async pendingRequests(): Promise<readonly FollowRequest[]> {
    const dto = await this.http.request<PendingRequestDto[]>('/user/v1/me/follow-requests');
    return dto.map((request) => ({
      requestId: required(request.requestId, 'identifiant de demande'),
      followerId: userId(required(request.followerId, 'auteur de la demande')),
      requestedAt: request.requestedAt === undefined ? 0 : toInstant(request.requestedAt),
    }));
  }

  async acceptRequest(id: UserId): Promise<void> {
    await this.http.requestVoid(`/user/v1/me/follow-requests/${id}/accept`, { method: 'POST' });
  }

  async rejectRequest(id: UserId): Promise<void> {
    await this.http.requestVoid(`/user/v1/me/follow-requests/${id}/reject`, { method: 'POST' });
  }
}

function toUserIdList(dto: UserIdListDto): UserIdList {
  const ids = dto.userIds ?? [];
  return {
    userIds: ids.map((id) => userId(id)),
    // The count is the server's, not `ids.length`: it is the one the profile
    // header shows, and it stays right even if the list is ever truncated.
    count: dto.count ?? ids.length,
  };
}
