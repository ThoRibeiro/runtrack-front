import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon, Text, iconSize, space, useTheme } from '@runtrack/ui';
import { describeError, translate } from '../../i18n';

/**
 * §15: never "une erreur est survenue" without looking at the `code`.
 * `describeError` does the looking; this shows the result, with the correlation
 * id the user will quote if they report it (§11).
 */
export function AuthError({ error }: { error: unknown }): ReactNode {
  const theme = useTheme();
  const described = describeError(error);

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${described.title}. ${described.detail}`}
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
        <Text variant="caption" tone="muted" decorative>
          {described.detail}
        </Text>
        {described.correlationId !== undefined && (
          <Text variant="caption" tone="muted" decorative>
            {translate('error.reference', { correlationId: described.correlationId })}
          </Text>
        )}
      </View>
    </View>
  );
}
