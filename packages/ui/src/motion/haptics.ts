import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * §4: haptics on what matters — starting and finishing an activity, passing a
 * kilometre, a like. Nowhere else. A phone that buzzes constantly gets turned
 * off, and the feedback that mattered goes with it.
 */
export type HapticKind = 'none' | 'light' | 'medium' | 'success' | 'warning';

export function playHaptic(kind: HapticKind): void {
  if (kind === 'none' || Platform.OS === 'web') return;

  switch (kind) {
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
  }
}
