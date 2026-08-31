import { View } from 'react-native';

/**
 * Lot 1 boots on an empty screen on purpose: no screen is written before the
 * design system exists (§3).
 */
export default function HomeRoute() {
  return <View style={{ flex: 1 }} />;
}
