import { fr, type TranslationKey } from './fr';

/**
 * Lookup and interpolation, and nothing else.
 *
 * A missing key returns the key itself rather than an empty string: an
 * untranslated label is visible in a screenshot, an empty one is not.
 */
export type TranslationValues = Record<string, string | number>;

export function translate(key: TranslationKey, values?: TranslationValues): string {
  const template: string = fr[key];
  if (values === undefined) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
