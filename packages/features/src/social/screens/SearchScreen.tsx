import { useState, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import type { PublicProfile } from '@runtrack/core';
import {
  Avatar,
  Card,
  EmptyState,
  FormField,
  Input,
  List,
  Pressable,
  ScreenHeader,
  Text,
  space,
  useTheme,
} from '@runtrack/ui';
import { describeError, translate } from '../../i18n';
import { useSearchRunners } from '../hooks/useSocial';

export interface SearchScreenProps {
  onOpenProfile: (handle: string) => void;
  onBack?: (() => void) | undefined;
}

export function SearchScreen({ onOpenProfile, onBack }: SearchScreenProps): ReactNode {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const search = useSearchRunners(query);
  const described = search.error === null ? undefined : describeError(search.error);

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
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="search-screen">
      <ScreenHeader
        title={translate('social.search')}
        onBack={onBack}
        backLabel={translate('common.back')}
        testID="search-header"
      />
      <View style={{ flex: 1, padding: space.md, gap: space.md }}>
      <FormField label={translate('social.search')} hint={translate('social.searchHint')}>
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

      {query.trim().length < 2 ? (
        // Not an error and not an empty result: nothing has been asked yet.
        <EmptyState
          icon="search"
          title={translate('social.search')}
          description={translate('social.searchHint')}
        />
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
