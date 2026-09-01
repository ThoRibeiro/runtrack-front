import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { controlHeight, iconSize, space } from '../tokens';
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
        paddingTop: space.sm,
        paddingBottom: space.md,
        paddingHorizontal: space.sm,
        backgroundColor: theme.colours.canvas,
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
              // A column, and no filled shape: the active tab is marked by the
              // colour of its icon and its label, not by a coloured lozenge
              // under it. A bar with a solid pill in it is the loudest thing on
              // a screen that is otherwise white.
              alignItems: 'center',
              gap: space.xxs,
              minHeight: controlHeight.md,
              paddingHorizontal: space.sm,
              paddingVertical: space.xxs,
            }}
          >
            <Icon
              name={item.icon}
              size={iconSize.md}
              colour={active ? theme.colours.brand.fill : theme.colours.textMuted}
            />
            {/*
              The label is always there, never only on the active tab: §15
              forbids information carried by colour alone, and a tab bar whose
              labels appear and disappear also shifts its own layout.
            */}
            <Text variant="overline" tone={active ? 'brand' : 'muted'} decorative numberOfLines={1}>
              {item.label}
            </Text>
            {item.badgeCount !== undefined && item.badgeCount > 0 && (
              <Badge count={item.badgeCount} label={`non lus, ${item.label}`} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
