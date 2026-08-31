import { isKnownErrorCode, type ErrorCode } from './errorCode';

/**
 * What every port rejects with. It carries the server's `code`, never its HTTP
 * status: the status is transport, the code is the contract.
 *
 * `correlationId` is here because it is what the user quotes when reporting a
 * problem — the client generates it, the server echoes it back, and `ErrorState`
 * shows it.
 */
export class RunTrackError extends Error {
  readonly code: ErrorCode | 'UNKNOWN';
  readonly correlationId: string | undefined;
  /** Kept for logs and for the rare screen that genuinely needs it. */
  readonly status: number | undefined;

  constructor(options: {
    code: string;
    message: string;
    correlationId?: string | undefined;
    status?: number | undefined;
  }) {
    super(options.message);
    this.name = 'RunTrackError';
    // An unrecognised code is not swallowed: it becomes `UNKNOWN`, which the
    // shells render as "unexpected" rather than mistaking it for a known case.
    this.code = isKnownErrorCode(options.code) ? options.code : 'UNKNOWN';
    this.correlationId = options.correlationId;
    this.status = options.status;
  }
}

/** Narrowing helper, so a `catch (error: unknown)` stays honest. */
export function isRunTrackError(error: unknown): error is RunTrackError {
  return error instanceof RunTrackError;
}

/** True when the error means the session is gone and re-login is the only way out. */
export function endsSession(error: RunTrackError): boolean {
  return (
    error.code === 'REFRESH_TOKEN_REUSED' ||
    error.code === 'REFRESH_TOKEN_REVOKED' ||
    error.code === 'REFRESH_TOKEN_EXPIRED' ||
    error.code === 'REFRESH_TOKEN_UNKNOWN' ||
    error.code === 'ACCOUNT_DELETED'
  );
}
