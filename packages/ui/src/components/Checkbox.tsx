import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useControllableState } from '../a11y';
import { Pressable } from '../motion';
import { useTheme } from '../theme';
import { iconSize } from '../tokens';
import type { FormFieldBinding } from './FormField';
import { Icon } from './Icon';

const BOX = 24;

/** Never standalone: `field` comes from `FormField` and nowhere else. */
export interface CheckboxProps {
  field: FormFieldBinding;
  value?: boolean | undefined;
  defaultValue?: boolean | undefined;
  onValueChange?: ((next: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}

export function Checkbox({
  field,
  value,
  defaultValue = false,
  onValueChange,
  disabled = false,
  testID,
}: CheckboxProps): ReactNode {
  const theme = useTheme();
  const [checked, setChecked] = useControllableState<boolean>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  return (
    <Pressable
      onPress={() => {
        setChecked(!checked);
      }}
      disabled={disabled}
      haptic="light"
      accessibilityRole="checkbox"
      accessibilityLabel={field.accessibilityLabel}
      accessibilityHint={field.accessibilityHint}
      accessibilityState={{ checked }}
      testID={testID}
      style={{ alignSelf: 'flex-start' }}
    >
      <View
        style={{
          width: BOX,
          height: BOX,
          borderRadius: theme.radius.xs,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? theme.colours.brand.fill : 'transparent',
          borderWidth: theme.stroke.thick,
          borderColor: checked ? theme.colours.brand.fill : theme.colours.borderStrong,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {checked && <Icon name="check" size={iconSize.sm} colour={theme.colours.brand.onFill} />}
      </View>
    </Pressable>
  );
}
