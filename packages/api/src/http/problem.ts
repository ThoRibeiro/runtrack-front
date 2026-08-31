import { RunTrackError } from '@runtrack/core';

/**
 * RFC 9457 `application/problem+json`, which is how **every** error comes back.
 *
 * The whole point of this file is the field the API description insists on:
 * `code`. It is the business contract; the status is transport. Three distinct
 * causes return 409, and a status can change without the code moving — so
 * nothing downstream is ever handed a status to branch on.
 */
export interface ProblemDocument {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  correlationId?: string;
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === 'number' ? value : undefined;
}

export function isProblemDocument(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

/**
 * Turns a response body into a typed error.
 *
 * A body that is not a problem document still produces a `RunTrackError`, with
 * the code `UNKNOWN` — never a raw `Error`, so that no caller has to handle two
 * shapes and end up with the empty `catch` §15 forbids.
 */
export function toRunTrackError(
  body: unknown,
  fallback: { status: number; correlationId: string | undefined },
): RunTrackError {
  if (!isProblemDocument(body)) {
    return new RunTrackError({
      code: 'UNKNOWN',
      message: `Réponse ${String(fallback.status)} illisible`,
      correlationId: fallback.correlationId,
      status: fallback.status,
    });
  }

  const detail = readString(body, 'detail');
  const title = readString(body, 'title');

  return new RunTrackError({
    code: readString(body, 'code') ?? 'UNKNOWN',
    message: detail ?? title ?? `Réponse ${String(fallback.status)}`,
    // The server echoes the id the client sent; its own copy wins if it differs.
    correlationId: readString(body, 'correlationId') ?? fallback.correlationId,
    status: readNumber(body, 'status') ?? fallback.status,
  });
}
