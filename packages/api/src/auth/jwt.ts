import { RunTrackError, userId, type UserId } from '@runtrack/core';

/**
 * Reads the `sub` claim of an access token.
 *
 * `POST /auth/v1/login` answers with a `SessionResponse` — two tokens and a
 * lifetime — and **no user id**. The domain's `Session` needs one, and the
 * alternatives were worse: a second round trip on every login, or carrying an
 * id-less session that every screen then has to special-case.
 *
 * This **reads** a token, it does not verify one. The signature is the server's
 * business and checking it here would need a key the client must never hold.
 * Nothing is trusted from this beyond "which account is this session for",
 * which the server re-derives from the same token on every request anyway.
 *
 * Base64url is decoded by hand rather than through `atob`: Hermes has not
 * always shipped it, and the alphabet differs by two characters.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function decodeBase64Url(encoded: string): string {
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];

  for (const character of encoded) {
    if (character === '=') break;
    const value = ALPHABET.indexOf(character);
    if (value === -1) {
      throw new RunTrackError({ code: 'UNKNOWN', message: 'Jeton illisible' });
    }
    accumulator = (accumulator << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >> bits) & 0xff);
    }
  }

  // The payload is UTF-8; decoding it byte by byte would mangle any accent.
  let text = '';
  let index = 0;
  while (index < bytes.length) {
    const byte = bytes[index] ?? 0;
    if (byte < 0x80) {
      text += String.fromCodePoint(byte);
      index += 1;
    } else if (byte < 0xe0) {
      text += String.fromCodePoint(((byte & 0x1f) << 6) | ((bytes[index + 1] ?? 0) & 0x3f));
      index += 2;
    } else if (byte < 0xf0) {
      text += String.fromCodePoint(
        ((byte & 0x0f) << 12) |
          (((bytes[index + 1] ?? 0) & 0x3f) << 6) |
          ((bytes[index + 2] ?? 0) & 0x3f),
      );
      index += 3;
    } else {
      text += String.fromCodePoint(
        ((byte & 0x07) << 18) |
          (((bytes[index + 1] ?? 0) & 0x3f) << 12) |
          (((bytes[index + 2] ?? 0) & 0x3f) << 6) |
          ((bytes[index + 3] ?? 0) & 0x3f),
      );
      index += 4;
    }
  }
  return text;
}

export function subjectOf(accessToken: string): UserId {
  const payload = accessToken.split('.')[1];
  if (payload === undefined) {
    throw new RunTrackError({ code: 'UNKNOWN', message: 'Jeton d’accès mal formé' });
  }

  let claims: unknown;
  try {
    claims = JSON.parse(decodeBase64Url(payload));
  } catch {
    throw new RunTrackError({ code: 'UNKNOWN', message: 'Charge utile du jeton illisible' });
  }

  if (
    typeof claims !== 'object' ||
    claims === null ||
    !('sub' in claims) ||
    typeof claims.sub !== 'string'
  ) {
    throw new RunTrackError({ code: 'UNKNOWN', message: 'Jeton d’accès sans sujet' });
  }

  return userId(claims.sub);
}
