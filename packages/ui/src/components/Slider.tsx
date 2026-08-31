import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useControllableState } from '../a11y';
import { useTheme } from '../theme';
import { controlHeight, radius, space, stroke } from '../tokens';
import type { FormFieldBinding } from './FormField';

const THUMB = 28;

/**
 * §5: a slider is `adjustable` — VoiceOver and TalkBack change it with a swipe
 * up or down, and they need `accessibilityValue` to say what they changed it
 * to. Without the increment/decrement actions it is a control only a mouse can
 * use.
 *
 * The drag runs in a worklet: the thumb keeps up even when the JS thread is
 * busy parsing an SSE stream.
 */
export interface SliderProps {
  field: FormFieldBinding;
  minimum: number;
  maximum: number;
  step?: number | undefined;
  value?: number | undefined;
  defaultValue: number;
  onValueChange?: ((next: number) => void) | undefined;
  /** Spoken value: "8 minutes 30 par kilomètre" rather than "8.5". */
  formatValue?: (value: number) => string;
  testID?: string | undefined;
}

export function Slider({
  field,
  minimum,
  maximum,
  step = 1,
  value,
  defaultValue,
  onValueChange,
  formatValue,
  testID,
}: SliderProps): ReactNode {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [current, setCurrent] = useControllableState<number>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const trackWidth = useSharedValue(0);

  const clamp = (next: number): number =>
    Math.min(maximum, Math.max(minimum, Math.round(next / step) * step));

  const setFromPosition = (x: number): void => {
    if (width === 0) return;
    setCurrent(clamp(minimum + (x / width) * (maximum - minimum)));
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      const clamped = Math.min(trackWidth.get(), Math.max(0, event.x));
      scheduleOnRN(setFromPosition, clamped);
    })
    .onBegin((event) => {
      const clamped = Math.min(trackWidth.get(), Math.max(0, event.x));
      scheduleOnRN(setFromPosition, clamped);
    });

  const ratio = maximum === minimum ? 0 : (current - minimum) / (maximum - minimum);
  const thumbStyle = useAnimatedStyle(() => ({ left: 0 }));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={field.accessibilityLabel}
        accessibilityHint={field.accessibilityHint}
        accessibilityValue={{
          min: minimum,
          max: maximum,
          now: current,
          text: formatValue?.(current) ?? String(current),
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
          setCurrent(clamp(current + delta));
        }}
        onLayout={(event: LayoutChangeEvent) => {
          const measured = event.nativeEvent.layout.width;
          setWidth(measured);
          trackWidth.set(measured);
        }}
        testID={testID}
        style={{ minHeight: controlHeight.md, justifyContent: 'center' }}
      >
        <View
          style={{
            height: stroke.thick * 3,
            borderRadius: radius.full,
            backgroundColor: theme.colours.surfaceAlt,
            borderWidth: theme.stroke.hairline,
            borderColor: theme.colours.borderStrong,
          }}
        >
          <View
            style={{
              width: width * ratio,
              height: '100%',
              borderRadius: radius.full,
              backgroundColor: theme.colours.brand.fill,
            }}
          />
        </View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              marginLeft: ratio * Math.max(0, width - THUMB),
              width: THUMB,
              height: THUMB,
              borderRadius: radius.full,
              backgroundColor: theme.colours.surface,
              borderWidth: theme.stroke.thick,
              borderColor: theme.colours.brand.fill,
            },
            thumbStyle,
          ]}
        />
        <View style={{ height: space.xxs }} />
      </View>
    </GestureDetector>
  );
}
