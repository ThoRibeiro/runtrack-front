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
import { ToastProvider } from '@runtrack/ui';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DocumentTitle } from '../config/DocumentTitle';
import { persister, preferencesStorage } from '../config/persistence';
import { ThemedApp } from '../config/ThemedApp';
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
            <PreferencesProvider storage={preferencesStorage}>
              <SessionProvider>
                {/*
                §12 : le web reçoit le flux de notifications comme le mobile. Ce
                qu'il n'a pas, c'est le push : pas de jeton, donc pas de
                `PushRegistry` dans son runtime.
              */}
                <NotificationStreamProvider>
                  {/*
                  Le thème vient des préférences, « selon le système » compris.
                  Résolu dans `ThemedApp` pour que le fournisseur soit monté
                  quand le thème se lit.
                */}
                  <ThemedApp>
                    <ToastProvider>
                      <DocumentTitle>
                        <Stack screenOptions={{ headerShown: false }}>
                          {/*
                      §5 : « un changement de route annonce le nouveau titre ».
                      Dans une application à page unique, sans ça, un lecteur
                      d'écran ne dit rien du tout quand on navigue — et le
                      document reste sans titre, ce que WCAG 2.4.2 interdit.

                      Expo Router pose `options.title` sur le document ; le
                      titre par défaut de `+html.tsx` ne sert qu'au tout premier
                      rendu, avant que le routeur ne prenne la main.
                    */}
                          <Stack.Screen name="(tabs)" options={{ title: 'RunTrack' }} />
                          <Stack.Screen
                            name="sign-in"
                            options={{ title: 'Connexion — RunTrack' }}
                          />
                          <Stack.Screen
                            name="sign-up"
                            options={{ title: 'Créer un compte — RunTrack' }}
                          />
                          <Stack.Screen
                            name="forgot-password"
                            options={{ title: 'Mot de passe oublié — RunTrack' }}
                          />
                          <Stack.Screen
                            name="reset-password"
                            options={{ title: 'Nouveau mot de passe — RunTrack' }}
                          />
                          <Stack.Screen
                            name="verify-email"
                            options={{ title: 'Confirmation d’adresse — RunTrack' }}
                          />
                          <Stack.Screen
                            name="activity/[id]"
                            options={{ title: 'Course — RunTrack' }}
                          />
                          <Stack.Screen
                            name="activity/[id]/live"
                            options={{ title: 'En direct — RunTrack' }}
                          />
                          <Stack.Screen
                            name="shared/[token]"
                            options={{ title: 'Course partagée — RunTrack' }}
                          />
                          <Stack.Screen
                            name="profile/[handle]"
                            options={{ title: 'Profil — RunTrack' }}
                          />
                          <Stack.Screen name="search" options={{ title: 'Recherche — RunTrack' }} />
                          <Stack.Screen
                            name="follow-requests"
                            options={{ title: 'Demandes d’abonnement — RunTrack' }}
                          />
                          <Stack.Screen
                            name="notifications/preferences"
                            options={{ title: 'Préférences — RunTrack' }}
                          />
                          <Stack.Screen
                            name="+not-found"
                            options={{ title: 'Page introuvable — RunTrack' }}
                          />
                        </Stack>
                      </DocumentTitle>
                    </ToastProvider>
                  </ThemedApp>
                </NotificationStreamProvider>
              </SessionProvider>
            </PreferencesProvider>
          </OfflineProvider>
        </RuntimeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
