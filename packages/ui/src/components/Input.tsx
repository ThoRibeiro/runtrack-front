import type { ReactNode } from 'react';
import { Platform, TextInput, View, type KeyboardTypeOptions } from 'react-native';
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
  /**
   * The HTML autofill tokens, spelled as HTML spells them.
   *
   * `'password'` is **not** one of them — axe reports it as an invalid
   * autocomplete attribute, and a password manager does not know what to do
   * with it. The value for a sign-in field is `current-password`; for a new
   * one, `new-password`. React Native maps both onto its own vocabulary.
   */
  autoComplete?:
    'email' | 'username' | 'current-password' | 'new-password' | 'name' | 'off' | undefined;
  editable?: boolean | undefined;
  /**
   * `bare` retire le fond et le cadre : le champ vit alors dans un conteneur
   * qui les porte déjà — une bulle de commentaire, une barre de recherche.
   * Deux cadres emboîtés se lisent comme un défaut d'alignement.
   */
  variant?: 'filled' | 'bare' | undefined;
  testID?: string | undefined;
}

/**
 * Fields whose value is an identifier, not prose.
 *
 * iOS capitalises the first letter and autocorrects what it takes for a
 * misspelling — which is how `thomas@exemple.fr` becomes `Thomas@exemple.fr`,
 * and how a corrected word arrives with a trailing space. The server normalises
 * the address anyway, but the person typing should not have to notice.
 */
const VERBATIM_FIELDS: ReadonlySet<string> = new Set([
  'email',
  'username',
  'current-password',
  'new-password',
]);

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
  variant = 'filled',
  testID,
}: InputProps): ReactNode {
  const verbatim = VERBATIM_FIELDS.has(autoComplete);
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
        ...(variant === 'bare'
          ? { flex: 1 }
          : {
              paddingHorizontal: space.md,
              borderRadius: theme.radius.xs,
              backgroundColor: theme.colours.surfaceAlt,
              // §5: a field outline carries meaning, so it meets 3:1 — and the
              // error state changes more than the colour, it changes the width.
              borderWidth: field.invalid ? theme.stroke.thick : theme.stroke.hairline,
              borderColor: field.invalid ? theme.colours.danger.text : theme.colours.borderStrong,
            }),
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
        autoCapitalize={verbatim ? 'none' : 'sentences'}
        autoCorrect={!verbatim}
        editable={editable}
        testID={testID}
        style={{
          flex: 1,
          paddingVertical: space.sm,
          fontSize: theme.typography.body.size,
          // iOS clips the ascenders and descenders of an *editing* field when
          // the line height is set: UIKit lays the glyphs out itself once the
          // field has focus, and the two disagree. Android and the web need it
          // to match the rest of the type scale, so only iOS goes without.
          ...Platform.select({
            ios: {},
            default: { lineHeight: theme.typography.body.lineHeight },
          }),
          fontFamily: theme.typography.body.family,
          color: theme.colours.text,
        }}
      />
    </View>
  );
}
