import { Stack } from 'expo-router';

/**
 * Root layout of the web shell.
 *
 * It is deliberately a separate file from the mobile one: the web shell has no
 * recorder (§2) and gains the public share pages, so the two route trees
 * diverge by construction rather than by a runtime `Platform.OS` check that
 * would still ship the recorder in the web bundle.
 */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
