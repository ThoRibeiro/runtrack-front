import { Spinner, useTheme } from '@runtrack/ui';
import { translate, useSessionStatus } from '@runtrack/features';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * The home screen — empty until lot 6 fills it — and the place the route guard
 * lives for now.
 *
 * The `restoring` branch matters more than it looks: without it, a cold start
 * flashes the sign-in screen for the time it takes to read the Keychain, on
 * every launch, for someone who is signed in.
 */
export default function HomeRoute(): ReactNode {
  const status = useSessionStatus();
  const theme = useTheme();

  if (status === 'restoring') {
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

  if (status === 'anonymous') return <Redirect href="/sign-in" />;

  return <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} />;
}
