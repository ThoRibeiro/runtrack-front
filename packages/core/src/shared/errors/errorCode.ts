/**
 * The business error catalogue, copied from the server's own `code` values.
 *
 * §15 forbids a `catch` that shows "une erreur est survenue" without looking at
 * the `code`, and the API description says why: three distinct causes return
 * 409, and a status can change without the code moving. So the code is the
 * contract, and it lives in the hexagon — a screen decides what to say from
 * *this* union, never from an HTTP status.
 */
export const ERROR_CODES = [
  // Authentification et session
  'AUTHENTICATION_REQUIRED',
  'BAD_CREDENTIALS',
  'CREDENTIALS_NOT_FOUND',
  'ACCOUNT_NOT_ACTIVE',
  'ACCOUNT_DELETED',
  'EMAIL_TAKEN',
  'EMAIL_ALREADY_VERIFIED',
  'HANDLE_TAKEN',
  'TOO_MANY_ATTEMPTS',
  'TOKEN_EXPIRED',
  'TOKEN_UNKNOWN',
  'TOKEN_ALREADY_USED',
  'TOKEN_WRONG_PURPOSE',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_REUSED',
  'REFRESH_TOKEN_REVOKED',
  'REFRESH_TOKEN_UNKNOWN',

  // Courses
  'ACTIVITY_NOT_FOUND',
  'ACTIVITY_NOT_YOURS',
  'ACTIVITY_NOT_VISIBLE',
  'ACTIVITY_NOT_LIVE',
  'ACTIVITY_NOT_PAUSED',
  'ACTIVITY_ALREADY_ENDED',
  'ACTIVITY_NOT_ACCEPTING_POINTS',
  'DEVICE_CLOCK_TOO_FAR_OFF',
  'IDEMPOTENCY_KEY_REUSED',
  'INGESTION_CONFLICT',
  'TOO_MANY_BATCHES',
  'TRACK_NOT_ARCHIVED',

  // Social et engagement
  'USER_NOT_FOUND',
  'BLOCKED',
  'SELF_BLOCK',
  'SELF_FOLLOW',
  'FOLLOW_ALREADY_ACCEPTED',
  'FOLLOW_REQUEST_NOT_FOUND',
  'NOT_YOUR_REQUEST',
  'COMMENT_NOT_FOUND',
  'COMMENT_DELETED',
  'COMMENT_EDIT_WINDOW_CLOSED',
  'COMMENT_NESTING_TOO_DEEP',
  'TOO_MANY_COMMENTS',

  // Notifications et partage
  'NOTIFICATION_NOT_FOUND',
  'DEVICE_NOT_FOUND',
  'UNREGISTERED',
  'SHARE_LINK_NOT_FOUND',

  // Génériques
  'INVALID_REQUEST',
  'INVALID_ARGUMENT',
  'INVALID_VALUE',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const KNOWN = new Set<string>(ERROR_CODES);

export function isKnownErrorCode(value: string): value is ErrorCode {
  return KNOWN.has(value);
}
