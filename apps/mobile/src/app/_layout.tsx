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
import { RecordingProvider } from '@runtrack/features/recording';
import { PushLinks } from '../config/pushLinks';
import { ThemeProvider, ToastProvider } from '@runtrack/ui';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { persister } from '../config/persistence';
import { runtime } from '../config/runtime';

/**
 * Root layout of the mobile shell.
 *
 * Everything the application needs is mounted here, once, and in an order that
 * matters: the query client and the runtime before the session provider, which
 * reads the Keychain the moment it mounts.
 *
 * The splash screen stays up until the typeface is loaded, because swapping the
 * face after first paint reflows every screen — the layout shift §15 forbids,
 * at start-up.
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
                §6: mounted here, above the router, because it looks for a run a
                crash left behind — which has to happen once at launch, whatever
                screen the deep link opens.
              */}
              <RecordingProvider>
                <NotificationStreamProvider>
                  <PushLinks>
                    <ThemeProvider>
                      <ToastProvider>
                        <StatusBar style="auto" />
                        <Stack screenOptions={{ headerShown: false }} />
                      </ToastProvider>
                    </ThemeProvider>
                  </PushLinks>
                </NotificationStreamProvider>
              </RecordingProvider>
            </SessionProvider>
          </OfflineProvider>
        </RuntimeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
