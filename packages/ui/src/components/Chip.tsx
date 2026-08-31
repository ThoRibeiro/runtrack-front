import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { iconSize, radius, space } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** A small pill: the activity type on a run, a filter, a state. */
export interface ChipProps {
  label: string;
  icon?: IconName | undefined;
  selected?: boolean | undefined;
  onPress?: (() => void) | undefined;
  testID?: string | undefined;
}

export function Chip({ label, icon, selected = false, onPress, testID }: ChipProps): ReactNode {
  const theme = useTheme();
  const background = selected ? theme.colours.brand.surface : theme.colours.surfaceAlt;
  const foreground = selected ? theme.colours.brand.text : theme.colours.textMuted;

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xxs,
        paddingHorizontal: space.sm,
        paddingVertical: space.xxs,
        borderRadius: radius.full,
        backgroundColor: background,
      }}
    >
      {icon !== undefined && <Icon name={icon} size={iconSize.sm} colour={foreground} />}
      <Text
        variant="caption"
        tone={selected ? 'brand' : 'muted'}
        decorative={onPress !== undefined}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress === undefined) {
    return (
      <View accessible accessibilityLabel={label} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      enforceTouchTarget={false}
      // §5: a chip is small by nature, so the target is widened rather than the
      // chip. `hitSlop` is the only way to keep the look and meet 48 pt.
      style={{ minHeight: space['2xl'] }}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}
