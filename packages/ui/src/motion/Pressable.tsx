import { useCallback, useState, type ReactNode } from 'react';
import {
  Pressable as RNPressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useReduceMotion } from '../a11y';
import { MINIMUM_TOUCH_TARGET, pressScale, spring } from '../tokens';
import { useTheme } from '../theme';
import { playHaptic, type HapticKind } from './haptics';

/**
 * The only pressable in the application. §4 is explicit: no screen animates a
 * press by hand — twelve slightly different springs is what that produces.
 *
 * WHY NOT `GestureDetector` HERE, given §4 asks for gesture-handler: a
 * `Gesture.Tap()` runs entirely on the UI thread, which is better, but it is
 * not what VoiceOver and TalkBack activate, and it gives nothing to a keyboard
 * on the web. React Native's own `Pressable` carries the semantics — role,
 * focus, `onAccessibilityTap`, Enter and Space on web — and the *animation*
 * still runs on the UI thread, because it is a Reanimated shared value and
 * never React state. Gesture-handler is used where it earns its keep: the
 * sheet, which has to carry the velocity of the wrist that let it go.
 */
export interface PressableProps {
  children: ReactNode;
  onPress?: (() => void) | undefined;
  onLongPress?: (() => void) | undefined;
  disabled?: boolean | undefined;
  /** §4: haptics only where it means something. Silent by default. */
  haptic?: HapticKind | undefined;
  accessibilityLabel?: string | undefined;
  accessibilityHint?: string | undefined;
  accessibilityRole?: AccessibilityRole | undefined;
  accessibilityState?: {
    selected?: boolean | undefined;
    checked?: boolean | 'mixed' | undefined;
    expanded?: boolean | undefined;
    busy?: boolean | undefined;
  };
  /** Groups the children into a single announcement. On by default. */
  accessible?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  /** Off only when the parent already guarantees the 48 pt target. */
  enforceTouchTarget?: boolean | undefined;
  testID?: string | undefined;
}

export function Pressable({
  children,
  onPress,
  onLongPress,
  disabled = false,
  haptic = 'none',
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  accessible = true,
  style,
  enforceTouchTarget = true,
  testID,
}: PressableProps): ReactNode {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const [focused, setFocused] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const press = useCallback(() => {
    if (disabled) return;
    playHaptic(haptic);
    onPress?.();
  }, [disabled, haptic, onPress]);

  const shrink = useCallback(() => {
    scale.set(withSpring(reduceMotion ? 1 : pressScale, spring.snappy));
  }, [reduceMotion, scale]);

  const grow = useCallback(() => {
    scale.set(withSpring(1, spring.snappy));
  }, [scale]);

  return (
    <Animated.View style={animatedStyle}>
      <RNPressable
        onPress={press}
        onLongPress={onLongPress ?? undefined}
        onPressIn={shrink}
        onPressOut={grow}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        disabled={disabled}
        accessible={accessible}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ disabled, ...accessibilityState }}
        testID={testID}
        style={[
          enforceTouchTarget && styles.target,
          style,
          // §5: the focus indicator is never removed, it is replaced. On web an
          // invisible focus is a keyboard trap you cannot see your way out of.
          focused && { borderColor: theme.colours.focusRing, borderWidth: theme.stroke.thick },
        ]}
      >
        {children}
      </RNPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: MINIMUM_TOUCH_TARGET,
    minHeight: MINIMUM_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/** Re-exported so a screen never reaches for the raw `View` to build a row. */
export const Box = View;
