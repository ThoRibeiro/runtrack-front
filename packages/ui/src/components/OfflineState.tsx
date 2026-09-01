import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { space } from '../tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * What a screen shows instead of a spinner when there is no network (§9).
 *
 * "Pas de spinner infini : un écran qui tourne indéfiniment est un mensonge."
 * A paused query looks exactly like a slow one from the inside — the difference
 * is knowable, and this is what says it out loud.
 *
 * It offers to retry rather than only informing: the network may well be back,
 * and a screen that waits for a listener to fire feels broken.
 */
export interface OfflineStateProps {
  title: string;
  description?: string | undefined;
  retryLabel?: string | undefined;
  onRetry?: (() => void) | undefined;
  testID?: string | undefined;
}

export function OfflineState({
  title,
  description,
  retryLabel,
  onRetry,
  testID,
}: OfflineStateProps): ReactNode {
  const theme = useTheme();
  const spoken = description === undefined ? title : `${title}. ${description}`;

  return (
    <View
      accessible
      // §5: read as one thing, and announced as a status rather than an error —
      // being offline is a state, not a failure.
      accessibilityRole="alert"
      accessibilityLabel={spoken}
      testID={testID}
      style={{ alignItems: 'center', gap: space.sm, padding: space.xl }}
    >
      {/* §15: never colour alone — the icon repeats what the words say. */}
      <Icon name="wifi-off" colour={theme.colours.textMuted} />
      <Text variant="section" align="center" decorative>
        {title}
      </Text>
      {description !== undefined && (
        <Text tone="muted" align="center" decorative>
          {description}
        </Text>
      )}
      {onRetry !== undefined && retryLabel !== undefined && (
        <Button variant="outline" label={retryLabel} onPress={onRetry} testID="offline-retry" />
      )}
    </View>
  );
}
