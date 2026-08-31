import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useTheme } from '../theme';
import { iconSize, pastilleSize, radius, space } from '../tokens';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * The metric tile of the reference: title, round coloured pastille, big number,
 * small grey unit beside it, a state line under it, and an optional
 * micro-chart.
 *
 * §5, and this is the requirement that is usually missed: it reads as ONE
 * block. "Fréquence cardiaque, 76 battements par minute, stable" — not four
 * disconnected fragments. That is why the whole card is `accessible` with a
 * built label, and why every string inside is marked decorative.
 *
 * The accent is named, never a colour: `accent="heart"` picks the pastille AND
 * the icon colour that is legible on it, which differ per theme.
 */
export type MetricAccent = 'heart' | 'pace' | 'climb' | 'brand';

export interface MetricCardProps {
  title: string;
  value: string;
  unit?: string | undefined;
  /** Reads the unit in full: "battements par minute" rather than "bpm". */
  spokenUnit?: string | undefined;
  status?: string | undefined;
  icon: IconName;
  accent?: MetricAccent | undefined;
  chart?: ReactNode | undefined;
  testID?: string | undefined;
}

export function MetricCard({
  title,
  value,
  unit,
  spokenUnit,
  status,
  icon,
  accent = 'brand',
  chart,
  testID,
}: MetricCardProps): ReactNode {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();

  const pastille =
    accent === 'brand'
      ? { fill: theme.colours.brand.surface, on: theme.colours.brand.text }
      : theme.colours.accent[accent];

  const spoken = [title, `${value} ${spokenUnit ?? unit ?? ''}`.trim(), status]
    .filter((part) => part !== undefined && part !== '')
    .join(', ');

  return (
    <Card accessibilityLabel={spoken} testID={testID}>
      <View style={{ gap: space.sm }}>
        <View
          style={{
            // §5: at 200 % text the title no longer fits beside the pastille,
            // so the row becomes a column rather than truncating the title.
            flexDirection: fontScale > 1.3 ? 'column' : 'row',
            alignItems: fontScale > 1.3 ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: space.xs,
          }}
        >
          <Text variant="caption" tone="muted" decorative>
            {title}
          </Text>
          <View
            style={{
              width: pastilleSize,
              height: pastilleSize,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pastille.fill,
            }}
          >
            <Icon name={icon} size={iconSize.md} colour={pastille.on} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xxs }}>
          <Text variant="metric" decorative>
            {value}
          </Text>
          {unit !== undefined && (
            <Text variant="caption" tone="muted" decorative>
              {unit}
            </Text>
          )}
        </View>

        {chart}

        {status !== undefined && (
          <Text variant="caption" tone="muted" decorative>
            {status}
          </Text>
        )}
      </View>
    </Card>
  );
}
