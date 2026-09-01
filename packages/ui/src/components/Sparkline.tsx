import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme';
import { radius, stroke } from '../tokens';

/**
 * The micro-charts of the reference card. No chart library: these draw one
 * series with no axis, no legend and no interaction, and a charting dependency
 * would cost more bundle than the whole of `packages/ui`.
 *
 * §5: they are decoration. The number next to them is the information, so they
 * are hidden from the screen reader rather than described badly.
 */
export interface SeriesProps {
  values: readonly number[];
  width: number;
  height: number;
  colour?: string | undefined;
  testID?: string | undefined;
}

function bounds(values: readonly number[]): { low: number; span: number } {
  const low = Math.min(...values);
  const high = Math.max(...values);
  // A flat series must draw a flat line, not divide by zero.
  return { low, span: high - low === 0 ? 1 : high - low };
}

export function Sparkline({ values, width, height, colour, testID }: SeriesProps): ReactNode {
  const theme = useTheme();
  if (values.length < 2) return <View style={{ width, height }} testID={testID} />;

  const { low, span } = bounds(values);
  const step = width / (values.length - 1);
  const d = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - low) / span) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <View aria-hidden testID={testID}>
      <Svg width={width} height={height}>
        <Path
          d={d}
          stroke={colour ?? theme.colours.accent.pace.line}
          strokeWidth={stroke.thick}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export function BarSeries({ values, width, height, colour, testID }: SeriesProps): ReactNode {
  const theme = useTheme();
  if (values.length === 0) return <View style={{ width, height }} testID={testID} />;

  const { low, span } = bounds(values);
  const slot = width / values.length;
  const barWidth = Math.max(stroke.thick, slot * 0.6);

  return (
    <View aria-hidden testID={testID}>
      <Svg width={width} height={height}>
        {values.map((value, index) => {
          const barHeight = Math.max(stroke.thick, ((value - low) / span) * height);
          return (
            <Rect
              key={`${String(index)}-${String(value)}`}
              transform={`translate(${String(index * slot + (slot - barWidth) / 2)}, ${String(height - barHeight)})`}
              width={barWidth}
              height={barHeight}
              rx={radius.xs / 2}
              fill={colour ?? theme.colours.brand.fill}
            />
          );
        })}
      </Svg>
    </View>
  );
}
