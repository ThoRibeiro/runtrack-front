/**
 * Soft, and never hard.
 *
 * The references put white cards on a tinted ground with a wide, faint shadow
 * beneath them — enough to lift the card, never enough to draw a line. That is
 * what makes a list of cards readable at a glance: each one is an object, not
 * a region of a page.
 *
 * `raised` is for the accent card that carries the summary: it sits on colour,
 * so its shadow is tinted rather than grey — a neutral shadow under a coloured
 * surface reads as dirt.
 */
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  card: {
    shadowColor: '#344D59',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#137C8B',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#0A0F12',
    shadowOpacity: 0.16,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
} as const;

export type ElevationToken = keyof typeof elevation;
