import type { ReactNode } from 'react';
import { TextInput } from 'react-native';
import { useControllableState } from '../a11y';
import { useTheme } from '../theme';
import { space } from '../tokens';
import type { FormFieldBinding } from './FormField';

/**
 * `minHeight`, never `height`: §5 requires the layout to survive 200 % text,
 * and a fixed box around text is the first thing that breaks.
 */
export interface TextAreaProps {
  field: FormFieldBinding;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChangeText?: ((next: string) => void) | undefined;
  placeholder?: string | undefined;
  minimumLines?: number | undefined;
  maximumLength?: number | undefined;
  testID?: string | undefined;
}

export function TextArea({
  field,
  value,
  defaultValue = '',
  onChangeText,
  placeholder,
  minimumLines = 4,
  maximumLength,
  testID,
}: TextAreaProps): ReactNode {
  const theme = useTheme();
  const [text, setText] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onChangeText,
  });

  return (
    <TextInput
      nativeID={field.nativeID}
      accessibilityLabel={field.accessibilityLabel}
      accessibilityHint={field.accessibilityHint}
      value={text}
      onChangeText={setText}
      placeholder={placeholder}
      placeholderTextColor={theme.colours.textMuted}
      multiline
      textAlignVertical="top"
      maxLength={maximumLength}
      testID={testID}
      style={{
        minHeight: theme.typography.body.lineHeight * minimumLines + space.xl,
        padding: space.md,
        borderRadius: theme.radius.xs,
        backgroundColor: theme.colours.surfaceAlt,
        borderWidth: field.invalid ? theme.stroke.thick : theme.stroke.hairline,
        borderColor: field.invalid ? theme.colours.danger.text : theme.colours.borderStrong,
        fontSize: theme.typography.body.size,
        lineHeight: theme.typography.body.lineHeight,
        fontFamily: theme.typography.body.family,
        color: theme.colours.text,
      }}
    />
  );
}
