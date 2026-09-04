import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { controlHeight, iconSize, space } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * The top of a screen one can come back from.
 *
 * A stack screen without a way back is a dead end on Android's gesture
 * navigation and a swipe nobody discovers on iOS — so the arrow is drawn
 * rather than assumed. §5: it is a labelled button, not a bare glyph, and the
 * title is the screen's heading, announced as one.
 *
 * `onBack` is optional so that a tab root — which has nowhere to go back to —
 * uses the same header without growing a lying arrow.
 */
export interface ScreenHeaderProps {
  title: string;
  onBack?: (() => void) | undefined;
  backLabel?: string | undefined;
  /** A single control on the right: an edit button, a menu. */
  action?: ReactNode | undefined;
  testID?: string | undefined;
}

export function ScreenHeader({
  title,
  onBack,
  backLabel = 'Retour',
  action,
  testID,
}: ScreenHeaderProps): ReactNode {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingHorizontal: space.sm,
        paddingVertical: space.xs,
        backgroundColor: theme.colours.canvas,
      }}
      testID={testID}
    >
      {onBack === undefined ? (
        <View style={{ width: controlHeight.md }} />
      ) : (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          testID={testID === undefined ? undefined : `${testID}-back`}
        >
          <Icon name="arrow-left" size={iconSize.md} colour={theme.colours.text} />
        </Pressable>
      )}

      <View accessible accessibilityRole="header" style={{ flex: 1 }}>
        {/* `section` et non `bodyStrong` : 17 pt au lieu de 15, assez pour que le
            titre ne se lise plus comme une ligne de contenu parmi d'autres. */}
        <Text variant="section" align="center" decorative numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/*
        Équilibre la flèche, action ou pas — à la largeur de sa **cible
        tactile**, pas de son dessin : §5 l'élargit à 44 points, et compenser
        24 laissait le titre décalé de vingt points vers la gauche.
      */}
      {action ?? <View style={{ width: controlHeight.md }} />}
    </View>
  );
}
