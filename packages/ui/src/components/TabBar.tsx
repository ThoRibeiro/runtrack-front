import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { controlHeight, iconSize, radius, space } from '../tokens';
import { Badge } from './Badge';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * The four-tab bar of the reference, the active one carried by a filled
 * `brand.fill` shape.
 *
 * §15 forbids information carried by colour alone, so the active tab is not
 * "the orange one": it also shows its label, and it announces `selected` to the
 * screen reader.
 */
export interface TabItem {
  key: string;
  icon: IconName;
  label: string;
  badgeCount?: number | undefined;
}

export interface TabBarProps {
  items: readonly TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  testID?: string | undefined;
}

export function TabBar({ items, activeKey, onSelect, testID }: TabBarProps): ReactNode {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: space.xs,
        paddingVertical: space.xs,
        paddingHorizontal: space.sm,
        backgroundColor: theme.colours.surface,
        borderTopWidth: theme.stroke.hairline,
        borderTopColor: theme.colours.border,
      }}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              onSelect(item.key);
            }}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            enforceTouchTarget={false}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xxs,
              minHeight: controlHeight.md,
              paddingHorizontal: space.sm,
              borderRadius: radius.full,
              backgroundColor: active ? theme.colours.brand.fill : 'transparent',
            }}
          >
            <Icon
              name={item.icon}
              size={iconSize.lg}
              colour={active ? theme.colours.brand.onFill : theme.colours.textMuted}
            />
            {active && (
              <Text variant="caption" tone="onBrand" decorative>
                {item.label}
              </Text>
            )}
            {item.badgeCount !== undefined && item.badgeCount > 0 && (
              <Badge count={item.badgeCount} label={`non lus, ${item.label}`} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
