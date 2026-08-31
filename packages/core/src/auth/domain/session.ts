import type { UserId } from '../../shared/identity/ids';
import type { Clock, Instant } from '../../shared/time/clock';
import { MINUTE, type Millis } from '../../shared/time/duration';

/**
 * A session: a fifteen-minute access token and a rotating, single-use refresh
 * token valid thirty days (§11).
 *
 * The single-use part is what makes §11 "le piège le plus coûteux du projet":
 * replaying a refresh invalidates the whole family and signs the user out. The
 * coordination that prevents it — one refresh in flight, the others waiting —
 * belongs to `packages/api`, where the requests are. What lives here is the
 * rule that decides *when* a refresh is needed.
 */
export interface Session {
  userId: UserId;
  accessToken: string;
  refreshToken: string;
  /** When the access token stops being accepted. */
  accessTokenExpiresAt: Instant;
}

/**
 * Refresh a little before expiry rather than on the first 401. A request that
 * leaves with thirty seconds of validity left can still arrive expired, and
 * every one of those is a 401 that risks a refresh stampede.
 */
export const REFRESH_MARGIN: Millis = MINUTE;

export function isAccessTokenUsable(session: Session, clock: Clock): boolean {
  return session.accessTokenExpiresAt - REFRESH_MARGIN > clock.now();
}

export function needsRefresh(session: Session | undefined, clock: Clock): boolean {
  return session !== undefined && !isAccessTokenUsable(session, clock);
}
