import { useId, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { iconSize, space } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * The molecule §3 makes mandatory: `Radio`, `Checkbox` and `Switch` are never
 * used on their own, because a bare atom produces a form a screen reader cannot
 * read — it announces "switch, on" and nothing about what is being switched.
 *
 * The rule is enforced by the type system rather than by discipline. The
 * binding below carries a brand that only this component can produce, so a
 * `<Switch />` outside a `<FormField>` does not compile.
 */
/** Not exported: this is what makes the binding impossible to forge. */
const bound: unique symbol = Symbol('FormFieldBinding');

export interface FormFieldBinding {
  readonly [bound]: true;
  /** Built from the label, the required flag and the error. */
  accessibilityLabel: string;
  accessibilityHint: string | undefined;
  invalid: boolean;
  nativeID: string;
}

export interface FormFieldProps {
  label: string;
  children: (binding: FormFieldBinding) => ReactNode;
  hint?: string | undefined;
  /** Shown, announced, and attached to the field it concerns. */
  error?: string | undefined;
  required?: boolean | undefined;
  testID?: string | undefined;
}

export function FormField({
  label,
  children,
  hint,
  error,
  required = false,
  testID,
}: FormFieldProps): ReactNode {
  const theme = useTheme();
  const nativeID = useId();

  const binding: FormFieldBinding = {
    [bound]: true,
    accessibilityLabel: required ? `${label}, obligatoire` : label,
    accessibilityHint: error ?? hint,
    invalid: error !== undefined,
    nativeID,
  };

  return (
    <View style={{ gap: space.xs }} testID={testID}>
      <Text variant="caption" tone="muted" decorative>
        {required ? `${label} *` : label}
      </Text>

      {children(binding)}

      {error !== undefined && (
        <View
          // §5: an error is announced when it appears, not only when the field
          // is focused again. `accessible` matters as much as the live region:
          // without it the region has nothing to read out.
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={error}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}
        >
          {/* §15: never carried by colour alone — the icon says it too. */}
          <Icon name="alert-circle" size={iconSize.sm} colour={theme.colours.danger.text} />
          <Text variant="caption" tone="danger" decorative>
            {error}
          </Text>
        </View>
      )}

      {error === undefined && hint !== undefined && (
        <Text variant="caption" tone="muted" decorative>
          {hint}
        </Text>
      )}
    </View>
  );
}
