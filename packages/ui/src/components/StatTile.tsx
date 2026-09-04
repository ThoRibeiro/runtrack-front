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
  /** Same reason as `MetricCard`: "1:04:22" is not a sentence. */
  spokenValue?: string | undefined;
  /**
   * Centré quand plusieurs tuiles se partagent une ligne à parts égales : à
   * gauche, chaque valeur commence là où finit le mot au-dessus, et cinq
   * colonnes de largeurs différentes n'alignent plus rien.
   */
  align?: 'left' | 'center' | undefined;
  testID?: string | undefined;
}

export function StatTile({
  label,
  value,
  unit,
  spokenUnit,
  spokenValue,
  align = 'left',
  testID,
}: StatTileProps): ReactNode {
  const centred = align === 'center';

  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${spokenValue ?? `${value} ${spokenUnit ?? unit ?? ''}`}`.trim()}
      testID={testID}
      style={{
        gap: space.xxs,
        minWidth: space['4xl'],
        ...(centred ? { alignItems: 'center' } : {}),
      }}
    >
      <Text variant="caption" tone="muted" decorative>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: space.xxs,
          ...(centred ? { justifyContent: 'center' } : {}),
        }}
      >
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
