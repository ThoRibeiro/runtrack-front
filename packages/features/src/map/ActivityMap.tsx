import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  ActivityMapPresenter,
  type ActivityMapLabels,
  type GeoPoint,
  type MapRenderer,
  type Split,
} from '@runtrack/core';
import type { MapSurfaceColours } from '@runtrack/adapters';
import { Button, EmptyState, Spinner, space, useReduceMotion, useTheme } from '@runtrack/ui';
import { useRuntime } from '../runtime/RuntimeProvider';
import { translate } from '../i18n';

/**
 * The map, as a screen sees it (§8).
 *
 * What this component does *not* do is as important as what it does: it never
 * re-renders when a point arrives. The trace goes to `ActivityMapPresenter`,
 * which talks to the renderer imperatively; the only thing that crosses back
 * into React is whether the map is still following the runner, because that
 * decides whether the "recentre" button is on screen. One render, on a
 * transition the user caused — not one per position (§7).
 */
export interface ActivityMapProps {
  points: readonly GeoPoint[] | undefined;
  splits?: readonly Split[];
  /** A run in progress: the last point is the runner, and the camera follows. */
  live?: boolean;
  /** True when the track cannot be shown at all — purged, or never recorded. */
  unavailable?: boolean;
  /** Handed the presenter, so a screen can focus one kilometre on it. */
  onPresenter?: (presenter: ActivityMapPresenter) => void;
  testID?: string;
}

export function ActivityMap({
  points,
  splits = [],
  live = false,
  unavailable = false,
  onPresenter,
  testID,
}: ActivityMapProps): ReactNode {
  const { map: MapSurface } = useRuntime();
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [presenter, setPresenter] = useState<ActivityMapPresenter | undefined>(undefined);
  const [following, setFollowing] = useState(true);

  const labels = useMemo<ActivityMapLabels>(
    () => ({
      start: translate('map.start'),
      finish: translate('map.finish'),
      runner: translate('map.runner'),
      kilometre: (index) => translate('activity.splitLabel', { index }),
    }),
    [],
  );

  const colours = useMemo<MapSurfaceColours>(
    () => ({
      // §3: `brand.fill` and not `brand.text` — a trace is a fill, and the
      // theme is the only thing allowed to know which orange that is.
      trace: theme.colours.brand.fill,
      start: theme.colours.brand.fill,
      finish: theme.colours.text,
      runner: theme.colours.brand.fill,
      split: theme.colours.textMuted,
      background: theme.colours.surfaceAlt,
    }),
    [theme],
  );

  const attached = useRef<MapRenderer | undefined>(undefined);
  const handleReady = useCallback(
    (renderer: MapRenderer) => {
      // A surface that calls back on every render — and a component that then
      // sets state — is an infinite loop. Only a genuinely new renderer, from a
      // remount, gets a new presenter.
      if (attached.current === renderer) return;
      attached.current = renderer;
      const created = new ActivityMapPresenter(renderer, labels);
      setPresenter(created);
      onPresenter?.(created);
    },
    [labels, onPresenter],
  );

  // Synchronising an external system, not fetching (§15). The presenter is not
  // React state: it has to be *told* when the decoded track finally lands.
  useEffect(() => {
    if (presenter === undefined || points === undefined) return;
    if (live) {
      presenter.showLiveSnapshot(points);
    } else {
      presenter.showTrack(points, splits);
    }
  }, [presenter, points, splits, live]);

  useEffect(() => {
    if (presenter === undefined) return undefined;
    const stop = presenter.onFollowingChanged(setFollowing);
    return () => {
      stop();
      presenter.dispose();
    };
  }, [presenter]);

  if (unavailable) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colours.surfaceAlt }} testID={testID}>
        <EmptyState
          icon="map-pin"
          title={translate('map.unavailable')}
          description={translate('map.unavailableDetail')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.surfaceAlt }} testID={testID}>
      <MapSurface
        onReady={handleReady}
        accessibilityLabel={translate(live ? 'map.labelLive' : 'map.label')}
        colours={colours}
        reduceMotion={reduceMotion}
        testID={testID === undefined ? undefined : `${testID}-surface`}
      />

      {points === undefined && (
        <View style={{ position: 'absolute', bottom: space.md, left: space.md }}>
          <Spinner label={translate('map.decoding')} testID="map-decoding" />
        </View>
      )}

      {/*
        §8: the map stops following the moment the view is moved, and offers to
        take it back. A labelled button and not a bare icon — this one is worth
        the words, because "recentrer" is not a guessable pictogram.
      */}
      {!following && (
        <View style={{ position: 'absolute', bottom: space.md, alignSelf: 'center' }}>
          <Button
            variant="solid"
            size="sm"
            icon="crosshair"
            label={translate('map.recentre')}
            onPress={() => {
              presenter?.recentre();
            }}
            testID="map-recentre"
          />
        </View>
      )}
    </View>
  );
}
