import { ProfileScreen, useMe, useSessionActions } from '@runtrack/features';
import { Spinner, useTheme } from '@runtrack/ui';
import { translate } from '@runtrack/features';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * One's own profile.
 *
 * It reads `me` first because the profile itself is fetched **by handle** —
 * there is no lookup by identifier, and `/user/v1/me` is the only place the
 * handle comes from.
 */
export default function MyProfileRoute(): ReactNode {
  const me = useMe();
  const theme = useTheme();
  const { signOut } = useSessionActions();

  if (me.data === undefined) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colours.canvas,
        }}
      >
        <Spinner label={translate('common.loading')} />
      </View>
    );
  }

  return (
    <ProfileScreen
      handle={me.data.handle}
      isMe
      onOpenActivity={(id) => {
        router.push(`/activity/${id}`);
      }}
      onOpenFollowers={(id) => {
        router.push(`/followers/${id}`);
      }}
      onOpenFollowing={(id) => {
        router.push(`/following/${id}`);
      }}
      onSignOut={() => {
        void signOut();
      }}
    />
  );
}
