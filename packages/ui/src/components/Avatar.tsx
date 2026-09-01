import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '../theme';
import { avatarSize, radius, type AvatarSizeToken } from '../tokens';
import { Text } from './Text';

/**
 * §5: an avatar announces the person's name, never the word "avatar". That is
 * why `name` is required and the label is built from it rather than passed in.
 */
export interface AvatarProps {
  name: string;
  uri?: string | undefined;
  size?: AvatarSizeToken | undefined;
  /**
   * Hides it from the screen reader when a parent already reads the row.
   *
   * §5 says an avatar announces the person's name, never "avatar" — which is
   * right when it stands alone. Inside a row that is already one announcement,
   * repeating the name makes the reader say it twice.
   */
  decorative?: boolean | undefined;
  testID?: string | undefined;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return (
    words
      .map((word) => {
        // `word[0]` splits an emoji or a combining character in half.
        const codePoint = word.codePointAt(0);
        return codePoint === undefined ? '' : String.fromCodePoint(codePoint).toUpperCase();
      })
      .join('') || '?'
  );
}

export function Avatar({
  name,
  uri,
  size = 'md',
  decorative = false,
  testID,
}: AvatarProps): ReactNode {
  const theme = useTheme();
  const diameter = avatarSize[size];

  return (
    <View
      accessible={!decorative}
      accessibilityRole="image"
      accessibilityLabel={decorative ? undefined : name}
      aria-hidden={decorative}
      testID={testID}
      style={{
        width: diameter,
        height: diameter,
        borderRadius: radius.full,
        backgroundColor: theme.colours.brand.surface,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri === undefined ? (
        <Text variant={size === 'xl' ? 'title' : 'bodyStrong'} tone="brand" decorative>
          {initialsOf(name)}
        </Text>
      ) : (
        <Image
          source={{ uri }}
          // The name is already announced by the wrapper; repeating it here
          // makes the screen reader say it twice.
          aria-hidden
          style={{ width: diameter, height: diameter }}
        />
      )}
    </View>
  );
}
