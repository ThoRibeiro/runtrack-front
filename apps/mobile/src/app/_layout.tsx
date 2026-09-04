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
  PreferencesProvider,
  RuntimeProvider,
  SessionProvider,
  createQueryClient,
} from '@runtrack/features';
import { RecordingProvider } from '@runtrack/features/recording';
import { PushLinks } from '../config/pushLinks';
import { ToastProvider, useTheme } from '@runtrack/ui';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { persister, preferencesStorage } from '../config/persistence';
import { ThemedApp } from '../config/ThemedApp';
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

/**
 * La zone sûre, une fois pour toutes les routes.
 *
 * Aucun écran n'a de barre de navigation (`headerShown: false`) : sans ce
 * décalage, le premier titre de chaque écran passe sous l'encoche ou la Dynamic
 * Island, et sur la carte plein écran c'est le bouton de départ qui s'y cache.
 * Ici plutôt que dans chaque écran : celui qu'on ajoutera demain l'aura déjà.
 */
function SafeArea({ children }: { children: ReactNode }): ReactNode {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: theme.colours.canvas,
      }}
    >
      {children}
    </View>
  );
}

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
            <PreferencesProvider storage={preferencesStorage}>
              <SessionProvider>
                {/*
                §6: mounted here, above the router, because it looks for a run a
                crash left behind — which has to happen once at launch, whatever
                screen the deep link opens.
              */}
                <RecordingProvider>
                  <NotificationStreamProvider>
                    <PushLinks>
                      {/*
                  Le thème vient des préférences, « selon le système » compris.
                  Résolu dans `ThemedApp` pour que le fournisseur soit monté
                  quand le thème se lit.
                */}
                      <ThemedApp>
                        <ToastProvider>
                          <StatusBar style="auto" />
                          <SafeArea>
                            <Stack screenOptions={{ headerShown: false }} />
                          </SafeArea>
                        </ToastProvider>
                      </ThemedApp>
                    </PushLinks>
                  </NotificationStreamProvider>
                </RecordingProvider>
              </SessionProvider>
            </PreferencesProvider>
          </OfflineProvider>
        </RuntimeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
