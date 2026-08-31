import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useControllableState, useReduceMotion } from '../a11y';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { radius, space, spring } from '../tokens';
import type { FormFieldBinding } from './FormField';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB = 26;

/**
 * `field` is required, and its type can only come from `FormField`. That is how
 * §3's "jamais en standalone" is enforced rather than hoped for.
 */
export interface SwitchProps {
  field: FormFieldBinding;
  value?: boolean | undefined;
  defaultValue?: boolean | undefined;
  onValueChange?: ((next: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}

export function Switch({
  field,
  value,
  defaultValue = false,
  onValueChange,
  disabled = false,
  testID,
}: SwitchProps): ReactNode {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [on, setOn] = useControllableState<boolean>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const thumbStyle = useAnimatedStyle(() => {
    const target = on ? TRACK_WIDTH - THUMB - space.xxs / 2 : space.xxs / 2;
    return {
      transform: [{ translateX: reduceMotion ? target : withSpring(target, spring.snappy) }],
    };
  });

  return (
    <Pressable
      onPress={() => {
        setOn(!on);
      }}
      disabled={disabled}
      haptic="light"
      accessibilityRole="switch"
      accessibilityLabel={field.accessibilityLabel}
      accessibilityHint={field.accessibilityHint}
      accessibilityState={{ checked: on }}
      enforceTouchTarget
      testID={testID}
      style={{ alignSelf: 'flex-start' }}
    >
      <View
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: radius.full,
          justifyContent: 'center',
          backgroundColor: on ? theme.colours.brand.fill : theme.colours.borderStrong,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Animated.View
          style={[
            {
              width: THUMB,
              height: THUMB,
              borderRadius: radius.full,
              backgroundColor: theme.colours.surface,
            },
            thumbStyle,
          ]}
        />
      </View>
    </Pressable>
  );
}
