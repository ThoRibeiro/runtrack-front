import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Icon, Text, space, useTheme, type IconName } from '@runtrack/ui';
import { translate, type TranslationKey } from '../../i18n';

/**
 * The first screen of a fresh install, and the only one that is allowed to be
 * large and quiet.
 *
 * Three panels, one idea each, and one thing to press. The restraint is the
 * design: an onboarding that explains six features teaches none of them, and a
 * runner who opened a running application already knows what it is for. What
 * they do not know is what makes *this* one different — that it records with
 * the screen locked, that a friend can watch, and that a link opens a run
 * without an account.
 *
 * It never asks for a permission. §6 and §12 are explicit: the location prompt
 * belongs to the first run, the notification prompt to the moment someone wants
 * notifications. A welcome screen that opens two system dialogs is how an
 * application gets both refused before it has done anything.
 */
export interface WelcomeScreenProps {
  /** Marks it seen and leaves. */
  onDone: () => void;
}

/** Typed against the catalogue: a panel naming a key that does not exist fails to compile. */
const PANELS = [
  { icon: 'activity', title: 'welcome.record.title', body: 'welcome.record.body' },
  { icon: 'live', title: 'welcome.live.title', body: 'welcome.live.body' },
  { icon: 'share', title: 'welcome.share.title', body: 'welcome.share.body' },
] as const satisfies readonly { icon: IconName; title: TranslationKey; body: TranslationKey }[];

export function WelcomeScreen({ onDone }: WelcomeScreenProps): ReactNode {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  // `PANELS[0]` is statically known to exist, so the index is clamped rather
  // than defaulted: the compiler proves there is always a panel.
  const panel = PANELS[Math.min(step, PANELS.length - 1)] ?? PANELS[0];
  const last = step === PANELS.length - 1;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colours.canvas,
        paddingHorizontal: space.xl,
        paddingTop: space['3xl'],
        paddingBottom: space.xl,
        // Le titre et le panneau se suivent ; seules les actions vont en bas.
        // `space-between` sur trois blocs laissait un trou au milieu de l'écran.
        gap: space['2xl'],
      }}
      testID="welcome-screen"
    >
      <View style={{ gap: space.xs }}>
        <Text variant="overline" tone="brand" decorative>
          {translate('welcome.overline')}
        </Text>
        <Text variant="hero" decorative>
          {translate('welcome.title')}
        </Text>
      </View>

      {/*
        §5: one announcement per panel — the icon is decoration, the words are
        the message, and a screen reader hears them as one thing.
      */}
      <View
        accessible
        accessibilityLabel={`${translate(panel.title)}. ${translate(panel.body)}`}
        accessibilityRole="summary"
        style={{ gap: space.md }}
        testID={`welcome-panel-${String(step)}`}
      >
        <Icon name={panel.icon} size={40} colour={theme.colours.brand.fill} />
        <Text variant="title" decorative>
          {translate(panel.title)}
        </Text>
        <Text tone="muted" decorative>
          {translate(panel.body)}
        </Text>
      </View>

      {/* Pousse les actions en bas sans creuser le haut. */}
      <View style={{ flex: 1 }} />

      <View style={{ gap: space.md }}>
        {/*
          §15: never colour alone. The step is announced as a number, and the
          dots are decoration on top of it.
        */}
        <View
          accessible
          accessibilityLabel={translate('welcome.step', {
            current: step + 1,
            total: PANELS.length,
          })}
          style={{ flexDirection: 'row', gap: space.xs, justifyContent: 'center' }}
        >
          {PANELS.map((candidate, index) => (
            <View
              key={candidate.icon}
              style={{
                width: index === step ? space.lg : space.xs,
                height: space.xs,
                borderRadius: theme.radius.full,
                backgroundColor: index === step ? theme.colours.brand.fill : theme.colours.border,
              }}
            />
          ))}
        </View>

        <Button
          label={translate(last ? 'welcome.start' : 'welcome.next')}
          fullWidth
          onPress={() => {
            if (last) onDone();
            else setStep(step + 1);
          }}
          testID="welcome-next"
        />
        {!last && (
          <Button
            variant="ghost"
            label={translate('welcome.skip')}
            fullWidth
            onPress={onDone}
            testID="welcome-skip"
          />
        )}
      </View>
    </View>
  );
}
