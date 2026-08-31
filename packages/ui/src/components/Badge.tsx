import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { radius, space } from '../tokens';
import { Text } from './Text';

/**
 * The unread count. §5: it is never carried by colour alone — the number is the
 * information, and `accessibilityLabel` spells out what it counts.
 */
export interface BadgeProps {
  count: number;
  /** What is being counted, for the screen reader: "notifications non lues". */
  label: string;
  max?: number | undefined;
  testID?: string | undefined;
}

export function Badge({ count, label, max = 99, testID }: BadgeProps): ReactNode {
  const theme = useTheme();
  if (count <= 0) return null;

  const shown = count > max ? `${String(max)}+` : String(count);

  return (
    <View
      accessible
      accessibilityLabel={`${shown} ${label}`}
      testID={testID}
      style={{
        minWidth: space.lg,
        paddingHorizontal: space.xxs,
        borderRadius: radius.full,
        backgroundColor: theme.colours.brand.solid,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="caption" tone="onBrand" decorative>
        {shown}
      </Text>
    </View>
  );
}
