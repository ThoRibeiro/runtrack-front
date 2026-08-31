import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { space } from '../tokens';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Nothing to show, and it says what to do about it rather than sitting blank. */
export interface EmptyStateProps {
  title: string;
  description?: string | undefined;
  icon?: IconName | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  testID?: string | undefined;
}

export function EmptyState({
  title,
  description,
  icon = 'activity',
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps): ReactNode {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={description === undefined ? title : `${title}. ${description}`}
      testID={testID}
      style={{ alignItems: 'center', gap: space.sm, padding: space.xl }}
    >
      <Icon name={icon} size={space['2xl']} colour={theme.colours.textMuted} />
      <Text variant="section" align="center" decorative>
        {title}
      </Text>
      {description !== undefined && (
        <Text tone="muted" align="center" decorative>
          {description}
        </Text>
      )}
      {actionLabel !== undefined && (
        <Button label={actionLabel} variant="outline" onPress={onAction} />
      )}
    </View>
  );
}
