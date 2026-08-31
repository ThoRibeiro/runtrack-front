/**
 * §3: "ombre diffuse et très faible — la séparation se fait par le rayon et le
 * fond, jamais par une ombre marquée". These values are deliberately at the
 * edge of visible; anything stronger is a bug, not a taste.
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
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 4,
  },
} as const;

export type ElevationToken = keyof typeof elevation;
