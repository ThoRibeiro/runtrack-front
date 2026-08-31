import type { Page, PageRequest } from '../../shared/paging/page';
import type { UserId } from '../../shared/identity/ids';
import type { PublicProfile } from '../../user/domain/profile';

export const FOLLOW_STATUSES = ['NONE', 'PENDING', 'ACCEPTED'] as const;
export type FollowStatus = (typeof FOLLOW_STATUSES)[number];

export interface FollowRequest {
  requestId: string;
  followerId: UserId;
  requestedAt: number;
}

export interface SocialGateway {
  profileOf(handle: string): Promise<PublicProfile>;
  search(query: string, page: PageRequest): Promise<Page<PublicProfile>>;
  followers(userId: UserId, page: PageRequest): Promise<Page<PublicProfile>>;
  following(userId: UserId, page: PageRequest): Promise<Page<PublicProfile>>;
  /** Returns `PENDING` on a private account, `ACCEPTED` on a public one. */
  follow(userId: UserId): Promise<FollowStatus>;
  unfollow(userId: UserId): Promise<void>;
  block(userId: UserId): Promise<void>;
  unblock(userId: UserId): Promise<void>;
  pendingRequests(): Promise<readonly FollowRequest[]>;
  acceptRequest(userId: UserId): Promise<void>;
  rejectRequest(userId: UserId): Promise<void>;
}
