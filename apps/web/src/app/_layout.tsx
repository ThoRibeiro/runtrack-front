import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { RuntimeProvider, SessionProvider, createQueryClient } from '@runtrack/features';
import { ThemeProvider, ToastProvider } from '@runtrack/ui';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { runtime } from '../config/runtime';

/**
 * Root layout of the web shell.
 *
 * The same providers as the mobile shell, minus the status bar: a browser tab
 * has none. It stays a separate file because the two route trees diverge — the
 * web has no recorder (§2) and gains the public share pages.
 */
void SplashScreen.preventAutoHideAsync();

const queryClient = createQueryClient();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RuntimeProvider runtime={runtime}>
            <SessionProvider>
              <ThemeProvider>
                <ToastProvider>
                  <Stack screenOptions={{ headerShown: false }} />
                </ToastProvider>
              </ThemeProvider>
            </SessionProvider>
          </RuntimeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
