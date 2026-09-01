import type { ReactNode } from 'react';
import { Modal as RNModal, View } from 'react-native';
import { useTheme } from '../theme';
import { space } from '../tokens';
import { Button } from './Button';
import { Text } from './Text';

/**
 * §5: the focus is trapped inside and handed back to whatever opened it when it
 * closes. React Native's `Modal` does both on native; on web,
 * `react-native-web` renders it with `aria-modal` and returns focus, which is
 * the behaviour the keyboard tests assert.
 *
 * The action pair is the reference's: outlined cancel on the left, filled
 * confirm on the right. It is a prop rather than free-form children so that no
 * screen invents a third arrangement.
 */
export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode | undefined;
  confirmLabel?: string | undefined;
  onConfirm?: (() => void) | undefined;
  cancelLabel?: string | undefined;
  destructive?: boolean | undefined;
  testID?: string | undefined;
}

export function Modal({
  visible,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Annuler',
  destructive = false,
  testID,
}: ModalProps): ReactNode {
  const theme = useTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: space.lg,
          backgroundColor: theme.colours.scrim,
        }}
      >
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          testID={testID}
          style={{
            gap: space.md,
            padding: space.lg,
            borderRadius: theme.radius.xl,
            backgroundColor: theme.colours.surface,
          }}
        >
          <Text variant="title">{title}</Text>
          {children}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              label={cancelLabel}
              variant="outline"
              onPress={onClose}
              style={{ flex: 1 }}
              testID={testID === undefined ? undefined : `${testID}-cancel`}
            />
            {confirmLabel !== undefined && (
              <Button
                label={confirmLabel}
                variant={destructive ? 'danger' : 'solid'}
                onPress={onConfirm}
                style={{ flex: 1 }}
                testID={testID === undefined ? undefined : `${testID}-confirm`}
              />
            )}
          </View>
        </View>
      </View>
    </RNModal>
  );
}
