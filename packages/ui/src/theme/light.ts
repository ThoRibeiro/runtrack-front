import { Platform } from 'react-native';
import { palette } from '../tokens';
import { scales, type Theme } from './theme';

/**
 * The light theme, and the direction the whole interface follows.
 *
 * White, one accent, and structure carried by hairlines rather than by fills.
 * That is the difference from what came before: the reference put a coloured
 * disc behind every metric and a tinted card behind every highlight, and the
 * result was busy. Here the page is white, the type is `slate800`, and
 * `teal500` appears where something is *actionable* or *current* — nowhere
 * else.
 *
 * The canvas is a hair off white on the web, where the page is wider and a pure
 * white full bleed is harsh; both values are checked by the contrast test.
 */
export const LIGHT_CANVAS = {
  native: palette.white,
  web: palette.canvasWeb,
} as const;

export const lightTheme: Theme = {
  name: 'light',
  isDark: false,
  colours: {
    canvas: Platform.OS === 'web' ? LIGHT_CANVAS.web : LIGHT_CANVAS.native,
    surface: palette.white,
    surfaceAlt: palette.slate50,

    text: palette.slate800,
    textMuted: palette.slate600,
    textInverse: palette.white,

    border: palette.slate100,
    borderStrong: palette.slate500,
    focusRing: palette.focus,
    scrim: palette.scrim,
    glass: palette.glassLight,

    brand: {
      // One accent for both jobs — 4.90:1 on white is what makes that possible.
      fill: palette.teal500,
      onFill: palette.white,
      solid: palette.teal500,
      onSolid: palette.white,
      text: palette.teal600,
      surface: palette.teal50,
      track: palette.slate100,
    },

    /**
     * Monochrome on purpose.
     *
     * A yellow heart, a mint pace and a violet climb read as three unrelated
     * products on one screen. §15 already forbids information carried by colour
     * alone — every metric has an icon and a label — so the colour was never
     * doing the work, only the noise. The disc is now the alternate surface and
     * the icon carries the accent.
     */
    accent: {
      heart: { fill: palette.slate50, on: palette.slate600 },
      pace: { fill: palette.slate50, on: palette.slate600, line: palette.teal500 },
      climb: { fill: palette.slate50, on: palette.slate600 },
    },

    info: { surface: palette.infoSurface, text: palette.infoText },
    danger: {
      surface: palette.dangerSurface,
      text: palette.danger,
      solid: palette.danger,
      onSolid: palette.white,
    },
    success: { surface: palette.slate50, text: palette.success },
    skeleton: { base: palette.skeletonLight, highlight: palette.skeletonLightHighlight },
  },
  ...scales,
};
