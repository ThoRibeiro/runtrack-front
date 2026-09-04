import type { ReactNode } from 'react';
import { FormField, controlHeight, radius, space, typography, useTheme } from '@runtrack/ui';
import { formatBirthDate } from '../../format';
import { useRuntime } from '../../runtime/RuntimeProvider';

/**
 * Une date, prise dans le calendrier de la plateforme.
 *
 * Le champ lui-même vient de la coque (§8, comme la carte) : ce composant ne
 * fait que l'habiller — le libellé, l'erreur, et les couleurs du thème, que
 * l'adaptateur ne peut pas connaître puisqu'il ne dépend pas du design system.
 */
export interface DateFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  error?: string | undefined;
  /** Le jour le plus tardif acceptable — par défaut aujourd'hui. */
  maximum?: string | undefined;
  testID?: string | undefined;
}

/** Aujourd'hui, en jour local : personne n'est né demain. */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${month}-${day}`;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder,
  error,
  maximum,
  testID,
}: DateFieldProps): ReactNode {
  const theme = useTheme();
  const Field = useRuntime().dateField;

  return (
    <FormField label={label} error={error} labelHidden>
      {(field) => (
        <Field
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          display={value === '' ? placeholder : formatBirthDate(value)}
          accessibilityLabel={field.accessibilityLabel}
          invalid={field.invalid}
          maximum={maximum ?? today()}
          colours={{
            surface: theme.colours.surface,
            text: theme.colours.text,
            placeholder: theme.colours.textMuted,
            border: theme.colours.border,
            borderInvalid: theme.colours.danger.solid,
            accent: theme.colours.brand.fill,
            scrim: theme.colours.scrim,
          }}
          metrics={{
            height: controlHeight.md,
            paddingHorizontal: space.md,
            radius: radius.md,
            borderWidth: theme.stroke.hairline,
            borderWidthInvalid: theme.stroke.thick,
            fontSize: typography.body.size,
            popupRadius: radius.sheet,
            popupPadding: space.md,
          }}
          testID={testID}
        />
      )}
    </FormField>
  );
}
