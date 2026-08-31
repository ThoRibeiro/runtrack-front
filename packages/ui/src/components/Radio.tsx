import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { radius, space } from '../tokens';
import type { FormFieldBinding } from './FormField';
import { Text } from './Text';

const OUTER = 24;
const INNER = 12;

/**
 * A radio group, never a lone radio: a single radio button is meaningless, and
 * a screen reader needs the group to say "1 sur 3".
 */
export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

export interface RadioGroupProps<T extends string> {
  field: FormFieldBinding;
  options: readonly RadioOption<T>[];
  value: T;
  onValueChange: (next: T) => void;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}

export function RadioGroup<T extends string>({
  field,
  options,
  value,
  onValueChange,
  disabled = false,
  testID,
}: RadioGroupProps<T>): ReactNode {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={field.accessibilityLabel}
      accessibilityHint={field.accessibilityHint}
      testID={testID}
      style={{ gap: space.xs }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              onValueChange(option.value);
            }}
            disabled={disabled}
            haptic="light"
            accessibilityRole="radio"
            accessibilityLabel={`${option.label}, ${String(index + 1)} sur ${String(options.length)}`}
            accessibilityState={{ checked: selected }}
            enforceTouchTarget={false}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              minHeight: space['3xl'],
              opacity: disabled ? 0.45 : 1,
            }}
          >
            <View
              style={{
                width: OUTER,
                height: OUTER,
                borderRadius: radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: theme.stroke.thick,
                borderColor: selected ? theme.colours.brand.fill : theme.colours.borderStrong,
              }}
            >
              {selected && (
                <View
                  style={{
                    width: INNER,
                    height: INNER,
                    borderRadius: radius.full,
                    backgroundColor: theme.colours.brand.fill,
                  }}
                />
              )}
            </View>
            <Text decorative>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
