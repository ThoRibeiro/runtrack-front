import { duration, easing, elevation, radius, space, spring, stroke, typography } from '../tokens';

/**
 * Semantic colours. A component reads *these* names, never the palette: it is
 * the only reason the same `Button` can be dropped into the light theme, the
 * dark theme and the running theme without a single conditional.
 *
 * Fills and text are two separate roles here even though one accent now serves
 * both: `brand.fill` is for fills, `brand.text` is for text, and nothing named
 * `blue500` is reachable from a screen. Keeping the roles apart is what lets
 * the dark theme substitute a lighter accent for text without touching a
 * single component.
 */
export interface ThemeColours {
  /** The page behind everything. */
  canvas: string;
  /** A card. */
  surface: string;
  /** Form rows, fields, grouped containers. */
  surfaceAlt: string;

  text: string;
  /** Units and secondary labels. Meets 4.5:1 — see `contrast.test.ts`. */
  textMuted: string;
  /** Text laid over a photo or a coloured fill. */
  textInverse: string;

  /** Decorative separation only. Carries no meaning, so it meets no ratio. */
  border: string;
  /** A field outline, a meaningful divider. Meets 3:1. */
  borderStrong: string;
  /**
   * Keyboard focus — the outer of two strokes.
   *
   * Two, because the accent is blue and a focused control sits on white on one
   * screen and on the accent card on the next: a single hue measured 1.10:1 on
   * the latter. Never a brand colour, or focus reads as a fill.
   */
  focusRing: string;
  /** The inner stroke. Whichever the ground, one of the two contrasts. */
  focusRingInner: string;
  /** Behind a modal. */
  scrim: string;
  /** A round translucent button over an image or a map. */
  glass: string;

  brand: {
    /** Ring, map trace, active tab shape, pastilles, sparkline. Non-text: 3:1. */
    fill: string;
    /** An icon sitting on `fill`. Non-text: 3:1. */
    onFill: string;
    /** A surface that carries a text label — the filled button. */
    solid: string;
    /** That label. Meets 4.5:1 against `solid`. */
    onSolid: string;
    /** The accent as TEXT, on the theme's backgrounds. Meets 4.5:1 on all three. */
    text: string;
    /** The tinted background of the highlight card. */
    surface: string;
    /** The unfilled part of a progress ring. */
    track: string;
    /** The far end of the authentication gradient. Nothing is written on it. */
    gradientEnd: string;
    /** The unfilled part of a ring drawn ON the accent fill. */
    onFillTrack: string;
  };

  accent: {
    heart: { fill: string; on: string };
    pace: { fill: string; on: string; line: string };
    climb: { fill: string; on: string };
    count: { fill: string; on: string };
  };

  info: { surface: string; text: string };
  danger: { surface: string; text: string; solid: string; onSolid: string };
  success: { surface: string; text: string };
  skeleton: { base: string; highlight: string };
}

export type ThemeName = 'light' | 'dark' | 'run';

export interface Theme {
  name: ThemeName;
  /** Drives the status bar, the keyboard appearance and the ripple colour. */
  isDark: boolean;
  colours: ThemeColours;
  space: typeof space;
  radius: typeof radius;
  stroke: typeof stroke;
  typography: typeof typography;
  duration: typeof duration;
  easing: typeof easing;
  spring: typeof spring;
  elevation: typeof elevation;
}

/** The scales are the same in all three themes; only the colours are redeclared. */
export const scales = {
  space,
  radius,
  stroke,
  typography,
  duration,
  easing,
  spring,
  elevation,
} as const;
