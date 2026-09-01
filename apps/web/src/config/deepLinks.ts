import type { DeepLink } from '@runtrack/core';

/**
 * La route d'une destination de notification.
 *
 * L'hexagone possède le **sens** d'un lien — `parseDeepLink` — et la coque
 * possède ses routes. Le `switch` est exhaustif à la compilation : le jour où
 * une destination s'ajoute, le compilateur montre cet endroit.
 */
export function pathOf(link: DeepLink): string {
  switch (link.route) {
    case 'activity-live':
      return `/activity/${link.activityId}/live`;
    case 'activity':
      return `/activity/${link.activityId}`;
    case 'activity-comments':
      // Les commentaires arrivent au lot 11 ; d'ici là, l'écran de course est
      // la destination honnête.
      return `/activity/${link.activityId}`;
    case 'user':
      return `/profile/${link.userId}`;
    case 'follow-requests':
      return '/follow-requests';
  }
}
