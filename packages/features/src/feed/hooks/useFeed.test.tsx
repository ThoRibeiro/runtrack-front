import { renderHook, waitFor } from '@testing-library/react-native';
import { activityId } from '@runtrack/core';
import { aFeedItem } from '../../testing/fakes';
import { aRuntime, wrapperFor } from '../../testing/harness';
import { itemsOf, useFeed } from './useFeed';

/**
 * La pagination se teste sur le hook et non sur l'écran : ce qui compte est le
 * curseur envoyé, pas le geste qui déclenche la page suivante.
 */
describe('useFeed', () => {
  it('demande la première page sans curseur', async () => {
    const harness = aRuntime();
    const { result } = await renderHook(() => useFeed(), { wrapper: wrapperFor(harness) });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(harness.feed.reads).toEqual([{ cursor: undefined }]);
  });

  it('renvoie le curseur reçu à la page précédente, jamais un décalage', async () => {
    // §0 : pagination par curseur, jamais offset/limit.
    const harness = aRuntime();
    harness.feed.pages = [
      { items: [aFeedItem({ activityId: activityId('a1') })], nextCursor: '1' },
      { items: [aFeedItem({ activityId: activityId('a2') })] },
    ];
    const { result } = await renderHook(() => useFeed(), { wrapper: wrapperFor(harness) });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });
    await result.current.fetchNextPage();

    await waitFor(() => {
      expect(harness.feed.reads).toEqual([{ cursor: undefined }, { cursor: '1' }]);
    });
    await waitFor(() => {
      expect(itemsOf(result.current.data).map((item) => item.activityId)).toEqual(['a1', 'a2']);
    });
  });

  it('sait qu’il n’y a plus rien quand le serveur n’envoie pas de curseur', async () => {
    // C'est ce qui distingue la fin d'un fil d'un défilement sans fin.
    const harness = aRuntime();
    const { result } = await renderHook(() => useFeed(), { wrapper: wrapperFor(harness) });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.hasNextPage).toBe(false);
  });
});
