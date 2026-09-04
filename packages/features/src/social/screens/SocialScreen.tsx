import { useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import type { PublicProfile } from '@runtrack/core';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  FormField,
  GroupedRows,
  Input,
  List,
  Pressable,
  ScreenHeader,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import { describeError, translate } from '../../i18n';
import { useFollowRequests, useSearchRunners } from '../hooks/useSocial';

/**
 * L'onglet social : trouver quelqu'un, et voir qui demande à nous suivre.
 *
 * Les deux vivaient déjà, chacun dans son écran, et **aucun des deux n'était
 * atteignable** — ni la recherche ni les demandes n'avaient de lien vers elles
 * dans toute l'application. C'est ce que cet onglet corrige avant d'ajouter
 * quoi que ce soit : du code qu'on ne peut pas ouvrir ne vaut pas mieux que du
 * code absent.
 *
 * Les demandes passent devant la recherche parce qu'elles portent une
 * échéance : quelqu'un attend une réponse. La recherche, elle, attend qu'on
 * ait une idée.
 */
export interface SocialScreenProps {
  onOpenProfile: (handle: string) => void;
  onOpenRequests: () => void;
  /** Absent quand l'écran est un onglet : il n'y a nulle part où revenir. */
  onBack?: (() => void) | undefined;
}

/** En deçà, la recherche n'est pas envoyée : le serveur exige deux caractères. */
const MINIMUM_QUERY = 2;

export function SocialScreen({
  onOpenProfile,
  onOpenRequests,
  onBack,
}: SocialScreenProps): ReactNode {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const search = useSearchRunners(query);
  const requests = useFollowRequests();
  const described = search.error === null ? undefined : describeError(search.error);
  const pending = requests.data?.length ?? 0;

  const renderItem = ({ item }: { item: PublicProfile }): ReactElement => (
    <Pressable
      onPress={() => {
        onOpenProfile(item.handle);
      }}
      accessibilityLabel={`${item.displayName}, @${item.handle}`}
      enforceTouchTarget={false}
      testID={`search-result-${item.handle}`}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Avatar name={item.displayName} uri={item.avatarUrl} size="md" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" decorative numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text variant="caption" tone="muted" decorative>
              {`@${item.handle}`}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="social-screen">
      <ScreenHeader
        title={translate('social.title')}
        onBack={onBack}
        backLabel={translate('common.back')}
        testID="social-header"
      />
      <View style={{ flex: 1, padding: space.md, gap: space.md }}>
        {/*
          Le champ en premier, et toujours à la même place. Les demandes
          passaient devant parce qu'elles portent une échéance — sauf qu'elles
          vont et viennent, et la barre de recherche descendait de soixante
          points selon que quelqu'un attendait une réponse ou non.

          Il ne porte rien à l'écran : une loupe et une invite dedans suffisent
          à dire ce qu'il fait, et un titre au-dessus le redirait. `labelHidden`
          et non pas de libellé du tout — sans lui, un lecteur d'écran annonce
          « zone de texte » et rien d'autre.
        */}
        <FormField label={translate('social.search')} labelHidden>
          {(field) => (
            <Input
              field={field}
              value={query}
              onChangeText={setQuery}
              placeholder={translate('social.searchPlaceholder')}
              icon="search"
              testID="search-input"
            />
          )}
        </FormField>

        {query.trim().length < MINIMUM_QUERY ? (
          // Rien n'a encore été demandé : ni une erreur, ni un résultat vide.
          // C'est la place des demandes en attente — elles ne gênent personne
          // ici, et elles disparaissent dès qu'on cherche vraiment quelqu'un.
          <View style={{ flex: 1, gap: space.md }}>
            {/*
              Rien quand personne n'attend : une ligne « 0 demande » est une
              ligne qu'on apprend à ne plus lire, et le jour où elle compte, on
              ne la voit plus.
            */}
            {pending > 0 && (
              <GroupedRows
                rows={[
                  {
                    key: 'requests',
                    label: translate('social.requests'),
                    description: translate('social.pendingRequests', { count: pending }),
                    icon: 'users',
                    accessory: <Badge count={pending} label={translate('social.requests')} />,
                    onPress: onOpenRequests,
                  },
                ]}
                testID="social-requests"
              />
            )}
            {/*
              On invite plutôt qu'on ne pose une condition : « deux caractères
              au minimum » est une contrainte du serveur, pas une consigne que
              quelqu'un a envie de lire avant d'avoir commencé.
            */}
            <EmptyState
              icon="search"
              title={translate('social.discover')}
              description={translate('social.discoverDetail')}
            />
          </View>
        ) : (
          <List
            data={search.isPending ? undefined : (search.data ?? [])}
            renderItem={renderItem}
            keyExtractor={(item) => item.handle}
            emptyTitle={translate('social.searchEmpty')}
            emptyDescription={translate('social.searchEmptyDetail')}
            loading={search.isPending}
            loadingLabel={translate('common.loading')}
            error={
              described === undefined
                ? undefined
                : { title: described.title, message: described.detail }
            }
            onRetry={() => {
              void search.refetch();
            }}
            testID="search-results"
          />
        )}
      </View>
    </View>
  );
}
