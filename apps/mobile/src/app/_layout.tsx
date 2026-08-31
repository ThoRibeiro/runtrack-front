import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/**
 * Root layout of the mobile shell.
 *
 * Navigation is a plain native stack for now. The tab bar of §3, the recording
 * screen's own dark theme and the deep links of §11 all attach here, and this
 * file stays the single place where that happens.
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
