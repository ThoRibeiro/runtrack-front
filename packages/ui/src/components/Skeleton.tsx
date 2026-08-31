import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../a11y';
import { useTheme } from '../theme';
import { duration, radius } from '../tokens';

/**
 * §4/§15: no layout shift when the skeleton gives way to the content. The
 * dimensions are required for that reason — a skeleton that does not know how
 * big the content will be cannot reserve its place, and the page jumps.
 *
 * The pulse runs on the UI thread and stops entirely under `Reduce Motion`:
 * this one is decoration, so it is removed rather than replaced.
 */
export interface SkeletonProps {
  width: DimensionValue;
  height: number;
  rounded?: 'sm' | 'md' | 'full' | undefined;
  testID?: string | undefined;
}

export function Skeleton({ width, height, rounded = 'sm', testID }: SkeletonProps): ReactNode {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(0);
      return;
    }
    progress.set(withRepeat(withTiming(1, { duration: duration.slow * 2 }), -1, true));
  }, [progress, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: 0.6 + progress.get() * 0.4 }));

  return (
    <View
      // The wait is announced once, by the screen, not by every grey block.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={{ width, height }}
    >
      <Animated.View
        style={[
          {
            width: '100%',
            height: '100%',
            borderRadius: rounded === 'full' ? radius.full : theme.radius[rounded],
            backgroundColor: theme.colours.skeleton.base,
          },
          animated,
        ]}
      />
    </View>
  );
}
