import type { TranslationKey } from '../i18n';

/**
 * The client's copy of the server's constraints — handle 3 to 30 characters,
 * password at least twelve, an address that looks like one.
 *
 * It is a copy, and that is deliberate: the server validates too, and it is the
 * one that decides. What this buys is the message arriving **before** the round
 * trip, which for a password rule is the difference between a form that helps
 * and a form that punishes.
 *
 * Each function returns a translation key, or `undefined` when the value is
 * acceptable. Never a boolean: a boolean forces the caller to invent the
 * sentence, and that is how two screens end up saying different things about
 * the same rule.
 */
const MINIMUM_PASSWORD_LENGTH = 12;
const MINIMUM_HANDLE_LENGTH = 3;
const MAXIMUM_HANDLE_LENGTH = 30;

/** Deliberately loose. The only real check is that the message arrives. */
const LOOKS_LIKE_AN_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Counts characters the way the person typing counts them: twelve emoji are
 * twelve characters, and `.length` would call them twenty-four.
 */
function characterCount(value: string): number {
  return Array.from(value).length;
}

export function validateEmail(value: string): TranslationKey | undefined {
  if (value.trim() === '') return 'auth.validation.emailRequired';
  if (!LOOKS_LIKE_AN_ADDRESS.test(value.trim())) return 'auth.validation.emailMalformed';
  return undefined;
}

/** For signing in: the server decides whether it is the right one. */
export function validatePasswordPresence(value: string): TranslationKey | undefined {
  return value === '' ? 'auth.validation.passwordRequired' : undefined;
}

/** For choosing one: the length rule is worth saying before sending. */
export function validateNewPassword(value: string): TranslationKey | undefined {
  if (value === '') return 'auth.validation.passwordRequired';
  if (characterCount(value) < MINIMUM_PASSWORD_LENGTH) return 'auth.validation.passwordTooShort';
  return undefined;
}

export function validateHandle(value: string): TranslationKey | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return 'auth.validation.handleRequired';
  if (characterCount(trimmed) < MINIMUM_HANDLE_LENGTH) return 'auth.validation.handleTooShort';
  if (characterCount(trimmed) > MAXIMUM_HANDLE_LENGTH) return 'auth.validation.handleTooLong';
  return undefined;
}

export function validateDisplayName(value: string): TranslationKey | undefined {
  return value.trim() === '' ? 'auth.validation.displayNameRequired' : undefined;
}

export function validateConfirmation(
  password: string,
  confirmation: string,
): TranslationKey | undefined {
  return password === confirmation ? undefined : 'auth.resetPassword.mismatch';
}
