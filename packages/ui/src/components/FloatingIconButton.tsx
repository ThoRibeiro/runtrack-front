import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { controlHeight, iconSize, radius } from '../tokens';
import { Icon, type IconName } from './Icon';

/**
 * The round translucent button that floats over a photo or a map — the back
 * arrow and the menu on the activity screen.
 *
 * §15 names it: an icon-only button without `accessibilityLabel` is forbidden,
 * so the prop is required. There is no default: "bouton" is what the screen
 * reader says without it, and the screen becomes a guessing game.
 */
export interface FloatingIconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: (() => void) | undefined;
  testID?: string | undefined;
}

export function FloatingIconButton({
  icon,
  accessibilityLabel,
  onPress,
  testID,
}: FloatingIconButtonProps): ReactNode {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      enforceTouchTarget={false}
      testID={testID}
    >
      <View
        style={{
          width: controlHeight.md,
          height: controlHeight.md,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colours.glass,
        }}
      >
        <Icon name={icon} size={iconSize.lg} colour={theme.colours.text} />
      </View>
    </Pressable>
  );
}
