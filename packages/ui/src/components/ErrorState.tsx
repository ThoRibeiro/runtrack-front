import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { space } from '../tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * §15 forbids a `catch` that shows "une erreur est survenue" without looking at
 * the `code`. So the title is the sentence the caller read from the
 * `problem+json` — this component refuses to invent one.
 *
 * `correlationId` is shown when it is given, and `describeError` only gives it
 * for a failure the user can do nothing about: on an error they can act on, a
 * reference explains nothing.
 */
export interface ErrorStateProps {
  title: string;
  /** Only when the title needs a complement — most codes say it all. */
  message?: string | undefined;
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
      accessibilityLabel={message === undefined ? title : `${title}. ${message}`}
      testID={testID}
      style={{ alignItems: 'center', gap: space.sm, padding: space.xl }}
    >
      {/* §15: not carried by colour alone — the icon and the wording say it too. */}
      <Icon name="alert-circle" size={space['2xl']} colour={theme.colours.danger.text} />
      <Text variant="section" align="center" decorative>
        {title}
      </Text>
      {message !== undefined && (
        <Text tone="muted" align="center" decorative>
          {message}
        </Text>
      )}
      {correlationId !== undefined && (
        <Text variant="caption" tone="muted" align="center" decorative>
          {`Référence : ${correlationId}`}
        </Text>
      )}
      {onRetry !== undefined && <Button label={retryLabel} variant="outline" onPress={onRetry} />}
    </View>
  );
}
