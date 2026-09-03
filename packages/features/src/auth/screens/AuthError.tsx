import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon, Text, iconSize, space, useTheme } from '@runtrack/ui';
import { describeError, translate } from '../../i18n';

/**
 * §15: never "une erreur est survenue" without looking at the `code`.
 * `describeError` does the looking; this shows the result. The detail and the
 * reference come with it only when the failure is not the user's to fix — a
 * wrong password gets the sentence and nothing else.
 */
export function AuthError({ error }: { error: unknown }): ReactNode {
  const theme = useTheme();
  const described = describeError(error);

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={
        described.detail === undefined ? described.title : `${described.title}. ${described.detail}`
      }
      testID="auth-error"
      style={{
        flexDirection: 'row',
        gap: space.sm,
        padding: space.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colours.danger.surface,
      }}
    >
      {/* Never carried by colour alone. */}
      <Icon name="alert-circle" size={iconSize.md} colour={theme.colours.danger.text} />
      <View style={{ flex: 1, gap: space.xxs }}>
        <Text variant="bodyStrong" tone="danger" decorative>
          {described.title}
        </Text>
        {described.detail !== undefined && (
          <Text variant="caption" tone="muted" decorative>
            {described.detail}
          </Text>
        )}
        {described.correlationId !== undefined && (
          <Text variant="caption" tone="muted" decorative>
            {translate('error.reference', { correlationId: described.correlationId })}
          </Text>
        )}
      </View>
    </View>
  );
}
