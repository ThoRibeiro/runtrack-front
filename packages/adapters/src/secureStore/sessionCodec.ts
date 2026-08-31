import { RunTrackError, userId, type Session } from '@runtrack/core';

/**
 * The session, to and from a string. Both stores keep a string; only the way
 * they protect it differs.
 *
 * Reading is defensive on purpose: what comes back was written by an older
 * build, or by a build that stored a shape this one no longer understands.
 * Returning `undefined` there means "no session", which sends the user to the
 * sign-in screen — the right outcome, and better than a crash at launch.
 */
export function encodeSession(session: Session): string {
  return JSON.stringify({
    userId: session.userId,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
  });
}

export function decodeSession(raw: string | null | undefined): Session | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const candidate: Record<string, unknown> = { ...parsed };

  const owner = candidate['userId'];
  const accessToken = candidate['accessToken'];
  const refreshToken = candidate['refreshToken'];
  const expiresAt = candidate['accessTokenExpiresAt'];

  if (
    typeof owner !== 'string' ||
    owner === '' ||
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof expiresAt !== 'number'
  ) {
    return undefined;
  }

  return {
    userId: userId(owner),
    accessToken,
    refreshToken,
    accessTokenExpiresAt: expiresAt,
  };
}

/** Thrown when the platform cannot offer a store at all. */
export function unavailable(reason: string): RunTrackError {
  return new RunTrackError({
    code: 'UNKNOWN',
    message: `Stockage sécurisé indisponible : ${reason}`,
  });
}
