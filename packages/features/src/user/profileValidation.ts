import type { TranslationKey } from '../i18n';

/**
 * The client's copy of what `ProfileDtos` accepts — bio at 500 characters,
 * weight between 20 and 400 kg, height between 50 and 280 cm, and a birth date
 * as a plain calendar day.
 *
 * A copy, like `auth/validation`: the server decides, this only makes the
 * message arrive before the round trip. Each function answers with a
 * translation key or `undefined`, never a boolean — a boolean would leave each
 * screen to invent its own sentence for the same rule.
 */
const MAXIMUM_BIO_LENGTH = 500;
const MINIMUM_WEIGHT_KG = 20;
const MAXIMUM_WEIGHT_KG = 400;
const MINIMUM_HEIGHT_CM = 50;
const MAXIMUM_HEIGHT_CM = 280;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function characterCount(value: string): number {
  return Array.from(value).length;
}

export function validateBio(value: string): TranslationKey | undefined {
  return characterCount(value) > MAXIMUM_BIO_LENGTH ? 'profile.validation.bioTooLong' : undefined;
}

/**
 * An empty field is not an error: physiology is optional, and clearing a weight
 * is a legitimate thing to want to do.
 */
export function validateWeight(value: string): TranslationKey | undefined {
  if (value.trim() === '') return undefined;
  const weight = Number(value.replace(',', '.'));
  if (!Number.isFinite(weight)) return 'profile.validation.weightRange';
  return weight < MINIMUM_WEIGHT_KG || weight > MAXIMUM_WEIGHT_KG
    ? 'profile.validation.weightRange'
    : undefined;
}

export function validateHeight(value: string): TranslationKey | undefined {
  if (value.trim() === '') return undefined;
  const height = Number(value.replace(',', '.'));
  if (!Number.isFinite(height)) return 'profile.validation.heightRange';
  return height < MINIMUM_HEIGHT_CM || height > MAXIMUM_HEIGHT_CM
    ? 'profile.validation.heightRange'
    : undefined;
}

/**
 * The shape, and that the day exists: `2026-02-31` parses in some engines and
 * is refused by the server, which is a round trip spent on a typo.
 */
export function validateBirthDate(value: string): TranslationKey | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  if (!ISO_DAY.test(trimmed)) return 'profile.validation.birthDateMalformed';

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 'profile.validation.birthDateMalformed';
  return parsed.toISOString().startsWith(trimmed)
    ? undefined
    : 'profile.validation.birthDateMalformed';
}

/** A field left empty means "no value", not zero. */
export function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}
