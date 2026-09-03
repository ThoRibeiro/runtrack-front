import { useRef, useEffect, createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { iconSize, space } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * §5: "aucune action à durée limitée sans possibilité de prolonger" and "un
 * toast porteur d'information reste atteignable autrement". So a toast here is
 * a confirmation of something that already happened — never the only place a
 * piece of information exists — and it is announced politely rather than
 * interrupting whatever the screen reader is saying.
 */
export type ToastTone = 'info' | 'success' | 'danger';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const ICONS: Record<ToastTone, IconName> = {
  info: 'info',
  success: 'check',
  danger: 'alert-circle',
};

/**
 * Cinq secondes : le temps de lire une phrase courte sans avoir à la chasser.
 *
 * Il n'y en avait aucun : le message restait à l'écran jusqu'au démontage de
 * l'application, et recouvrait la barre d'onglets.
 */
const TOAST_LIFETIME_MILLIS = 5_000;

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const theme = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = `${String(Date.now())}-${message}`;
      setToasts((current) => [...current, { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => {
          dismiss(id);
        }, TOAST_LIFETIME_MILLIS),
      );
    },
    [dismiss],
  );

  // Une minuterie qui survit à l'écran est une fuite : elle réveille un état
  // démonté, et fait traîner les tests bien après leur dernière assertion.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  const surface: Record<ToastTone, string> = {
    info: theme.colours.info.surface,
    success: theme.colours.success.surface,
    danger: theme.colours.danger.surface,
  };
  const foreground: Record<ToastTone, string> = {
    info: theme.colours.info.text,
    success: theme.colours.success.text,
    danger: theme.colours.danger.text,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        // `pointerEvents` en style, pas en prop : la prop est dépréciée et le
        // web s'en plaint à chaque montage.
        // En haut : en bas, le message se posait sur la barre d'onglets et sur
        // les commandes de course — ce qu'il annonce ne vaut pas de cacher ce
        // sur quoi on est en train d'appuyer.
        style={{
          position: 'absolute',
          left: space.md,
          right: space.md,
          top: space['3xl'],
          gap: space.xs,
          pointerEvents: 'box-none',
        }}
      >
        {toasts.map((toast) => (
          <Animated.View
            key={toast.id}
            entering={FadeInUp}
            exiting={FadeOutUp}
            accessibilityLiveRegion="polite"
            accessible
            accessibilityLabel={toast.message}
            onAccessibilityTap={() => {
              dismiss(toast.id);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs,
              padding: space.sm,
              borderRadius: theme.radius.md,
              backgroundColor: surface[toast.tone],
            }}
          >
            <Icon name={ICONS[toast.tone]} size={iconSize.md} colour={foreground[toast.tone]} />
            <Text variant="body" tone={toast.tone === 'info' ? 'info' : toast.tone} decorative>
              {toast.message}
            </Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}
