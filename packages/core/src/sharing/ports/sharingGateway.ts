import type { ActivityId, ShareLinkId } from '../../shared/identity/ids';
import type { Instant } from '../../shared/time/clock';

/**
 * A share link opens a private activity without an account (§10, web).
 * The token is the whole secret, which is why it is never logged.
 */
export interface ShareLink {
  id: ShareLinkId;
  /** The whole secret. Never logged, never put in an analytics event. */
  token: string;
  url: string;
  createdAt: Instant;
  expiresAt: Instant | undefined;
  revokedAt: Instant | undefined;
  viewCount: number;
}

export interface SharingGateway {
  linksOf(activityId: ActivityId): Promise<readonly ShareLink[]>;
  create(activityId: ActivityId, validForHours?: number): Promise<ShareLink>;
  revoke(id: ShareLinkId): Promise<void>;
}
