import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  NotificationStreamProvider,
  OfflineProvider,
  RuntimeProvider,
  SessionProvider,
  createQueryClient,
} from '@runtrack/features';
import { ThemeProvider, ToastProvider } from '@runtrack/ui';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { persister } from '../config/persistence';
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
        <RuntimeProvider runtime={runtime}>
          {/*
            §9 : le cache persistant et l'état de connexion. Le runtime d'abord —
            c'est lui qui porte le moniteur réseau que ce fournisseur branche sur
            TanStack Query.
          */}
          <OfflineProvider client={queryClient} persister={persister}>
            <SessionProvider>
              {/*
                §12 : le web reçoit le flux de notifications comme le mobile. Ce
                qu'il n'a pas, c'est le push : pas de jeton, donc pas de
                `PushRegistry` dans son runtime.
              */}
              <NotificationStreamProvider>
                <ThemeProvider>
                  <ToastProvider>
                    <Stack screenOptions={{ headerShown: false }} />
                  </ToastProvider>
                </ThemeProvider>
              </NotificationStreamProvider>
            </SessionProvider>
          </OfflineProvider>
        </RuntimeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
