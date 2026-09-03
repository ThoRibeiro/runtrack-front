import type { ReactNode } from 'react';
import type { ActivityId } from '@runtrack/core';
import { IconAction } from '@runtrack/ui';
import { translate } from '../../i18n';
import { useLikes, useToggleLike } from '../hooks/useEngagement';

/**
 * The heart (§10).
 *
 * §15: information is never carried by colour alone, so the state is in the
 * accessible name — "Aimé, 12 j'aime" against "Aimer, 12 j'aime" — as well as
 * in the filled icon. And the count is part of that name rather than a separate
 * node, because "12" read on its own says nothing.
 *
 * §4 puts haptics on four events, and a like is one of them: `IconAction` fires
 * it, which is why the screen does not.
 */
export interface LikeButtonProps {
  activityId: ActivityId;
  testID?: string | undefined;
}

export function LikeButton({ activityId, testID }: LikeButtonProps): ReactNode {
  const likes = useLikes(activityId);
  const toggle = useToggleLike(activityId);

  const total = likes.data?.total ?? 0;
  const liked = likes.data?.likedByViewer ?? false;
  const counted =
    total === 1 ? translate('engagement.likeOne') : translate('engagement.likeMany', { total });

  return (
    <IconAction
      icon="heart"
      label={counted}
      active={liked}
      // Désactivé le temps du chargement initial, pas pendant l'envoi : le
      // cœur a déjà pris son nouvel état, le geler ferait croire à une panne.
      disabled={likes.isPending}
      accessibilityLabel={`${translate(liked ? 'engagement.liked' : 'engagement.like')}, ${counted}`}
      onPress={() => {
        toggle.mutate(liked);
      }}
      testID={testID}
    />
  );
}
