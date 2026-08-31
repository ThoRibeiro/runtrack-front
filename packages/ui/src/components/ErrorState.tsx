import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { space } from '../tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * §15 forbids a `catch` that shows "une erreur est survenue" without looking at
 * the `code`. So the message is required and the caller is the one that read
 * the `problem+json` — this component refuses to invent a sentence.
 *
 * `correlationId` is displayed because it is what the user quotes when they
 * report the problem, and the server echoes it back.
 */
export interface ErrorStateProps {
  title: string;
  /** Says what happened, derived from the business `code` — never generic. */
  message: string;
  correlationId?: string | undefined;
  retryLabel?: string | undefined;
  onRetry?: (() => void) | undefined;
  testID?: string | undefined;
}

export function ErrorState({
  title,
  message,
  correlationId,
  retryLabel = 'Réessayer',
  onRetry,
  testID,
}: ErrorStateProps): ReactNode {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${message}`}
      testID={testID}
      style={{ alignItems: 'center', gap: space.sm, padding: space.xl }}
    >
      {/* §15: not carried by colour alone — the icon and the wording say it too. */}
      <Icon name="alert-circle" size={space['2xl']} colour={theme.colours.danger.text} />
      <Text variant="section" align="center" decorative>
        {title}
      </Text>
      <Text tone="muted" align="center" decorative>
        {message}
      </Text>
      {correlationId !== undefined && (
        <Text variant="caption" tone="muted" align="center" decorative>
          {`Référence : ${correlationId}`}
        </Text>
      )}
      {onRetry !== undefined && <Button label={retryLabel} variant="outline" onPress={onRetry} />}
    </View>
  );
}
