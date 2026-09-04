import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { controlHeight, iconSize, radius, space, type ControlSize } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * A rounded rectangle, as the references draw it — a pill is reserved for
 * chips and for the round icon buttons. The variants exist so
 * that a screen never has to reach inside — if a screen needs a button this
 * cannot make, the answer is a new variant here, not an override from outside.
 *
 * `brand.solid` and `brand.fill` are the same colour now, and that is the point
 * of the palette: `#2563EB` carries a white label at 5.17:1, so the accent does
 * not have to change shade depending on whether something is written on it. The
 * two names stay because the dark theme still separates them.
 */
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: (() => void) | undefined;
  variant?: ButtonVariant | undefined;
  size?: ControlSize | undefined;
  icon?: IconName | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  fullWidth?: boolean | undefined;
  /** Defaults to the label; set it when the label alone is not enough. */
  accessibilityLabel?: string | undefined;
  accessibilityHint?: string | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
}

export function Button({
  label,
  onPress,
  variant = 'solid',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps): ReactNode {
  const theme = useTheme();
  const inactive = disabled || loading;

  const surface: Record<ButtonVariant, ViewStyle> = {
    solid: { backgroundColor: theme.colours.brand.solid },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: theme.stroke.hairline,
      borderColor: theme.colours.brand.text,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: theme.colours.danger.solid },
  };

  const tone = {
    solid: 'onBrand',
    outline: 'brand',
    ghost: 'brand',
    danger: 'onBrand',
  } as const;

  const foreground = {
    solid: theme.colours.brand.onSolid,
    outline: theme.colours.brand.text,
    ghost: theme.colours.brand.text,
    danger: theme.colours.danger.onSolid,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      haptic={variant === 'danger' ? 'warning' : 'light'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      // §5: a screen reader has to hear that the button is working, otherwise
      // the only feedback for a slow request is silence.
      accessibilityState={{ busy: loading }}
      enforceTouchTarget={false}
      testID={testID}
      style={[
        styles.base,
        surface[variant],
        {
          minHeight: controlHeight[size],
          paddingHorizontal: size === 'sm' ? space.md : space.xl,
          gap: space.xs,
        },
        fullWidth && styles.fullWidth,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} testID={testID ? `${testID}-spinner` : undefined} />
      ) : (
        <>
          {icon !== undefined && <Icon name={icon} size={iconSize.md} colour={foreground} />}
          <Text variant="bodyStrong" tone={tone[variant]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Un rectangle arrondi et non une pilule : c'est la forme des maquettes,
    // et elle se lit comme plus solide. La pilule reste pour les chips.
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  fullWidth: { alignSelf: 'stretch' },
  // Opacity rather than a grey token: the disabled state must read the same in
  // all three themes, and a grey chosen for the light one does not.
  inactive: { opacity: 0.45 },
});
