import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useControllableState } from '../a11y';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { controlHeight, iconSize, space } from '../tokens';
import type { FormFieldBinding } from './FormField';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

/**
 * A select that opens the reference's sheet rather than a platform picker: one
 * implementation for the three targets, and the same list semantics everywhere.
 */
export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  field: FormFieldBinding;
  options: readonly SelectOption<T>[];
  value?: T | undefined;
  defaultValue: T;
  onValueChange?: ((next: T) => void) | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}

export function Select<T extends string>({
  field,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Choisir',
  disabled = false,
  testID,
}: SelectProps<T>): ReactNode {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useControllableState<T>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const current = options.find((option) => option.value === selected);

  return (
    <>
      <Pressable
        onPress={() => {
          setOpen(true);
        }}
        disabled={disabled}
        accessibilityRole="combobox"
        accessibilityLabel={field.accessibilityLabel}
        accessibilityHint={field.accessibilityHint}
        accessibilityState={{ expanded: open }}
        enforceTouchTarget={false}
        testID={testID}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: controlHeight.md,
          paddingHorizontal: space.md,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colours.surfaceAlt,
          borderWidth: field.invalid ? theme.stroke.thick : theme.stroke.hairline,
          borderColor: field.invalid ? theme.colours.danger.text : theme.colours.borderStrong,
        }}
      >
        <Text tone={current === undefined ? 'muted' : 'default'} decorative>
          {current?.label ?? placeholder}
        </Text>
        <Icon name="chevron-down" size={iconSize.md} colour={theme.colours.textMuted} />
      </Pressable>

      <Sheet
        visible={open}
        onClose={() => {
          setOpen(false);
        }}
        title={field.accessibilityLabel}
        detents={[0.5]}
      >
        <View accessibilityRole="menu" style={{ gap: space.xxs }}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setSelected(option.value);
                setOpen(false);
              }}
              accessibilityRole="menuitem"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: option.value === selected }}
              enforceTouchTarget={false}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: controlHeight.md,
                paddingHorizontal: space.sm,
                borderRadius: theme.radius.sm,
              }}
            >
              <Text decorative>{option.label}</Text>
              {option.value === selected && (
                <Icon name="check" size={iconSize.md} colour={theme.colours.brand.fill} />
              )}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}
