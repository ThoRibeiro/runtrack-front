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
      gradientEnd: palette.teal400,
      onFillTrack: palette.onAccentTrack,
    },

    /**
     * One pale disc per metric, with a dark icon on it.
     *
     * The colour is a landmark, never the message: §15 forbids information
     * carried by colour alone, and every metric card also states its name in
     * words. Each pair is measured — see `contrast.test.ts`.
     */
    accent: {
      heart: { fill: palette.heartSurface, on: palette.heartIcon },
      pace: { fill: palette.teal50, on: palette.teal600, line: palette.teal500 },
      climb: { fill: palette.climbSurface, on: palette.climbIcon },
      count: { fill: palette.countSurface, on: palette.countIcon },
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
