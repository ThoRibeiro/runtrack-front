/**
 * Plus Jakarta Sans, a geometric grotesque close to the reference's face and
 * freely usable. The family is loaded by the shells; the fallback stack matters
 * because a missing font must not change the layout.
 *
 * `lineHeight` is expressed in points at the base text size. It is NOT a fixed
 * height: §5 requires every layout to survive 200 % text, so no container built
 * on these tokens may pin its own height.
 */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

/**
 * The scale, with more contrast between its ends than the reference had.
 *
 * Two deliberate moves:
 *
 *  - **the big numbers get tighter and larger.** A distance is the one thing on
 *    the screen worth looking at from across a table, and negative tracking at
 *    that size is what stops it reading as a heading;
 *  - **`hero` and `overline` are new.** `hero` is for a screen that has one
 *    thing to say — the welcome page. `overline` is small, spaced and upper
 *    case: it labels a value without competing with it, and it is the single
 *    most recognisable mark of this kind of interface. It is never used for a
 *    sentence — spaced capitals are slower to read, which is fine for one word
 *    and hostile for a paragraph.
 */
export const typography = {
  /** One screen has one thing to say: the welcome page. */
  hero: { size: 34, lineHeight: 40, family: fontFamily.bold, letterSpacing: -0.6 },
  /** The number on the recording screen, read at arm's length. */
  display: { size: 40, lineHeight: 44, family: fontFamily.bold, letterSpacing: -0.8 },
  /** The big numbers of a metric card. */
  metric: { size: 26, lineHeight: 30, family: fontFamily.bold, letterSpacing: -0.4 },
  title: { size: 24, lineHeight: 30, family: fontFamily.bold, letterSpacing: -0.4 },
  section: { size: 17, lineHeight: 24, family: fontFamily.semibold, letterSpacing: -0.1 },
  body: { size: 15, lineHeight: 22, family: fontFamily.regular, letterSpacing: 0 },
  bodyStrong: { size: 15, lineHeight: 22, family: fontFamily.semibold, letterSpacing: 0 },
  caption: { size: 13, lineHeight: 18, family: fontFamily.regular, letterSpacing: 0 },
  /**
   * A quiet label above a value.
   *
   * No longer upper-cased: the references label their values in ordinary
   * sentence case, and spaced capitals everywhere is the mark of the austere
   * direction this design moved away from.
   */
  overline: { size: 13, lineHeight: 18, family: fontFamily.medium, letterSpacing: 0 },
} as const;

export type TypographyToken = keyof typeof typography;

/**
 * WCAG's "large text" threshold: at or above it, 3:1 is enough instead of
 * 4.5:1. `contrast.test.ts` uses it to know which rule to apply to a pair.
 */
export const LARGE_TEXT_MINIMUM_SIZE = 24;
export const LARGE_TEXT_MINIMUM_SIZE_BOLD = 18.66;
