import { useEffect, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '../a11y';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { duration, iconSize, radius, space, spring, stroke } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** In-screen segmented control: abonnés / abonnements, semaine / mois / année. */
export interface TabsProps<T extends string> {
  options: readonly { value: T; label: string; icon?: IconName | undefined }[];
  value: T;
  onValueChange: (next: T) => void;
  /** Names the group for the screen reader: "Période". */
  label: string;
  /**
   * `pill` groups a handful of words; `underline` divides a page into views of
   * the same thing — a grid of runs and the same runs in detail.
   *
   * The distinction is not decorative. A pill floating above content reads as a
   * filter *applied to* what follows, and an underline anchored on a rule reads
   * as a section *of* it. Using the first for the second is what makes a screen
   * feel like a settings panel.
   */
  appearance?: 'pill' | 'underline' | undefined;
  testID?: string | undefined;
}

export function Tabs<T extends string>({
  options,
  value,
  onValueChange,
  label,
  appearance = 'pill',
  testID,
}: TabsProps<T>): ReactNode {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const underlined = appearance === 'underline';

  const padding = underlined ? 0 : space.xxs;
  const gap = underlined ? 0 : space.xxs;

  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const slotWidth =
    options.length === 0 ? 0 : (width - 2 * padding - (options.length - 1) * gap) / options.length;

  /**
   * The selection slides rather than jumps.
   *
   * §4 puts the movement in the design system and not in the screens, and this
   * is the reason it earns its place here: a marker that travels says *which
   * way* the choice moved, where one that blinks from one word to another only
   * says that something changed. What travels is the marker alone — the labels
   * never move, so nothing has to be read while it is in flight.
   *
   * Reduce Motion does not remove it, it shortens it to nothing: the marker is
   * still where the selection is, it simply gets there without crossing.
   */
  const offset = useSharedValue(0);

  useEffect(() => {
    const target = index * (slotWidth + gap);
    offset.set(
      reduceMotion
        ? withTiming(target, { duration: duration.fast })
        : withSpring(target, spring.snappy),
    );
  }, [index, slotWidth, gap, reduceMotion, offset]);

  const markerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      testID={testID}
      onLayout={(event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
      }}
      style={
        underlined
          ? {
              flexDirection: 'row',
              borderTopWidth: stroke.hairline,
              borderTopColor: theme.colours.border,
            }
          : {
              flexDirection: 'row',
              gap,
              padding,
              borderRadius: radius.full,
              backgroundColor: theme.colours.surfaceAlt,
            }
      }
    >
      {/*
        Décoratif au sens strict : l'état sélectionné est porté par
        `accessibilityState` sur l'onglet, jamais par ce qui se voit. Tant que la
        largeur n'est pas mesurée il n'y a rien à placer, et le poser à zéro le
        ferait partir du bord gauche à la première image.
      */}
      {width > 0 && (
        <Animated.View
          aria-hidden
          pointerEvents="none"
          style={[
            underlined
              ? {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: slotWidth,
                  height: stroke.thick,
                  backgroundColor: theme.colours.text,
                }
              : {
                  position: 'absolute',
                  top: padding,
                  bottom: padding,
                  left: padding,
                  width: slotWidth,
                  borderRadius: radius.full,
                  backgroundColor: theme.colours.surface,
                },
            markerStyle,
          ]}
        />
      )}

      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              onValueChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            enforceTouchTarget={false}
            style={
              underlined
                ? {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: space['3xl'],
                    paddingVertical: space.sm,
                  }
                : {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: space['3xl'],
                    paddingHorizontal: space.sm,
                    borderRadius: radius.full,
                  }
            }
          >
            {/*
              The icon replaces the word on screen and never for the screen
              reader: the tab keeps its `accessibilityLabel`, so "Grille" is
              still what gets announced.
            */}
            {option.icon === undefined ? (
              <Text variant="caption" tone={active ? 'default' : 'muted'} decorative>
                {option.label}
              </Text>
            ) : (
              <Icon
                name={option.icon}
                size={iconSize.lg}
                colour={active ? theme.colours.text : theme.colours.textMuted}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
