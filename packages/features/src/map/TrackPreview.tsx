import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { decodePolyline, type ActivityMapPresenter } from '@runtrack/core';
import { TrackThumbnail, radius } from '@runtrack/ui';
import { ActivityMap } from './ActivityMap';
import { translate } from '../i18n';

/**
 * Le parcours d'une course, sur une vraie carte, dans une liste.
 *
 * Une carte figée : ni glissement, ni zoom, ni rotation. C'est ce qui permet
 * d'en mettre une par ligne sans confisquer le doigt qui fait défiler la liste,
 * et sur Android c'est une image rendue une fois plutôt qu'une vue vivante.
 *
 * Sans trace — course en cours, ou terminée avant que le serveur ne calcule sa
 * vignette — on retombe sur le dessin seul : un cadre gris et rien d'autre
 * serait un trou dans la carte du fil.
 */
export interface TrackPreviewProps {
  polyline: string | undefined;
  height?: number | undefined;
  testID?: string | undefined;
}

const DEFAULT_HEIGHT = 148;

export function TrackPreview({
  polyline,
  height = DEFAULT_HEIGHT,
  testID,
}: TrackPreviewProps): ReactNode {
  const [presenter, setPresenter] = useState<ActivityMapPresenter | undefined>(undefined);

  const points = useMemo(
    () => (polyline === undefined ? undefined : decodePolyline(polyline)),
    [polyline],
  );

  // Synchroniser un système extérieur (§15) : la carte est *informée* de la
  // trace, elle ne la reçoit pas en propriété de rendu.
  useEffect(() => {
    if (presenter === undefined || points === undefined) return;
    presenter.showTrack(points, [], { markers: false });
  }, [presenter, points]);

  if (points === undefined || points.length < 2) {
    return <TrackThumbnail points={points} height={height} testID={testID} />;
  }

  return (
    <View style={{ height, borderRadius: radius.md, overflow: 'hidden' }} testID={testID}>
      <ActivityMap
        points={points}
        interactive={false}
        onPresenter={setPresenter}
        accessibilityLabel={translate('map.label')}
        testID={testID === undefined ? undefined : `${testID}-map`}
      />
    </View>
  );
}
