import { EmptyState } from '@runtrack/ui';
import { translate } from '@runtrack/features';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Une route qui n'existe pas.
 *
 * Sans ce fichier, Expo Router rend son écran interne — qui produisait une
 * erreur d'hydratation React (#418) trouvée par la suite de bout en bout. Une
 * erreur au chargement ne casse rien aujourd'hui et tout dans six mois.
 */
export default function NotFound(): ReactNode {
  return (
    <View style={{ flex: 1 }} testID="not-found">
      <EmptyState icon="search" title={translate('notFound.title')} description={translate('notFound.detail')} />
      <Link href="/" accessibilityLabel={translate('notFound.home')}>
        {translate('notFound.home')}
      </Link>
    </View>
  );
}
