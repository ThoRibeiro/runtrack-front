import { isRunTrackError, type ErrorCode } from '@runtrack/core';
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
  detail: string;
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

  return {
    title: translate(keyFor(error.code)),
    detail: error.message,
    correlationId: error.correlationId,
  };
}
