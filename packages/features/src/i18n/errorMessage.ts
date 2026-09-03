import { isRunTrackError, type ErrorCode, type RunTrackError } from '@runtrack/core';
import { translate } from './translate';
import type { TranslationKey } from './fr';

/**
 * §15: no `catch` that shows "une erreur est survenue" without looking at the
 * `code`. This is the function that makes that rule cheap to follow — and the
 * test beside it asserts that **every** code in the catalogue has a sentence,
 * so a new server code cannot silently land in the generic bucket.
 */
export interface DisplayableError {
  title: string;
  /**
   * Only where the title cannot say it all — a failure the user can do nothing
   * about. A known code already has its sentence, and the server's `detail`
   * would just repeat it in slightly different words.
   */
  detail: string | undefined;
  correlationId: string | undefined;
}

/**
 * Every business code has its own key, and the compiler proves it: the return
 * type is `error.${ErrorCode}`, which only assigns to `TranslationKey` if the
 * dictionary carries all fifty-one of them. Adding a code to the catalogue
 * without a sentence stops the build here, before any test runs.
 */
function keyFor(code: ErrorCode): TranslationKey {
  return `error.${code}`;
}

const SERVER_FAILURE = 500;

/**
 * The correlation id is a support handle, not something to put in front of
 * someone who mistyped their password: on an error they can act on it explains
 * nothing and reads as a leak. It survives only where nothing else can be said
 * — an unrecognised code, or a server that failed on its own.
 */
function referenceOf(error: RunTrackError): string | undefined {
  const serverFailed = error.status !== undefined && error.status >= SERVER_FAILURE;
  return error.code === 'UNKNOWN' || serverFailed ? error.correlationId : undefined;
}

export function describeError(error: unknown): DisplayableError {
  if (!isRunTrackError(error)) {
    // Not a server answer at all: a socket that never opened, a DNS failure.
    // Saying "no network" is more useful than saying nothing.
    return {
      title: translate('error.network'),
      detail: translate('error.networkDetail'),
      correlationId: undefined,
    };
  }

  if (error.code === 'UNKNOWN') {
    return {
      title: translate('error.unknown'),
      detail: translate('error.unknownDetail'),
      correlationId: error.correlationId,
    };
  }

  // The sentence belongs to the client: the server's `detail` is written for a
  // log, and showing both put the same thing on screen twice.
  return {
    title: translate(keyFor(error.code)),
    detail: undefined,
    correlationId: referenceOf(error),
  };
}
