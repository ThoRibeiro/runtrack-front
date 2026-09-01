/**
 * Radii, generous.
 *
 * The references this design follows are round: cards at 20, sheets at 28,
 * fields and buttons at 12 to 16. Roundness is what makes an interface read as
 * approachable rather than as an instrument panel — and the brief that matters
 * here asks for "facile d'utilisation, agréable à utiliser", not austere.
 *
 * `full` is kept for what is genuinely a pill: chips, avatars, the progress
 * ring. A primary button is **not** a pill in these references — it is a
 * rounded rectangle, which reads as sturdier.
 */
export const radius = {
  xs: 8,
  sm: 12,
  /** Fields and primary buttons. */
  md: 14,
  lg: 18,
  /** Cards. */
  xl: 20,
  sheet: 28,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;

/** Stroke widths. A border is a token too, otherwise `borderWidth: 1` spreads. */
export const stroke = {
  hairline: 1,
  thick: 2,
  /** The progress ring of the highlight card. */
  ring: 8,
} as const;

export type StrokeToken = keyof typeof stroke;
