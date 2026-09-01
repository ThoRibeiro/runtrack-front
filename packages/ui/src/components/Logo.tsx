import { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme';
import { radius } from '../tokens';

/**
 * The mark: a route that climbs, and the position dot at its head.
 *
 * It was picked over three alternatives on one criterion — legibility at 20 px,
 * the size of a favicon and of a row icon, which is where a mark actually has
 * to work. A running-track oval and a monogram both read well large and turned
 * into a smudge small; four strokes and a filled dot do not.
 *
 * The path is deliberately coarse: 5.2 units of stroke on a 64 unit grid, round
 * caps, and the dot large enough to survive its own antialiasing.
 */
const TRACE = 'M13 44 L24 30 L32 36 L45 18';
const HEAD = { x: 45, y: 18, r: 6.6 } as const;
const GRID = 64;
const VIEW_BOX = `0 0 ${String(GRID)} ${String(GRID)}`;
/** The tile's corner, in grid units, so it scales with the mark rather than with the screen. */
const TILE_CORNER = 15;

export interface LogoProps {
  /** Rendered width and height, in points. */
  size?: number;
  /**
   * `mark` draws the trace alone, in `colour`; `tile` draws it in white on a
   * filled rounded square — the app icon, and the shape to use beside the
   * wordmark on a coloured header.
   */
  variant?: 'mark' | 'tile';
  /**
   * Overrides the drawn colour. Defaults to the theme's accent for `mark` and
   * to a white trace on the accent for `tile`.
   */
  colour?: string;
  /** The tile's fill. Defaults to the theme's accent. */
  tileColour?: string;
  /**
   * Leave unset when the word "RunTrack" is next to it — a logo that repeats
   * the name it sits beside is noise in a screen reader. Set it when the mark
   * stands alone.
   */
  label?: string;
  testID?: string;
}

export const Logo = memo(function Logo({
  size = 32,
  variant = 'mark',
  colour,
  tileColour,
  label,
  testID,
}: LogoProps) {
  const theme = useTheme();
  const tile = tileColour ?? theme.colours.brand.solid;
  const stroke =
    colour ?? (variant === 'tile' ? theme.colours.brand.onSolid : theme.colours.brand.fill);

  // `react-native-svg` déclare `testID?: string` sans `undefined` : sous
  // `exactOptionalPropertyTypes`, la prop se pose ou ne se pose pas.
  const identity = testID === undefined ? {} : { testID };

  const content = (
    <>
      {variant === 'tile' ? <Rect width={GRID} height={GRID} rx={TILE_CORNER} fill={tile} /> : null}
      <Path
        d={TRACE}
        stroke={stroke}
        strokeWidth={5.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={HEAD.x} cy={HEAD.y} r={HEAD.r} fill={stroke} />
    </>
  );

  // Deux retours plutôt qu'un jeu de props construit puis étalé : sous
  // `exactOptionalPropertyTypes`, l'union des deux jeux fait apparaître
  // `accessibilityLabel?: never` et le compilateur refuse l'étalement.
  if (label === undefined) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox={VIEW_BOX}
        accessibilityRole="none"
        aria-hidden
        {...identity}
      >
        {content}
      </Svg>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      accessibilityRole="image"
      accessibilityLabel={label}
      {...identity}
    >
      {content}
    </Svg>
  );
});

/** The tile's corner radius at a given size, for a container that has to match it. */
export function logoTileRadius(size: number): number {
  return Math.round((size * TILE_CORNER) / GRID) || radius.xs;
}
