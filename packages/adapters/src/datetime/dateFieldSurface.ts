import type { ComponentType } from 'react';

/**
 * The React side of a date field, the way §8 does it for the map.
 *
 * A calendar is the one control no design system should draw itself: every
 * platform already ships one its users know — the iOS wheel, the Android
 * dialog, the browser's own picker — and each is reached through an API the
 * others have never heard of. So the *field* is the port, not just the popup:
 * on the web the calendar cannot be detached from its `<input type="date">`,
 * and a surface that only opened a popup would have nothing to open it from.
 *
 * The two implementations live behind separate entry points, for the same
 * reason the maps do: the web bundle must never pull in a native module, and
 * the mobile bundle has no use for a DOM input.
 */
export interface DateFieldColours {
  /** The field's own ground, and the text on it. */
  surface: string;
  text: string;
  /** Shown while nothing has been picked. */
  placeholder: string;
  border: string;
  /** Replaces the border once the value has been refused. */
  borderInvalid: string;
  /** The calendar glyph, and whatever chrome the platform's popup needs. */
  accent: string;
  /** Behind the popup, on iOS: the sheet is the only thing lit. */
  scrim: string;
}

/**
 * The measurements, handed over rather than written here.
 *
 * A lint rule forbids a literal `16` or `radius: 14` anywhere outside the token
 * module, and it is right to: a field that agrees with the rest of the form by
 * coincidence stops agreeing the first time a token moves. The adapter cannot
 * import the design system — it must stay usable without one — so the shell
 * reads the tokens and passes the numbers down, exactly as it does the colours.
 */
export interface DateFieldMetrics {
  height: number;
  paddingHorizontal: number;
  radius: number;
  borderWidth: number;
  borderWidthInvalid: number;
  fontSize: number;
  /** The rounded top of the iOS popup, and the air around its wheel. */
  popupRadius: number;
  popupPadding: number;
}

export interface DateFieldProps {
  /** An ISO day, `AAAA-MM-JJ`, or empty. Never a timestamp: a birth date has no hour. */
  value: string;
  onChange: (next: string) => void;
  /** Shown in the field while it is empty. */
  placeholder: string;
  /** What the value reads as once set — the shells format, the surface displays. */
  display: string;
  /** §5: the field is named even when the label above it is hidden. */
  accessibilityLabel: string;
  invalid?: boolean | undefined;
  colours: DateFieldColours;
  metrics: DateFieldMetrics;
  /** No date after today, ever: nobody was born tomorrow. */
  maximum?: string | undefined;
  testID?: string | undefined;
}

export type DateFieldSurface = ComponentType<DateFieldProps>;
