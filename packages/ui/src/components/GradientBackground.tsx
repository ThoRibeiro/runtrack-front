import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

/**
 * The tinted ground the authentication screens sit on.
 *
 * The reference puts a white card on a coloured gradient rather than a form on
 * a white page, and the difference is not decoration: it makes signing in feel
 * like a place rather than a step. The gradient runs from the accent to its
 * lighter shade, which is the same pair the dark theme already uses — no new
 * colour enters the palette to make this work.
 *
 * Contrast is unaffected: nothing is written on the gradient. Everything
 * readable sits on the white card above it, where the ratios are the measured
 * ones.
 */
export interface GradientBackgroundProps {
  children: ReactNode;
  testID?: string | undefined;
}

export function GradientBackground({ children, testID }: GradientBackgroundProps): ReactNode {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={[theme.colours.brand.solid, theme.colours.brand.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
}
