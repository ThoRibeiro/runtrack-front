import { RunTrackError, type Instant } from '@runtrack/core';

/**
 * The wire speaks ISO 8601; the hexagon speaks epoch milliseconds. The
 * conversion is here and nowhere else, so a screen never holds a date string it
 * might parse a second, slightly different way.
 */
export function toInstant(iso: string): Instant {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    throw new RunTrackError({
      code: 'UNKNOWN',
      message: `Horodatage illisible : ${iso}`,
    });
  }
  return parsed;
}

export function toOptionalInstant(iso: string | undefined): Instant | undefined {
  return iso === undefined ? undefined : toInstant(iso);
}

/** Trims the empty strings springdoc happily sends where it means "absent". */
export function toOptionalString(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value;
}

/**
 * Narrows a server string onto a closed union.
 *
 * The OpenAPI description types every enumeration as a bare `string`, so this
 * is the boundary where a value becomes a type. A value this build has never
 * heard of falls back rather than crashing a whole screen — except where the
 * fallback would be a lie, and there `narrowOrThrow` is used instead.
 */
export function narrow<T extends string>(
  value: string | undefined,
  catalogue: readonly T[],
  fallback: T,
): T {
  return catalogue.find((candidate) => candidate === value) ?? fallback;
}

export function narrowOrThrow<T extends string>(
  value: string | undefined,
  catalogue: readonly T[],
  what: string,
): T {
  const found = catalogue.find((candidate) => candidate === value);
  if (found === undefined) {
    throw new RunTrackError({
      code: 'UNKNOWN',
      message: `${what} inconnu du client : ${String(value)}`,
    });
  }
  return found;
}

/**
 * A field the response cannot be useful without.
 *
 * `?? ''` would be a lie: it looks like a default and then blows up in the
 * identifier constructor with a message that says nothing about which response
 * was malformed. An activity without an id, or a feed card without an author,
 * is a broken response — and saying so is more useful than rendering a card
 * that leads nowhere.
 */
export function required(value: string | undefined, field: string): string {
  if (value === undefined || value === '') {
    throw new RunTrackError({
      code: 'UNKNOWN',
      message: `Réponse incomplète : ${field} manquant`,
    });
  }
  return value;
}
