import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { space } from '../tokens';
import { EmptyState } from './EmptyState';
import { OfflineState } from './OfflineState';
import { ErrorState } from './ErrorState';
import { Spinner } from './Spinner';

/**
 * The only list in the application, and it is virtualised (§4: FlashList, never
 * `FlatList`, on a dense screen; §14: virtualised everywhere).
 *
 * It also settles §15's "un spinner sans état d'erreur ni état vide à côté":
 * the three states are props, so a caller cannot ship the spinner and forget
 * the other two. `emptyTitle` is required for the same reason.
 */
export interface ListProps<T> {
  data: readonly T[] | undefined;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  emptyTitle: string;
  emptyDescription?: string | undefined;
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
  /** Already read from the `problem+json` `code` by the caller. */
  error?: { title: string; message?: string | undefined } | undefined;
  /**
   * §9: shown instead of the spinner when the query is *paused* for want of a
   * network. A paused query and a slow one look identical from inside the list;
   * only the caller knows which, and a spinner over the first is a lie.
   */
  offline?:
    | { title: string; description?: string | undefined; retryLabel?: string | undefined }
    | undefined;
  onRetry?: (() => void) | undefined;
  /**
   * Tirer vers le bas pour recharger. Le geste que tout le monde essaie en
   * premier quand une liste semble figée — la refuser, c'est laisser croire à
   * une panne.
   */
  onRefresh?: (() => void) | undefined;
  refreshing?: boolean | undefined;
  onEndReached?: (() => void) | undefined;
  header?: ReactElement | undefined;
  testID?: string | undefined;
}

export function List<T>({
  data,
  renderItem,
  keyExtractor,
  emptyTitle,
  emptyDescription,
  loading = false,
  loadingLabel = 'Chargement',
  error,
  offline,
  onRetry,
  onRefresh,
  refreshing = false,
  onEndReached,
  header,
  testID,
}: ListProps<T>): ReactNode {
  if (error !== undefined) {
    return <ErrorState title={error.title} message={error.message} onRetry={onRetry} />;
  }

  // Offline wins over loading: something we cannot fetch is not loading.
  if (offline !== undefined && data === undefined) {
    return (
      <OfflineState
        title={offline.title}
        description={offline.description}
        retryLabel={offline.retryLabel}
        onRetry={onRetry}
        testID="list-offline"
      />
    );
  }

  if (data === undefined && loading) {
    return <Spinner label={loadingLabel} />;
  }

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      {...(onRefresh === undefined ? {} : { onRefresh, refreshing })}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState title={emptyTitle} description={emptyDescription} />}
      ListFooterComponent={loading && data !== undefined ? <Spinner label={loadingLabel} /> : null}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      testID={testID}
    />
  );
}
