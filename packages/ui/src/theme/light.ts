import { Platform } from 'react-native';
import { palette } from '../tokens';
import { scales, type Theme } from './theme';

/**
 * §3: the canvas is white on mobile and #FAF7F6 on web, where the page is
 * wider and a pure white full-bleed background is harsh. Both values are
 * checked by the contrast test, whichever platform the suite runs on.
 */
export const LIGHT_CANVAS = {
  native: palette.neutral0,
  web: palette.neutral25,
} as const;

export const lightTheme: Theme = {
  name: 'light',
  isDark: false,
  colours: {
    canvas: Platform.OS === 'web' ? LIGHT_CANVAS.web : LIGHT_CANVAS.native,
    surface: palette.neutral0,
    surfaceAlt: palette.neutral50,

    text: palette.neutral900,
    textMuted: palette.neutral600,
    textInverse: palette.white,

    border: palette.neutral100,
    borderStrong: palette.neutral500,
    focusRing: palette.focus,
    scrim: palette.scrim,
    glass: palette.glassLight,

    brand: {
      fill: palette.brand500,
      onFill: palette.white,
      solid: palette.brand600,
      onSolid: palette.white,
      text: palette.brand700,
      surface: palette.brand50,
      track: palette.neutral100,
    },

    accent: {
      heart: { fill: palette.heart, on: palette.neutral900 },
      pace: { fill: palette.pace, on: palette.neutral900, line: palette.paceLine },
      climb: { fill: palette.climb, on: palette.white },
    },

    info: { surface: palette.infoSurface, text: palette.infoText },
    danger: {
      surface: palette.dangerSurface,
      text: palette.danger,
      solid: palette.danger,
      onSolid: palette.white,
    },
    success: { surface: palette.neutral50, text: palette.success },
    skeleton: { base: palette.skeletonLight, highlight: palette.skeletonLightHighlight },
  },
  ...scales,
};
