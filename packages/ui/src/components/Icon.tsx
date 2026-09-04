import type { ReactNode } from 'react';
import Svg, { Path } from 'react-native-svg';
import { stroke } from '../tokens';

/**
 * The icon set, drawn here rather than pulled from a font.
 *
 * Two reasons. An icon font ships every glyph in the bundle whether or not it
 * is used, and §14 puts the initial web bundle on a diet. And a stroke drawn on
 * the same 24 × 24 grid, with the same weight and the same round caps, is what
 * makes a set look like one set — which the reference's does.
 *
 * An icon is decorative by default: it is `Text` next to it, or the
 * `accessibilityLabel` of the button around it, that says what it means. §5:
 * an icon-only button without a label announces "button", and the screen
 * becomes a guessing game.
 */
const ICONS = {
  'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-right': ['M9 18l6-6-6-6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  edit: ['M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z'],
  send: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'],
  // Deux roues et un cadre : dessiné ici plutôt qu'emprunté, comme le reste du
  // jeu — même grille de 24, même graisse de trait.
  bike: [
    'M5.5 17.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0',
    'M18.5 17.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0',
    'M6 17.5L12 6',
    'M12 6h4l2.5 11.5',
    'M9 9h6',
  ],
  walk: [
    'M13 4.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
    'M12 21l1-6-2-4 1-3 2 2 2 1',
    'M13 15l3 6',
  ],
  check: ['M20 6L9 17l-5-5'],
  plus: ['M12 5v14', 'M5 12h14'],
  'more-horizontal': ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'],
  heart: [
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
  ],
  'message-circle': [
    'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-4-1L3 21l1.1-5a8.4 8.4 0 0 1-1-4 8.4 8.4 0 0 1 8.4-8.9h.5a8.4 8.4 0 0 1 8 8v.4z',
  ],
  share: ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v14'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  'trending-up': ['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6'],
  mountain: ['M3 20l6.5-11 4 6 2.5-4 5 9z'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20', 'M12 6v6l4 2'],
  'map-pin': [
    'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z',
    'M12 7a3 3 0 1 0 0 6 3 3 0 1 0 0-6',
  ],
  play: ['M6 4l14 8-14 8z'],
  pause: ['M9 4v16', 'M15 4v16'],
  stop: ['M6 6h12v12H6z'],
  'alert-circle': ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20', 'M12 8v5', 'M12 16h.01'],
  info: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20', 'M12 16v-5', 'M12 8h.01'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 1 0 0-14', 'M20 20l-4.2-4.2'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8'],
  users: [
    'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9.5 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8',
    'M22 21v-2a4 4 0 0 0-3-3.9',
    'M16 3.1a4 4 0 0 1 0 7.8',
  ],
  home: ['M3 10.5L12 3l9 7.5', 'M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5'],
  sliders: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M1 14h6',
    'M9 8h6',
    'M17 16h6',
  ],
  'wifi-off': [
    'M1 1l22 22',
    'M5 12.5a11 11 0 0 1 4-2.6',
    'M8.5 16.1a6 6 0 0 1 3-1.5',
    'M19.9 12.5a11 11 0 0 0-6.5-3.4',
    'M12 20h.01',
  ],
  eye: ['M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z', 'M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6'],
  'eye-off': [
    'M1 1l22 22',
    'M9.9 5.2A10.6 10.6 0 0 1 12 5c7 0 11 7 11 7a17 17 0 0 1-3.2 4.1',
    'M6.6 6.7A17 17 0 0 0 1 12s4 7 11 7c2 0 3.7-.5 5.2-1.3',
  ],
  calendar: [
    'M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
    'M16 3v4',
    'M8 3v4',
    'M4 10h16',
  ],
  live: [
    'M12 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2',
    'M8.5 8.5a5 5 0 0 0 0 7',
    'M15.5 15.5a5 5 0 0 0 0-7',
    'M5.6 5.6a9 9 0 0 0 0 12.8',
    'M18.4 18.4a9 9 0 0 0 0-12.8',
  ],
  crosshair: ['M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18', 'M12 2v4', 'M12 18v4', 'M2 12h4', 'M18 12h4'],
  // Les deux façons de regarder ses courses. Trois colonnes et non deux : c'est
  // la densité qui fait qu'on reconnaît une sortie à sa forme sans la lire.
  grid: ['M4 4h16v16H4z', 'M4 9.33h16', 'M4 14.67h16', 'M9.33 4v16', 'M14.67 4v16'],
  list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
} as const;

export type IconName = keyof typeof ICONS;

/** Every name the set knows, for the gallery to enumerate without hard-coding. */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- `Object.keys` is typed `string[]` by design; nothing here is being hidden.
export const iconNames = Object.keys(ICONS) as IconName[];

export interface IconProps {
  name: IconName;
  /** In points. Follows the text size it sits next to. */
  size?: number | undefined;
  colour: string;
  /** Set only when the icon is the *sole* carrier of meaning, which is rare. */
  accessibilityLabel?: string | undefined;
  testID?: string | undefined;
}

export function Icon({
  name,
  size = 24,
  colour,
  accessibilityLabel,
  testID,
}: IconProps): ReactNode {
  const decorative = accessibilityLabel === undefined;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={decorative}
      {...(decorative ? {} : { accessibilityRole: 'image' as const, accessibilityLabel })}
      {...(testID === undefined ? {} : { testID })}
    >
      {ICONS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={colour}
          strokeWidth={stroke.thick}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
