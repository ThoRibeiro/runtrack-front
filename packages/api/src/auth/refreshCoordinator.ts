import { RunTrackError, endsSession, type Clock, type Session } from '@runtrack/core';
import type { SessionHolder } from './sessionHolder';

/**
 * §11, "le piège le plus coûteux du projet", and the reason this file exists on
 * its own.
 *
 * The refresh token is rotating and single-use, and the server **detects its
 * reuse**: a replayed refresh invalidates the whole family and signs the user
 * out. Meanwhile the application fires ten requests in parallel at launch, the
 * access token expires, and all ten get a 401. If each one refreshes, nine
 * replay a token that has already been consumed and the user is logged out at
 * launch, having done nothing.
 *
 * So: **one refresh in flight**. The first 401 starts the renewal, the others
 * wait for its result and replay their request.
 *
 * The second trap is subtler and is the reason for `staleToken`. A request whose
 * 401 arrives *after* a refresh has already completed would otherwise start a
 * second refresh with the token that was just consumed — the same replay,
 * simply later. Comparing against the token in hand catches it: if the holder
 * already carries a different one, someone has rotated it and there is nothing
 * to do.
 */
export type Refresher = (refreshToken: string) => Promise<Session>;

export class RefreshCoordinator {
  private inFlight: Promise<Session> | undefined;

  constructor(
    private readonly holder: SessionHolder,
    private readonly refresher: Refresher,
    private readonly clock: Clock,
  ) {}

  /** How many renewals actually went to the server. Read by the tests. */
  private renewals = 0;

  get renewalCount(): number {
    return this.renewals;
  }

  /**
   * @param staleToken the refresh token the caller was holding when it decided
   *   a renewal was needed.
   */
  refresh(staleToken: string): Promise<Session> {
    const current = this.holder.current();

    // Someone got there first: their session is the good one.
    if (current !== undefined && current.refreshToken !== staleToken) {
      return Promise.resolve(current);
    }

    this.inFlight ??= this.renew(staleToken);
    return this.inFlight;
  }

  private async renew(staleToken: string): Promise<Session> {
    this.renewals += 1;
    try {
      const session = await this.refresher(staleToken);
      await this.holder.replace(session);
      return session;
    } catch (error) {
      // A reused, revoked or expired refresh token means the family is gone.
      // Keeping it would make every later request fail the same way, silently.
      if (error instanceof RunTrackError && endsSession(error)) {
        await this.holder.clear();
      }
      throw error;
    } finally {
      this.inFlight = undefined;
    }
  }

  /** Whether the access token is close enough to expiry to renew before sending. */
  needsPreemptiveRefresh(session: Session): boolean {
    return session.accessTokenExpiresAt - 60_000 <= this.clock.now();
  }
}
