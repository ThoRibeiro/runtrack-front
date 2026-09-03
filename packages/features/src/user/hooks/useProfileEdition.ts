import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { MyProfile, Physiology, PickedImage, Visibility } from '@runtrack/core';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { queryKeys } from '../../query/keys';

export interface ProfileEdits {
  displayName: string;
  bio: string;
}

/**
 * The four writes a profile screen needs, each on its own endpoint because the
 * server keeps them apart: the name and the bio travel together, the handle is
 * a rename with its own uniqueness check, the account scope decides who sees
 * the runner at all, and the physiology is health data on a separate route.
 *
 * Every one of them invalidates rather than patching the cache by hand. The
 * server is the one that normalises a handle and refuses a weight, so the
 * profile shown after a save is the one it answered with — not the one we
 * hoped for.
 */
export function useUpdateProfile(): UseMutationResult<MyProfile, unknown, ProfileEdits> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (edits: ProfileEdits) => runtime.users.updateProfile(edits),
    onSuccess: (profile) => {
      client.setQueryData(queryKeys.me, profile);
      // The public copy carries the same name and bio, under another key.
      void client.invalidateQueries({ queryKey: queryKeys.profile(profile.handle) });
    },
  });
}

export function useChangeHandle(): UseMutationResult<MyProfile, unknown, string> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (handle: string) => runtime.users.changeHandle(handle),
    onSuccess: (profile) => {
      client.setQueryData(queryKeys.me, profile);
      // The old handle keyed a profile that no longer exists under that name.
      void client.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}

/**
 * Envoyer la photo choisie. Le serveur la range et rend le profil mis à jour :
 * l'adresse est la sienne, pas l'URI locale du téléphone — qui ne veut rien
 * dire pour les autres appareils.
 */
export function useUploadAvatar(): UseMutationResult<MyProfile, unknown, PickedImage> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (image: PickedImage) => runtime.users.uploadAvatar(image),
    onSuccess: (profile) => {
      client.setQueryData(queryKeys.me, profile);
      void client.invalidateQueries({ queryKey: queryKeys.profile(profile.handle) });
    },
  });
}

/** Retirer la photo : `undefined` dit au serveur qu'il n'y en a plus. */
export function useChangeAvatar(): UseMutationResult<MyProfile, unknown, string | undefined> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (url: string | undefined) => runtime.users.changeAvatar(url),
    onSuccess: (profile) => {
      client.setQueryData(queryKeys.me, profile);
      void client.invalidateQueries({ queryKey: queryKeys.profile(profile.handle) });
    },
  });
}

export function useChangeAccountScope(): UseMutationResult<MyProfile, unknown, Visibility> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (scope: Visibility) => runtime.users.changeVisibility(scope),
    onSuccess: (profile) => {
      client.setQueryData(queryKeys.me, profile);
    },
  });
}

/**
 * §11: health data lives behind its own request, and is never folded into a
 * profile response. It is fetched only by the screen that edits it.
 */
export function usePhysiology(): UseQueryResult<Physiology> {
  const runtime = useRuntime();
  return useQuery({
    queryKey: queryKeys.physiology,
    queryFn: () => runtime.users.physiology(),
  });
}

export function useUpdatePhysiology(): UseMutationResult<Physiology, unknown, Physiology> {
  const runtime = useRuntime();
  const client = useQueryClient();

  return useMutation({
    mutationFn: (physiology: Physiology) => runtime.users.updatePhysiology(physiology),
    onSuccess: (saved) => {
      client.setQueryData(queryKeys.physiology, saved);
    },
  });
}
