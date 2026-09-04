import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Logo, Text, space, useTheme } from '@runtrack/ui';
import { describeError } from '../../i18n';
import { AuthError } from './AuthError';

/**
 * The frame every authentication screen sits in.
 *
 * A white card on a flat brand ground, which is the shape the reference gives
 * these five screens. It makes signing in read as a place rather than as a
 * step, and it is the only part of the application that uses the accent as a
 * full-bleed ground — everywhere else the accent is an action.
 *
 * The ground is one colour and not a gradient: a wash that shifts behind a
 * card draws the eye to the corner it is darkest in, and there is nothing
 * there to look at.
 *
 * It exists so the five screens cannot drift: the same heading order, the same
 * spacing, the same place for the error. §5 asks for a screen whose title is
 * announced on arrival — `accessibilityRole="header"` on the title is what does
 * that, and having it here means no screen can forget it.
 *
 * Nothing readable sits on the ground: every word is on the card, where the
 * measured ratios hold.
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
    <View style={{ flex: 1, backgroundColor: theme.colours.brand.solid }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          // Centré : la carte flotte sur le fond plutôt que de commencer en
          // haut. C'est le seul endroit où le contenu se centre — ailleurs, une
          // liste commence en haut.
          contentContainerStyle={{
            padding: space.lg,
            flexGrow: 1,
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          testID={testID}
        >
          {/*
            La marque se pose sur le fond, au-dessus de la carte : c'est la
            première chose qu'on voit d'un produit qu'on ne connaît pas encore.
            Elle porte son nom ici parce qu'aucun mot ne l'accompagne.
          */}
          <View style={{ alignItems: 'center', marginBottom: space.lg }}>
            <Logo size={52} colour={theme.colours.brand.onSolid} label="RunTrack" />
          </View>
          <View
            style={{
              backgroundColor: theme.colours.surface,
              borderRadius: theme.radius.sheet,
              padding: space.xl,
              gap: space.lg,
              ...theme.elevation.card,
            }}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export { describeError };
