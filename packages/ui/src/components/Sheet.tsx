import { useCallback, type ReactNode } from 'react';
import { Modal, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotion } from '../a11y';
import { useTheme } from '../theme';
import { duration, radius, space, spring } from '../tokens';
import { Text } from './Text';

/**
 * The sliding panel of the reference, and the one place gesture-handler earns
 * its keep (§4).
 *
 * Two things make it feel like it is listening. The gesture *interrupts* the
 * animation — the pan reads the current position rather than waiting for the
 * spring to finish — and the release *carries the velocity*: a panel let go
 * halfway finishes in the direction of the wrist, not towards the nearest
 * point. Both live in worklets, so neither depends on a free JS thread.
 *
 * It renders inside a native `Modal` so that VoiceOver and TalkBack stop seeing
 * the screen behind it. A sheet drawn as a sibling view is still reachable by
 * the screen reader, and that is a trap you cannot swipe your way out of.
 */
const DISMISS_VELOCITY = 900;

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string | undefined;
  /** Fractions of the screen height, smallest first. Defaults to one detent. */
  detents?: readonly number[] | undefined;
  testID?: string | undefined;
}

export function Sheet({
  visible,
  onClose,
  children,
  title,
  detents = [0.5],
  testID,
}: SheetProps): ReactNode {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { height: screenHeight } = useWindowDimensions();

  const stops = [...detents].sort((a, b) => a - b).map((fraction) => screenHeight * (1 - fraction));
  const lowest = stops[stops.length - 1] ?? screenHeight * 0.5;
  const highest = stops[0] ?? lowest;

  const translateY = useSharedValue(lowest);
  const startY = useSharedValue(lowest);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      // Reading the live value is what makes the animation interruptible: the
      // finger takes over wherever the spring happens to be.
      startY.set(translateY.get());
    })
    .onUpdate((event) => {
      translateY.set(Math.max(highest, startY.get() + event.translationY));
    })
    .onEnd((event) => {
      const projected = translateY.get() + event.velocityY * 0.15;

      if (event.velocityY > DISMISS_VELOCITY || projected > screenHeight * 0.85) {
        translateY.set(withTiming(screenHeight, { duration: duration.base }));
        scheduleOnRN(close);
        return;
      }

      const nearest = stops.reduce((best, stop) =>
        Math.abs(stop - projected) < Math.abs(best - projected) ? stop : best,
      );
      translateY.set(withSpring(nearest, { ...spring.sheet, velocity: event.velocityY }));
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={close}
      testID={testID}
    >
      <View style={{ flex: 1, backgroundColor: theme.colours.scrim }}>
        <Animated.View
          accessibilityViewIsModal
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              height: screenHeight,
              paddingTop: space.sm,
              paddingHorizontal: space.md,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              backgroundColor: theme.colours.surface,
            },
            theme.elevation.sheet,
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={{ paddingVertical: space.xs, alignItems: 'center' }}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  width: space['3xl'],
                  height: theme.stroke.thick * 2,
                  borderRadius: radius.full,
                  backgroundColor: theme.colours.border,
                }}
              />
            </View>
          </GestureDetector>

          {title !== undefined && (
            <Text variant="title" style={{ marginBottom: space.sm }}>
              {title}
            </Text>
          )}

          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
