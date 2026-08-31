import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text, space, useTheme } from '@runtrack/ui';
import { describeError } from '../../i18n';
import { AuthError } from './AuthError';

/**
 * The frame every authentication screen sits in.
 *
 * It exists so the five screens cannot drift: the same heading order, the same
 * spacing, the same place for the error. §5 asks for a screen whose title is
 * announced on arrival — `accessibilityRole="header"` on the title is what does
 * that, and having it here means no screen can forget it.
 */
export interface AuthLayoutProps {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  /** Shown above the form, announced as an alert (§5). */
  error?: unknown;
  footer?: ReactNode;
  testID?: string;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  error,
  footer,
  testID,
}: AuthLayoutProps): ReactNode {
  const theme = useTheme();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colours.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        testID={testID}
      >
        <View style={{ gap: space.xs }}>
          <View accessible accessibilityRole="header" accessibilityLabel={title}>
            <Text variant="title" decorative>
              {title}
            </Text>
          </View>
          {subtitle !== undefined && <Text tone="muted">{subtitle}</Text>}
        </View>

        {error !== undefined && error !== null && <AuthError error={error} />}

        <View style={{ gap: space.md }}>{children}</View>

        {footer !== undefined && <View style={{ gap: space.sm }}>{footer}</View>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export { describeError };
