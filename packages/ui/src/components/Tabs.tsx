import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { radius, space } from '../tokens';
import { Text } from './Text';

/** In-screen segmented control: abonnés / abonnements, semaine / mois / année. */
export interface TabsProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onValueChange: (next: T) => void;
  /** Names the group for the screen reader: "Période". */
  label: string;
  testID?: string | undefined;
}

export function Tabs<T extends string>({
  options,
  value,
  onValueChange,
  label,
  testID,
}: TabsProps<T>): ReactNode {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      testID={testID}
      style={{
        flexDirection: 'row',
        gap: space.xxs,
        padding: space.xxs,
        borderRadius: radius.full,
        backgroundColor: theme.colours.surfaceAlt,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              onValueChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            enforceTouchTarget={false}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: space['3xl'],
              paddingHorizontal: space.sm,
              borderRadius: radius.full,
              backgroundColor: active ? theme.colours.surface : 'transparent',
            }}
          >
            <Text variant="caption" tone={active ? 'default' : 'muted'} decorative>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
