import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { space } from '../tokens';
import { Text } from './Text';

/** The reference's section title with "Tout voir" pinned to the right. */
export interface SectionHeaderProps {
  title: string;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  testID?: string | undefined;
}

export function SectionHeader({
  title,
  actionLabel = 'Tout voir',
  onAction,
  testID,
}: SectionHeaderProps): ReactNode {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.sm,
      }}
      testID={testID}
    >
      <View accessibilityRole="header">
        <Text variant="section">{title}</Text>
      </View>
      {onAction !== undefined && (
        <Pressable
          onPress={onAction}
          // §5: "Tout voir" alone tells a screen reader nothing about *what*.
          accessibilityLabel={`${actionLabel} : ${title}`}
          enforceTouchTarget={false}
          style={{ minHeight: space['2xl'], justifyContent: 'center' }}
        >
          <Text variant="caption" tone="brand" decorative>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
