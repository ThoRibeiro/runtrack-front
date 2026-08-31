import type { ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import type { TypographyToken } from '../tokens';

/**
 * Every string on screen goes through here.
 *
 * Two things it guarantees that a raw `<Text>` does not. It never turns
 * `allowFontScaling` off — §5 requires the layout to survive 200 % text, and
 * the fastest way to break that is a component that opts out. And it takes a
 * colour *role*, not a colour: `tone="brand"` resolves to the orange that is
 * legible as text in the current theme, which is never the same orange as a
 * fill.
 */
export type TextTone =
  'default' | 'muted' | 'brand' | 'inverse' | 'onBrand' | 'danger' | 'success' | 'info';

export interface TextProps {
  children: ReactNode;
  variant?: TypographyToken | undefined;
  tone?: TextTone | undefined;
  align?: 'left' | 'center' | 'right' | undefined;
  numberOfLines?: number | undefined;
  /** Reads the value as a whole — "76 battements par minute" rather than "76". */
  accessibilityLabel?: string | undefined;
  /** Hides the string from the screen reader when a parent already reads it. */
  decorative?: boolean | undefined;
  style?: StyleProp<TextStyle> | undefined;
  testID?: string | undefined;
}

export function Text({
  children,
  variant = 'body',
  tone = 'default',
  align,
  numberOfLines,
  accessibilityLabel,
  decorative = false,
  style,
  testID,
}: TextProps): ReactNode {
  const theme = useTheme();
  const { size, lineHeight, family, letterSpacing } = theme.typography[variant];

  const colours: Record<TextTone, string> = {
    default: theme.colours.text,
    muted: theme.colours.textMuted,
    brand: theme.colours.brand.text,
    inverse: theme.colours.textInverse,
    onBrand: theme.colours.brand.onSolid,
    danger: theme.colours.danger.text,
    success: theme.colours.success.text,
    info: theme.colours.info.text,
  };

  return (
    <RNText
      // No `allowFontScaling={false}` here, ever. A lint rule forbids it too.
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      testID={testID}
      style={[
        {
          fontSize: size,
          lineHeight,
          fontFamily: family,
          letterSpacing,
          color: colours[tone],
        },
        align !== undefined && { textAlign: align },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
