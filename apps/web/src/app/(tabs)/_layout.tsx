import { TabBar, type TabItem } from '@runtrack/ui';
import { translate, useSessionStatus, useUnreadCount } from '@runtrack/features';
import { Redirect, Tabs, router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';

/**
 * The four-tab bar of §3, drawn by the design system rather than by the router.
 *
 * Expo Router owns the routes; `TabBar` owns the look and the accessibility —
 * `selected` announced, the active tab named as well as coloured. Four tabs
 * here and five on mobile: **only mobile records** (§2), and the web does not
 * show a greyed-out "démarrer une course" — it does not mention it at all.
 *
 * The route guard lives here rather than in each screen: everything under this
 * layout needs a session, and saying it once is what stops a screen from
 * forgetting.
 */
/** The keys are routes, so `typedRoutes` checks them at compile time. */
const TABS = [
  { key: '/', icon: 'home', label: 'Accueil' },
  { key: '/feed', icon: 'users', label: 'Fil' },
  { key: '/notifications', icon: 'bell', label: 'Notifications' },
  { key: '/profile', icon: 'user', label: 'Profil' },
] as const satisfies readonly TabItem[];

type TabRoute = (typeof TABS)[number]['key'];

/** Anything outside the tabs is shown under the first one. */
function activeTab(pathname: string): TabRoute {
  return TABS.find((tab) => tab.key === pathname)?.key ?? '/';
}

export default function TabsLayout(): ReactNode {
  const status = useSessionStatus();
  const pathname = usePathname();
  // §12 : la pastille de non-lues. Elle n'est demandée qu'une fois connecté,
  // et le flux SSE la rafraîchit quand quelque chose arrive.
  const unread = useUnreadCount(status === 'authenticated');

  // "Not signed in" and "we have not looked yet" are different: redirecting
  // during the first is how a cold start flashes the sign-in screen.
  if (status === 'restoring') return null;
  if (status === 'anonymous') return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <TabBar
          items={TABS.map((tab) =>
            tab.key === '/notifications' && (unread.data ?? 0) > 0
              ? { ...tab, badgeCount: unread.data }
              : tab,
          )}
          activeKey={activeTab(pathname)}
          onSelect={(key) => {
            router.navigate(activeTab(key));
          }}
          testID="app-tabs"
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: translate('home.ready') }} />
      <Tabs.Screen name="feed" options={{ title: translate('feed.title') }} />
      <Tabs.Screen name="notifications" options={{ title: translate('inbox.title') }} />
      <Tabs.Screen name="profile" options={{ title: translate('profile.activities') }} />
    </Tabs>
  );
}
