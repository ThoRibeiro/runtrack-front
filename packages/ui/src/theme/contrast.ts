import { LARGE_TEXT_MINIMUM_SIZE, LARGE_TEXT_MINIMUM_SIZE_BOLD, typography } from '../tokens';
import type { Theme } from './theme';

/**
 * WCAG 2.2 contrast, computed rather than assumed. §3 asks for exactly this:
 * "Vérifie les rapports au build, ne les suppose pas."
 */

const CHANNEL_THRESHOLD = 0.03928;
const CHANNEL_DIVISOR = 12.92;
const CHANNEL_OFFSET = 0.055;
const CHANNEL_SCALE = 1.055;
const CHANNEL_EXPONENT = 2.4;

const LUMINANCE_RED = 0.2126;
const LUMINANCE_GREEN = 0.7152;
const LUMINANCE_BLUE = 0.0722;

const CONTRAST_OFFSET = 0.05;

function linearise(component: number): number {
  const channel = component / 255;
  return channel <= CHANNEL_THRESHOLD
    ? channel / CHANNEL_DIVISOR
    : ((channel + CHANNEL_OFFSET) / CHANNEL_SCALE) ** CHANNEL_EXPONENT;
}

/** Accepts `#RGB` and `#RRGGBB`. A translucent colour has no fixed ratio, so it throws. */
export function relativeLuminance(colour: string): number {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(colour);
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);

  const parts = short
    ? [short[1], short[2], short[3]].map((c) => `${c ?? ''}${c ?? ''}`)
    : long
      ? [long[1] ?? '', long[2] ?? '', long[3] ?? '']
      : null;

  if (parts === null) {
    throw new TypeError(
      `${colour} n'est pas une couleur opaque : un rapport de contraste ne se calcule pas sur une transparence.`,
    );
  }

  const [red = 0, green = 0, blue = 0] = parts.map((part) => linearise(parseInt(part, 16)));
  return LUMINANCE_RED * red + LUMINANCE_GREEN * green + LUMINANCE_BLUE * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter = 0, darker = 0] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((a, b) => b - a);
  return (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET);
}

/**
 * What a pair has to meet, and why.
 *
 * - `text` — 4.5:1. Anything read as a sentence, a number or a label.
 * - `largeText` — 3:1. At or above 24 px, or 18.66 px bold.
 * - `nonText` — 3:1. A field outline, a meaningful icon, the map trace.
 *
 * A decorative separator is in none of these categories, which is why
 * `colours.border` appears nowhere below: it carries nothing.
 */
export type ContrastRequirement = 'text' | 'largeText' | 'nonText';

export const MINIMUM_RATIO: Record<ContrastRequirement, number> = {
  text: 4.5,
  largeText: 3,
  nonText: 3,
};

export interface ContrastPair {
  label: string;
  foreground: string;
  background: string;
  requirement: ContrastRequirement;
}

/** Whether a typography token qualifies as WCAG "large text". */
export function isLargeText(token: keyof typeof typography): boolean {
  const { size, family } = typography[token];
  const isBold = family.endsWith('Bold') || family.endsWith('SemiBold');
  return size >= LARGE_TEXT_MINIMUM_SIZE || (isBold && size >= LARGE_TEXT_MINIMUM_SIZE_BOLD);
}

/**
 * Every pair the design actually puts on screen. Adding a colour role without
 * adding it here is how a theme rots: the list is the specification, and the
 * test is what makes the list true.
 */
export function contrastPairs(theme: Theme, backgrounds: readonly string[]): ContrastPair[] {
  const c = theme.colours;
  const onEachBackground = (
    label: string,
    foreground: string,
    requirement: ContrastRequirement,
  ): ContrastPair[] =>
    backgrounds.map((background) => ({
      label: `${label} sur ${background}`,
      foreground,
      background,
      requirement,
    }));

  return [
    ...onEachBackground('texte principal', c.text, 'text'),
    ...onEachBackground('texte secondaire (unités, libellés)', c.textMuted, 'text'),
    ...onEachBackground('texte orange', c.brand.text, 'text'),
    ...onEachBackground('texte de danger', c.danger.text, 'text'),
    ...onEachBackground('texte de succès', c.success.text, 'text'),
    ...onEachBackground(
      'remplissage de marque (anneau, tracé, onglet actif)',
      c.brand.fill,
      'nonText',
    ),
    ...onEachBackground('bordure de champ', c.borderStrong, 'nonText'),
    ...onEachBackground('anneau de focus', c.focusRing, 'nonText'),
    ...onEachBackground('courbe d’allure', c.accent.pace.line, 'nonText'),

    {
      label: 'libellé du bouton plein',
      foreground: c.brand.onSolid,
      background: c.brand.solid,
      requirement: 'text',
    },
    {
      label: 'icône sur remplissage de marque',
      foreground: c.brand.onFill,
      background: c.brand.fill,
      requirement: 'nonText',
    },
    {
      label: 'texte orange sur la carte teintée',
      foreground: c.brand.text,
      background: c.brand.surface,
      requirement: 'text',
    },
    {
      label: 'texte principal sur la carte teintée',
      foreground: c.text,
      background: c.brand.surface,
      requirement: 'text',
    },
    {
      label: 'texte de la puce d’information',
      foreground: c.info.text,
      background: c.info.surface,
      requirement: 'text',
    },
    {
      label: 'texte de danger sur son fond',
      foreground: c.danger.text,
      background: c.danger.surface,
      requirement: 'text',
    },
    {
      label: 'libellé du bouton de danger',
      foreground: c.danger.onSolid,
      background: c.danger.solid,
      requirement: 'text',
    },
    {
      label: 'texte de succès sur son fond',
      foreground: c.success.text,
      background: c.success.surface,
      requirement: 'text',
    },
    {
      label: 'icône de la pastille fréquence cardiaque',
      foreground: c.accent.heart.on,
      background: c.accent.heart.fill,
      requirement: 'nonText',
    },
    {
      label: 'icône de la pastille allure',
      foreground: c.accent.pace.on,
      background: c.accent.pace.fill,
      requirement: 'nonText',
    },
    {
      label: 'icône de la pastille dénivelé',
      foreground: c.accent.climb.on,
      background: c.accent.climb.fill,
      requirement: 'nonText',
    },
  ];
}
