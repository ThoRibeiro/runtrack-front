import { isRunTrackError, type RunTrackError } from '@runtrack/core';

/**
 * Narrows a caught value to a `RunTrackError`, or fails the test saying what it
 * actually was. It exists so no test has to write `as RunTrackError` and hide
 * the case where the failure was something else entirely.
 */
export function asRunTrackError(value: unknown): RunTrackError {
  if (!isRunTrackError(value)) {
    throw new Error(`Erreur RunTrack attendue, reçu : ${String(value)}`);
  }
  return value;
}

/** Reads a recorded request body as an object, without pretending to know its shape. */
export function bodyOf(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) {
    throw new Error(`Corps de requête attendu, reçu : ${String(body)}`);
  }
  return { ...body };
}
