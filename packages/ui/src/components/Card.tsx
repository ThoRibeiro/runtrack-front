import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { space } from '../tokens';

/**
 * §3: separation comes from the radius and the background, never from a strong
 * shadow. `elevation.card` is at the edge of visible on purpose.
 */
/**
 * `plain` is the one this design reaches for most: no background, no border,
 * no padding of its own — the content sits on the page and space does the
 * separating. A box around everything is what makes an interface look busy,
 * and the direction here is the opposite of busy.
 */
/**
 * `accent` is the highlight card of the references: a saturated fill with white
 * on it. It is the one block of full colour on a screen, which is exactly what
 * makes it read first — and why there is never more than one.
 *
 * `brand` is its pale cousin, for a tinted panel that carries **dark** text.
 * Confusing the two is how white text ends up on a near-white ground, so the
 * names say which text they expect.
 */
export type CardTone = 'plain' | 'surface' | 'alt' | 'brand' | 'accent';

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
    plain: 'transparent',
    surface: theme.colours.surface,
    alt: theme.colours.surfaceAlt,
    brand: theme.colours.brand.surface,
    accent: theme.colours.brand.solid,
  }[tone];

  return (
    <View
      testID={testID}
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          backgroundColor: background,
          borderRadius: tone === 'plain' ? 0 : theme.radius.xl,
          // No border under the shadow: the references lift a card off the
          // ground rather than drawing its edge, and doing both makes the
          // outline read twice.
          padding: padded && tone !== 'plain' ? space.md : 0,
        },
        // A coloured surface gets a tinted shadow: a grey one under it reads
        // as dirt.
        tone === 'plain'
          ? theme.elevation.none
          : tone === 'accent'
            ? theme.elevation.raised
            : theme.elevation.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
