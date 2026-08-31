import type { UserId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';
import type { PublicProfile } from '../../user/domain/profile';

export const FOLLOW_STATUSES = ['NONE', 'PENDING', 'ACCEPTED'] as const;
export type FollowStatus = (typeof FOLLOW_STATUSES)[number];

/**
 * A pending follow request. The server sends the **requester's id** and nothing
 * else — no handle, no display name.
 */
export interface FollowRequest {
  requestId: string;
  followerId: UserId;
  requestedAt: Instant;
}

/**
 * What `GET /user/v1/{id}/followers` returns: identifiers and a count.
 *
 * Not profiles, and that is not an oversight in this client — there is no
 * endpoint that turns an id into a profile. `/user/v1/{handle}` resolves by
 * **handle** only. The consequence is written down in `docs/decisions-lot-6.md`:
 * the follower and following screens of §10 can show how many, not who, until
 * the server sends handles.
 */
export interface UserIdList {
  userIds: readonly UserId[];
  count: number;
}

export interface SocialGateway {
  /** By handle. There is no lookup by identifier. */
  profileOf(handle: string): Promise<PublicProfile>;
  /** Not paginated server-side: the endpoint answers a plain list. */
  search(query: string): Promise<readonly PublicProfile[]>;
  followers(userId: UserId): Promise<UserIdList>;
  following(userId: UserId): Promise<UserIdList>;
  /** `PENDING` on a private account, `ACCEPTED` on a public one. */
  follow(userId: UserId): Promise<FollowStatus>;
  unfollow(userId: UserId): Promise<void>;
  block(userId: UserId): Promise<void>;
  unblock(userId: UserId): Promise<void>;
  pendingRequests(): Promise<readonly FollowRequest[]>;
  acceptRequest(userId: UserId): Promise<void>;
  rejectRequest(userId: UserId): Promise<void>;
}
