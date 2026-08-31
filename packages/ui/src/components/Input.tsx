import type { ReactNode } from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useControllableState } from '../a11y';
import { useTheme } from '../theme';
import { controlHeight, iconSize, space } from '../tokens';
import type { FormFieldBinding } from './FormField';
import { Icon, type IconName } from './Icon';

/**
 * A single-line field. It takes its accessibility from the `FormField` around
 * it: the label, the error and the link between the two are that component's
 * job, not this one's.
 */
export interface InputProps {
  field: FormFieldBinding;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChangeText?: ((next: string) => void) | undefined;
  placeholder?: string | undefined;
  icon?: IconName | undefined;
  keyboardType?: KeyboardTypeOptions | undefined;
  secureTextEntry?: boolean | undefined;
  autoComplete?: 'email' | 'password' | 'new-password' | 'name' | 'off' | undefined;
  editable?: boolean | undefined;
  testID?: string | undefined;
}

export function Input({
  field,
  value,
  defaultValue = '',
  onChangeText,
  placeholder,
  icon,
  keyboardType = 'default',
  secureTextEntry = false,
  autoComplete = 'off',
  editable = true,
  testID,
}: InputProps): ReactNode {
  const theme = useTheme();
  const [text, setText] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onChangeText,
  });

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        minHeight: controlHeight.md,
        paddingHorizontal: space.md,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colours.surfaceAlt,
        // §5: a field outline carries meaning, so it meets 3:1 — and the error
        // state changes more than the colour, it changes the width too.
        borderWidth: field.invalid ? theme.stroke.thick : theme.stroke.hairline,
        borderColor: field.invalid ? theme.colours.danger.text : theme.colours.borderStrong,
      }}
    >
      {icon !== undefined && (
        <Icon name={icon} size={iconSize.md} colour={theme.colours.textMuted} />
      )}
      <TextInput
        nativeID={field.nativeID}
        accessibilityLabel={field.accessibilityLabel}
        accessibilityHint={field.accessibilityHint}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={theme.colours.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete}
        editable={editable}
        testID={testID}
        style={{
          flex: 1,
          paddingVertical: space.sm,
          fontSize: theme.typography.body.size,
          lineHeight: theme.typography.body.lineHeight,
          fontFamily: theme.typography.body.family,
          color: theme.colours.text,
        }}
      />
    </View>
  );
}
