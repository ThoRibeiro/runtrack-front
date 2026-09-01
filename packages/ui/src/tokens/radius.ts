/**
 * Radii, contained.
 *
 * The reference this design started from used very large radii — 24 on a card,
 * 28 on a sheet — which reads as playful. The direction asked for is the
 * opposite: an instrument, not a toy. So the scale is tightened, and the
 * separation between surfaces is carried by a hairline and by the ground
 * colour instead (see `elevation.ts`, which is almost nothing on purpose).
 *
 * `full` stays: a pill is a shape, not a radius, and it is what marks the
 * things you press.
 */
export const radius = {
  /** Fields. Deliberately squarer than a button: shape tells them apart. */
  xs: 6,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  sheet: 20,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;

/** Stroke widths. A border is a token too, otherwise `borderWidth: 1` spreads. */
export const stroke = {
  hairline: 1,
  thick: 2,
  /** The progress ring. Thinner than the reference's: a thick ring is a gauge. */
  ring: 6,
} as const;

export type StrokeToken = keyof typeof stroke;
