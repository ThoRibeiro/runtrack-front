import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { space } from '../tokens';

/**
 * §3: separation comes from the radius and the background, never from a strong
 * shadow. `elevation.card` is at the edge of visible on purpose.
 */
export type CardTone = 'surface' | 'alt' | 'brand';

export interface CardProps {
  children: ReactNode;
  tone?: CardTone | undefined;
  padded?: boolean | undefined;
  /** Groups the card into a single screen-reader announcement. */
  accessibilityLabel?: string | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
}

export function Card({
  children,
  tone = 'surface',
  padded = true,
  accessibilityLabel,
  style,
  testID,
}: CardProps): ReactNode {
  const theme = useTheme();

  const background = {
    surface: theme.colours.surface,
    alt: theme.colours.surfaceAlt,
    brand: theme.colours.brand.surface,
  }[tone];

  return (
    <View
      testID={testID}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          backgroundColor: background,
          borderRadius: theme.radius.xl,
          padding: padded ? space.md : 0,
        },
        theme.elevation.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
