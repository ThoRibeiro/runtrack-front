/**
 * The primitive palette: colours named by what they *are*, never by what they
 * are for. Nothing outside `../theme` may read this file — a screen that picks
 * `palette.teal500` has bypassed the theme and will be wrong in the dark and in
 * the running theme.
 *
 * ---
 *
 * **The five colours are the brief's successor, chosen by the owner:**
 * `#137C8B`, `#709CA7`, `#B8CBD0`, `#7A90A4`, `#344D59`. They replace the
 * reference's single orange, and they are a better set for one measurable
 * reason: `#137C8B` gives **4.90:1 on white**, so the accent is legible *as
 * text*. The orange it replaces gave 3.72:1, which is what forced the two
 * oranges of the old §3 — one for fills, one for text, and a rule nobody could
 * remember. One accent now does both jobs.
 *
 * Two shades are derived, because two jobs had no colour in the set:
 *
 *  - **`slate600` `#5A7182`** for secondary text. `#7A90A4` is 3.31:1 on white —
 *    fine for a border or an icon, below AA for words. Darkened until it
 *    measured 5.10:1, and no further;
 *  - **`teal400` `#25AABE`** for the accent on a dark ground. `#137C8B` falls to
 *    3.79:1 there, which is a fill, not a label. Lightened to 6.70:1.
 *
 * Everything else is the five, or a neutral. `../theme/contrast.test.ts` walks
 * every pair of every theme and is what keeps this honest.
 */
export const palette = {
  // The accent, and the only chromatic colour the interface uses on purpose.
  teal500: '#137C8B', // 4.90:1 on white — fills AND text. The whole point.
  teal600: '#0F6673', // pressed states and the label on a light tinted ground.
  teal400: '#25AABE', // the accent on a dark ground: 6.70:1.
  teal50: '#E7F1F3', // the tint under a highlighted card, barely there.
  teal900: '#0A2C32', // its dark-theme counterpart.

  // The blue-greys, from the same family. They carry structure, not meaning.
  slate800: '#344D59', // primary text: 8.93:1 on white.
  slate600: '#5A7182', // secondary text: 5.10:1. Derived — see above.
  slate500: '#7A90A4', // field borders, meaningful icons: 3.31:1, non-text.
  slate400: '#709CA7', // a stronger separator, 3.00:1.
  slate200: '#B8CBD0', // surfaces, decorative rules.
  slate100: '#DCE5E8', // the faintest rule, on white.
  slate50: '#F4F7F8', // grouped rows, fields, the alternate surface.

  // Neutrals. Minimalism means most of the screen is one of these two.
  white: '#FFFFFF',
  black: '#000000',
  canvasWeb: '#FBFCFC', // the page is wider on the web; a hair off white keeps cards visible.

  // The dark theme, built from `slate800` rather than from a neutral grey: a
  // dark that shares the accent's hue reads as the same product with the lights
  // off, which a neutral charcoal does not.
  ink900: '#0E1416',
  ink800: '#172026',
  ink700: '#1F2B32',
  ink600: '#2C3B44',
  ink400: '#6E838F',
  ink200: '#9FB4BB',
  ink100: '#B8CBD0', // secondary text in the dark: 11.05:1.

  // Darker still: the running theme is read at arm's length, in full sun.
  night900: '#0A0F12',
  night800: '#141C21',
  night600: '#22303A',
  night400: '#7C929E',
  night200: '#B8CBD0',

  // Metric pastilles.
  //
  // The references put a coloured disc behind each icon, and it is what makes a
  // list of metrics scannable — the eye finds the heart before it reads the
  // word. The set is deliberately cold: no orange anywhere, and each pair is a
  // pale ground with a dark icon on it, measured at 5.3:1 or better.
  heartSurface: '#FCE8EE',
  heartIcon: '#B0304F',
  heartSurfaceDark: '#33161D',
  heartIconDark: '#FF97AE',
  climbSurface: '#EDEAFB',
  climbIcon: '#5B4BB8',
  climbSurfaceDark: '#1F1B3A',
  climbIconDark: '#A99CF0',
  countSurface: '#E8EEF8',
  countIcon: '#2F5AA8',
  countSurfaceDark: '#152238',
  countIconDark: '#8FB2E8',

  // Feedback. Absent from a five-colour palette and unavoidable: §5 forbids an
  // error carried by a red border alone, so the words need a colour too.
  //
  // The red is pulled to the cold side of red on purpose — **no orange anywhere
  // in this interface**, and a brick red reads as one at a glance. It sits
  // beside the blue-greys instead of shouting over them, and it is the only
  // chromatic colour here besides the accent.
  danger: '#A6203A', // 7.30:1 on white.
  dangerSurface: '#FAE8EC',
  dangerDark: '#FF8A9E', // 8.16:1 on the dark canvas.
  dangerSurfaceDark: '#33141C',
  success: '#1B6E4B', // 5.24:1 on white — a green, and far from orange.
  successDark: '#5FCB97',

  // Information.
  infoSurface: '#EAF1F3',
  infoText: '#2F5C69',
  infoSurfaceDark: '#152A31',
  infoTextDark: '#8FC4D0',

  // Focus ring (web keyboard navigation). Deliberately not the accent: it has
  // to be told apart from a teal fill at a glance.
  focus: '#1B4FD8',
  focusDark: '#7FA6FF',

  // Skeletons. Two steps apart and no more: a shimmer that contrasts is a
  // shimmer that draws the eye to what is not there yet.
  skeletonLight: '#EDF2F3',
  skeletonLightHighlight: '#F7FAFA',
  skeletonDark: '#1F2B32',
  skeletonDarkHighlight: '#2C3B44',

  // Translucency. A literal `rgba()` written in a component is exactly what the
  // design rules forbid, so the three that exist live here.
  scrim: 'rgba(15, 24, 28, 0.48)',
  glassLight: 'rgba(255, 255, 255, 0.78)',
  /** A ring track drawn on the accent fill. */
  onAccentTrack: 'rgba(255, 255, 255, 0.28)',
  glassDark: 'rgba(20, 28, 33, 0.72)',
} as const;

export type PaletteColour = keyof typeof palette;
