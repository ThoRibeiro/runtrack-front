import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Avatar, Text, space } from '@runtrack/ui';
import type { Author } from '@runtrack/core';

/**
 * Qui a couru, en tête de l'écran de course et de celui du direct.
 *
 * §5 : une seule annonce pour la ligne — le nom, dit une fois. L'avatar est
 * décoratif ici, sinon un lecteur d'écran répète le nom deux fois de suite.
 *
 * Rien ne s'affiche sans auteur : le serveur ne l'imbrique pas dans les
 * réponses du direct, et une pastille aux initiales « ? » ferait croire à un
 * compte supprimé.
 */
export interface AuthorLineProps {
  author: Author | undefined;
  testID?: string | undefined;
}

export function AuthorLine({ author, testID }: AuthorLineProps): ReactNode {
  if (author === undefined) {
    return null;
  }

  return (
    <View
      accessible
      accessibilityLabel={author.displayName}
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
    >
      <Avatar name={author.displayName} uri={author.avatarUrl} size="md" decorative />
      <Text variant="bodyStrong" decorative numberOfLines={1}>
        {author.displayName}
      </Text>
    </View>
  );
}
