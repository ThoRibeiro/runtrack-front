import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';
import { ringSize, stroke } from '../tokens';
import { Text } from './Text';

/**
 * The ring of the reference's highlight card. The track is the light part, the
 * arc is `brand.fill` — a non-text element carrying meaning, so 3:1 against the
 * card, which is what the contrast test checks.
 *
 * §5: it announces one sentence, not a number floating on its own. "Objectif de
 * la semaine, 68 %" is usable; "68" is not.
 */
export interface ProgressRingProps {
  /** 0 to 1. Values outside are clamped rather than drawn wrong. */
  progress: number;
  /**
   * Drawn to sit on the accent fill rather than on a page: the track becomes a
   * translucent white and the arc solid white. Without it the ring disappears
   * into the colour it is drawn on.
   */
  onAccent?: boolean | undefined;
  label: string;
  size?: number | undefined;
  /** Replaces the percentage in the middle — a distance, for instance. */
  centre?: ReactNode | undefined;
  testID?: string | undefined;
}

export function ProgressRing({
  progress,
  onAccent = false,
  label,
  size = ringSize,
  centre,
  testID,
}: ProgressRingProps): ReactNode {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const percentage = Math.round(clamped * 100);

  const radius = (size - stroke.ring) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}, ${String(percentage)} %`}
      accessibilityValue={{ min: 0, max: 100, now: percentage }}
      testID={testID}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={onAccent ? theme.colours.brand.onFillTrack : theme.colours.brand.track}
          strokeWidth={stroke.ring}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={onAccent ? theme.colours.brand.onSolid : theme.colours.brand.fill}
          strokeWidth={stroke.ring}
          strokeLinecap="round"
          strokeDasharray={`${String(circumference)} ${String(circumference)}`}
          strokeDashoffset={circumference * (1 - clamped)}
          fill="none"
          // Starts at twelve o'clock rather than at three.
          transform={`rotate(-90 ${String(size / 2)} ${String(size / 2)})`}
        />
      </Svg>
      {centre ?? (
        <Text variant="metric" tone={onAccent ? 'onBrand' : 'default'} decorative>
          {`${String(percentage)} %`}
        </Text>
      )}
    </View>
  );
}
