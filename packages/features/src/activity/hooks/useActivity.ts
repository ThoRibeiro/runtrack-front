import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Activity, ActivityId, Split } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

export function useActivity(id: ActivityId): UseQueryResult<Activity> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.activity(id),
    queryFn: () => runtime.activities.byId(id),
  });
}

/**
 * Les tronçons, dans leur propre requête : ils ne changent plus une fois la
 * course terminée, donc ils se gardent en cache bien plus longtemps que la
 * course elle-même. `enabled` reste là pour l'écran de partage public, qui les
 * demande plus tard que le reste.
 */
export function useSplits(id: ActivityId, enabled = true): UseQueryResult<readonly Split[]> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.splits(id),
    queryFn: () => runtime.activities.splits(id),
    enabled,
  });
}

/**
 * Supprimer une course, et tout ce qu'elle a laissé derrière elle.
 *
 * Invalide le fil et la liste du coureur en plus de la course elle-même : une
 * sortie effacée qui reste affichée dans le fil jusqu'au prochain
 * rafraîchissement, c'est une suppression à laquelle on ne croit pas.
 */
export function useDeleteActivity(): UseMutationResult<void, unknown, ActivityId> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: ActivityId) => runtime.activities.delete(id),
    onSuccess: (_result, id) => {
      client.removeQueries({ queryKey: queryKeys.activity(id) });
      void client.invalidateQueries({ queryKey: queryKeys.feed });
      void client.invalidateQueries({ queryKey: ['activity', 'of'] });
    },
  });
}
