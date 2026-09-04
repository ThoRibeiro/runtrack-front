import { useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { DateFieldProps } from '../dateFieldSurface';

/**
 * The platform's own calendar: the iOS wheel, the Android dialog.
 *
 * The paperwork is the point, and it is all here so that no screen carries it:
 *
 *  - **Android opens, iOS mounts.** `DateTimePickerAndroid.open()` is a call,
 *    not a component; mounting `<DateTimePicker>` on Android opens a *second*
 *    dialog behind the first. They are genuinely two APIs, and pretending
 *    otherwise is what leaves an invisible picker stuck on the screen;
 *  - **iOS needs chrome of its own.** The wheel is an inline view with no
 *    dismissal, so it sits in a modal with a way out. Android's dialog brings
 *    its own, and adding one there would leave an empty sheet behind it;
 *  - **the value is a day, not an instant.** It is built and read at local
 *    noon: at midnight, a device an hour east of UTC rolls the date back by
 *    one, and a birthday quietly becomes the day before.
 */
const NOON = 12;

function toDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return new Date();
  return new Date(year, month - 1, day, NOON);
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(date.getFullYear())}-${month}-${day}`;
}

export function NativeDateField({
  value,
  onChange,
  placeholder,
  display,
  accessibilityLabel,
  invalid = false,
  colours,
  metrics,
  maximum,
  testID,
}: DateFieldProps): ReactNode {
  const [visible, setVisible] = useState(false);
  const current = value === '' ? new Date() : toDate(value);
  const maximumDate = maximum === undefined ? new Date() : toDate(maximum);

  const open = (): void => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        maximumDate,
        mode: 'date',
        onValueChange: (_event, picked) => {
          onChange(toIso(picked));
        },
      });
      return;
    }
    setVisible(true);
  };

  return (
    <>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={value === '' ? undefined : { text: display }}
        testID={testID}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: metrics.height,
          paddingHorizontal: metrics.paddingHorizontal,
          borderRadius: metrics.radius,
          borderWidth: invalid ? metrics.borderWidthInvalid : metrics.borderWidth,
          borderColor: invalid ? colours.borderInvalid : colours.border,
          backgroundColor: colours.surface,
        }}
      >
        <Text
          style={{
            color: value === '' ? colours.placeholder : colours.text,
            fontSize: metrics.fontSize,
          }}
        >
          {value === '' ? placeholder : display}
        </Text>
      </Pressable>

      {visible && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => {
            setVisible(false);
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={() => {
              setVisible(false);
            }}
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colours.scrim }}
          >
            <View
              style={{
                backgroundColor: colours.surface,
                padding: metrics.popupPadding,
                borderTopLeftRadius: metrics.popupRadius,
                borderTopRightRadius: metrics.popupRadius,
              }}
            >
              <DateTimePicker
                value={current}
                maximumDate={maximumDate}
                mode="date"
                display="spinner"
                locale="fr-FR"
                onValueChange={(_event, picked) => {
                  onChange(toIso(picked));
                }}
                testID={testID === undefined ? undefined : `${testID}-picker`}
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}
