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
  hero: { size: 52, lineHeight: 56, family: fontFamily.bold, letterSpacing: -1.4 },
  display: { size: 44, lineHeight: 46, family: fontFamily.bold, letterSpacing: -1.1 },
  metric: { size: 30, lineHeight: 34, family: fontFamily.semibold, letterSpacing: -0.7 },
  title: { size: 22, lineHeight: 28, family: fontFamily.semibold, letterSpacing: -0.4 },
  section: { size: 16, lineHeight: 22, family: fontFamily.semibold, letterSpacing: -0.1 },
  body: { size: 15, lineHeight: 23, family: fontFamily.regular, letterSpacing: 0 },
  bodyStrong: { size: 15, lineHeight: 23, family: fontFamily.semibold, letterSpacing: 0 },
  caption: { size: 13, lineHeight: 18, family: fontFamily.regular, letterSpacing: 0 },
  overline: { size: 11, lineHeight: 16, family: fontFamily.semibold, letterSpacing: 1.2 },
} as const;

export type TypographyToken = keyof typeof typography;

/**
 * WCAG's "large text" threshold: at or above it, 3:1 is enough instead of
 * 4.5:1. `contrast.test.ts` uses it to know which rule to apply to a pair.
 */
export const LARGE_TEXT_MINIMUM_SIZE = 24;
export const LARGE_TEXT_MINIMUM_SIZE_BOLD = 18.66;
