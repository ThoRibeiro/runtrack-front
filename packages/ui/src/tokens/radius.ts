/**
 * Large radii carry the separation between surfaces in this design — that is
 * why `elevation` is almost nothing. See `elevation.ts`.
 */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  sheet: 28,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;

/** Stroke widths. A border is a token too, otherwise `borderWidth: 1` spreads. */
export const stroke = {
  hairline: 1,
  thick: 2,
  ring: 10, // the progress ring of the highlight card
} as const;

export type StrokeToken = keyof typeof stroke;
