import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { controlHeight, iconSize, radius, space } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * The round button with its caption underneath — the row at the top of the
 * activity sheet: Suivre en direct, Partager, Hors-ligne, Enregistrer.
 *
 * §5 calls this row out by name as the first place the touch target rule bites:
 * four buttons side by side, each at least 48 pt with space between them.
 * `label` is both the caption and the accessible name, which is why it cannot
 * be dropped.
 */
export interface IconActionProps {
  icon: IconName;
  label: string;
  onPress?: (() => void) | undefined;
  active?: boolean | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}

export function IconAction({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  testID,
}: IconActionProps): ReactNode {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      haptic="light"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      enforceTouchTarget={false}
      testID={testID}
      style={{ alignItems: 'center', gap: space.xxs, opacity: disabled ? 0.45 : 1 }}
    >
      <View
        style={{
          width: controlHeight.md,
          height: controlHeight.md,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.colours.brand.fill : theme.colours.surfaceAlt,
        }}
      >
        <Icon
          name={icon}
          size={iconSize.lg}
          colour={active ? theme.colours.brand.onFill : theme.colours.text}
        />
      </View>
      <Text variant="caption" tone="muted" decorative>
        {label}
      </Text>
    </Pressable>
  );
}
