import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';

/**
 * A decorative separator. It carries no meaning, which is why it uses
 * `colours.border` and why no contrast pair is declared for it.
 */
export function Divider({ inset = 0 }: { inset?: number }): ReactNode {
  const theme = useTheme();
  return (
    <View
      aria-hidden
      style={{
        height: theme.stroke.hairline,
        marginLeft: inset,
        backgroundColor: theme.colours.border,
      }}
    />
  );
}
