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

export const typography = {
  display: { size: 40, lineHeight: 44, family: fontFamily.bold, letterSpacing: -0.5 },
  metric: { size: 28, lineHeight: 32, family: fontFamily.bold, letterSpacing: -0.3 },
  title: { size: 22, lineHeight: 28, family: fontFamily.semibold, letterSpacing: -0.2 },
  section: { size: 17, lineHeight: 24, family: fontFamily.semibold, letterSpacing: 0 },
  body: { size: 15, lineHeight: 22, family: fontFamily.regular, letterSpacing: 0 },
  bodyStrong: { size: 15, lineHeight: 22, family: fontFamily.semibold, letterSpacing: 0 },
  caption: { size: 13, lineHeight: 18, family: fontFamily.regular, letterSpacing: 0 },
} as const;

export type TypographyToken = keyof typeof typography;

/**
 * WCAG's "large text" threshold: at or above it, 3:1 is enough instead of
 * 4.5:1. `contrast.test.ts` uses it to know which rule to apply to a pair.
 */
export const LARGE_TEXT_MINIMUM_SIZE = 24;
export const LARGE_TEXT_MINIMUM_SIZE_BOLD = 18.66;
