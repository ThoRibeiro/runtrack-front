import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useTheme } from '../theme';
import { iconSize, pastilleSize, radius, space } from '../tokens';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * The metric tile: a white card, a label, a round icon pastille, and the
 * number.
 *
 * The pastille is what makes a list of metrics scannable — the eye finds the
 * heart before it reads "fréquence cardiaque" — and it is the single most
 * recognisable element of the references this design follows. It is tinted
 * from the theme, never from a literal colour, so the same card works on the
 * light, dark and running themes.
 *
 * §5, and this is the requirement usually missed: it reads as ONE block —
 * "Fréquence cardiaque, 76 battements par minute, stable", not four
 * disconnected fragments. Hence the built label and the decorative strings.
 * §15 is why the icon is never the only carrier: the label says the same thing
 * in words.
 */
export type MetricAccent = 'heart' | 'pace' | 'climb' | 'count' | 'brand';

export interface MetricCardProps {
  title: string;
  value: string;
  unit?: string | undefined;
  /** Reads the unit in full: "battements par minute" rather than "bpm". */
  spokenUnit?: string | undefined;
  /**
   * Replaces the whole spoken value when what is written is not readable aloud.
   * "5:12" comes out as "five colon twelve"; the caller says "5 minutes 12 par
   * kilomètre" instead, and the unit is not repeated after it.
   */
  spokenValue?: string | undefined;
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
  spokenValue,
  icon,
  accent = 'brand',
  chart,
  testID,
}: MetricCardProps): ReactNode {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();

  const spoken = [title, spokenValue ?? `${value} ${spokenUnit ?? unit ?? ''}`.trim(), status]
    .filter((part) => part !== undefined && part !== '')
    .join(', ');

  const pastille =
    accent === 'brand'
      ? { fill: theme.colours.brand.surface, on: theme.colours.brand.text }
      : theme.colours.accent[accent];

  return (
    <Card tone="outlined" accessibilityLabel={spoken} testID={testID}>
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
          <Text variant="overline" tone="muted" decorative>
            {title}
          </Text>
          <View
            style={{
              width: pastilleSize,
              height: pastilleSize,
              borderRadius: radius.sm,
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
