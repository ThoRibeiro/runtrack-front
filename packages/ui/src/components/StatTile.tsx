import type { ReactNode } from 'react';
import { View } from 'react-native';
import { space } from '../tokens';
import { Text } from './Text';

/** The statistics brick of a finished activity: one label, one value. */
export interface StatTileProps {
  label: string;
  value: string;
  unit?: string | undefined;
  spokenUnit?: string | undefined;
  testID?: string | undefined;
}

export function StatTile({ label, value, unit, spokenUnit, testID }: StatTileProps): ReactNode {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${value} ${spokenUnit ?? unit ?? ''}`.trim()}
      testID={testID}
      style={{ gap: space.xxs, minWidth: space['4xl'] }}
    >
      <Text variant="caption" tone="muted" decorative>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xxs }}>
        <Text variant="section" decorative>
          {value}
        </Text>
        {unit !== undefined && (
          <Text variant="caption" tone="muted" decorative>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}
