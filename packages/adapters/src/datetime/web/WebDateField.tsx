import type { ReactNode } from 'react';
import type { DateFieldProps } from '../dateFieldSurface';

/**
 * The browser's own calendar, which is an `<input type="date">` and nothing
 * else — its picker cannot be detached from it, so on the web the whole field
 * is the input rather than a button that opens something.
 *
 * Plain DOM in a React Native workspace looks wrong and is not: this module is
 * only ever bundled for the web shell, where `react-native-web` renders DOM
 * anyway. The alternative is drawing a calendar by hand and shipping it to a
 * platform that already has a better one, translated and keyboard-navigable.
 *
 * `display` is ignored here on purpose: the browser formats the value in the
 * reader's own locale, and overriding that would make the field disagree with
 * the picker that fills it.
 */
export function WebDateField({
  value,
  onChange,
  accessibilityLabel,
  invalid = false,
  colours,
  metrics,
  maximum,
  testID,
}: DateFieldProps): ReactNode {
  return (
    <input
      type="date"
      value={value}
      max={maximum}
      aria-label={accessibilityLabel}
      aria-invalid={invalid}
      data-testid={testID}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      style={{
        minHeight: metrics.height,
        padding: `0 ${String(metrics.paddingHorizontal)}px`,
        borderRadius: metrics.radius,
        borderWidth: invalid ? metrics.borderWidthInvalid : metrics.borderWidth,
        borderStyle: 'solid',
        borderColor: invalid ? colours.borderInvalid : colours.border,
        backgroundColor: colours.surface,
        color: value === '' ? colours.placeholder : colours.text,
        colorScheme: 'light dark',
        fontSize: metrics.fontSize,
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
}
