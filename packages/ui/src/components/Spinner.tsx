import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme';
import { space } from '../tokens';
import { Text } from './Text';

/**
 * §15: a spinner never ships alone — the caller owes an error state and an
 * empty state next to it. `label` is required because "loading" with nothing
 * said is exactly the infinite spinner that §9 calls a lie.
 */
export interface SpinnerProps {
  label: string;
  /** Shows the label. Off, it is still announced. */
  visibleLabel?: boolean | undefined;
  testID?: string | undefined;
}

export function Spinner({ label, visibleLabel = false, testID }: SpinnerProps): ReactNode {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      testID={testID}
      style={{ alignItems: 'center', gap: space.xs, padding: space.md }}
    >
      <ActivityIndicator color={theme.colours.brand.fill} />
      {visibleLabel && (
        <Text variant="caption" tone="muted" decorative>
          {label}
        </Text>
      )}
    </View>
  );
}
