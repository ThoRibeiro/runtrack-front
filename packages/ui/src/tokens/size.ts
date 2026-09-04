import { MINIMUM_TOUCH_TARGET } from './a11y';

/**
 * Component dimensions. They belong here for the same reason colours do: a
 * `height: 44` written in a screen is the first step towards three button
 * heights that are almost the same.
 *
 * None of these is a *text* container height. §5 forbids pinning a height
 * around text, because the layout has to survive 200 % — these are minimums.
 */
export const controlHeight = {
  sm: 36,
  md: MINIMUM_TOUCH_TARGET,
  lg: 56,
} as const;

export const avatarSize = {
  xs: 28,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
  /** La photo d'un profil, qui est ce qu'on regarde en arrivant dessus. */
  '2xl': 96,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

/** The round coloured disc behind a metric icon. */
export const pastilleSize = 36;

/** The progress ring of the highlight card. */
export const ringSize = 96;

export type ControlSize = keyof typeof controlHeight;
export type AvatarSizeToken = keyof typeof avatarSize;
export type IconSizeToken = keyof typeof iconSize;
