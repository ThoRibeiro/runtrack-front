import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { MapMarker } from '@runtrack/core';
import type { MapSurfaceColours, MapSurfaceProps } from '../mapSurface';
import { NativeMapRenderer, type NativeMapDrawing } from './nativeMapRenderer';

/**
 * §8 on iOS and Android. Mounts `react-native-maps` and hands the screen a
 * `MapRenderer`; every decision lives in `NativeMapRenderer`, next door, where
 * it can be tested without a device.
 *
 * The one thing this file owns is the throttle. `react-native-maps` draws
 * declaratively, so a trace change *is* a render — but the render stops here,
 * at a leaf with no children of its own, and at most one per frame. §14's
 * "une mise à jour d'interface par seconde" is about the screen; this is the
 * map redrawing itself, which is what a map does.
 */

/** §5: the trace carries meaning, so it is thick enough to be seen. */
const TRACE_WIDTH = 4;

/** Assez grand pour reconnaître un visage, assez petit pour ne pas cacher la rue. */
const AVATAR_SIZE = 36;
/** L'anneau qui détache le visage du fond de carte, quel qu'il soit. */
const AVATAR_RING = 3;
const AVATAR_INITIAL_SIZE = 16;

function colourFor(kind: MapMarker['kind'], colours: MapSurfaceColours): string {
  switch (kind) {
    case 'start':
      return colours.start;
    case 'finish':
      return colours.finish;
    case 'runner':
      return colours.runner;
    case 'split':
      return colours.split;
  }
}

export function NativeMapSurface({
  onReady,
  accessibilityLabel,
  colours,
  reduceMotion = false,
  interactive = true,
  dark = false,
  testID,
}: MapSurfaceProps): ReactNode {
  const map = useRef<MapView | null>(null);
  const renderer = useRef<NativeMapRenderer | undefined>(undefined);
  const pending = useRef<NativeMapDrawing | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);
  const [drawing, setDrawing] = useState<NativeMapDrawing>({ trace: [], markers: [] });

  const publish = useCallback((next: NativeMapDrawing) => {
    pending.current = next;
    if (frame.current !== undefined) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined;
      if (pending.current !== undefined) setDrawing(pending.current);
    });
  }, []);

  // Not a data fetch (§15) — a subscription's undo. The renderer holds
  // listeners, and a screen that leaves without cutting them keeps the map
  // alive in memory for as long as whoever still points at it.
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
      renderer.current?.dispose();
    },
    [],
  );

  const handleMapReady = useCallback(() => {
    const handle = map.current;
    if (handle === null) return;
    const created = new NativeMapRenderer(handle, publish, reduceMotion);
    renderer.current = created;
    onReady(created);
  }, [onReady, publish, reduceMotion]);

  // §8: the map stops following the moment the user moves the view — and only
  // then. A camera flight fires the same callback, hence `isGesture`.
  const handleRegionChange = useCallback((_region: unknown, details?: { isGesture?: boolean }) => {
    if (details?.isGesture === true) renderer.current?.reportUserMovedView();
  }, []);

  const handlePanDrag = useCallback(() => {
    renderer.current?.reportUserMovedView();
  }, []);

  return (
    <View
      style={styles.fill}
      // La marge de cadrage dépend de la place disponible : une vignette de
      // liste et une carte plein écran ne se cadrent pas pareil.
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        renderer.current?.resize(width, height);
      }}
      testID={testID}
    >
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        onMapReady={handleMapReady}
        onPanDrag={handlePanDrag}
        onRegionChangeComplete={handleRegionChange}
        // §5: announced as one image with a name. The stream of positions
        // behind it is never spoken — that is the trap the brief names.
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        toolbarEnabled={false}
        // Figée dans une vignette : le doigt appartient à la liste qui défile.
        // `liteMode` n'existe que sur Android — une image rendue une fois au
        // lieu d'une vue vivante, exactement ce qu'il faut pour un timbre.
        // iOS applique son propre style sombre ; c'est le seul réglage qui
        // suive les mises à jour de la carte d'Apple sans style maison.
        userInterfaceStyle={dark ? 'dark' : 'light'}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        liteMode={!interactive}
        cacheEnabled={!interactive}
      >
        {drawing.trace.length > 1 && (
          <Polyline
            coordinates={[...drawing.trace]}
            strokeColor={colours.trace}
            strokeWidth={TRACE_WIDTH}
          />
        )}
        {drawing.markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.position}
            {...(marker.avatar === undefined ? { pinColor: colourFor(marker.kind, colours) } : {})}
            title={marker.accessibilityLabel}
            accessibilityLabel={marker.accessibilityLabel}
            // The runner marker moves every second: re-capturing its bitmap at
            // 1 Hz for three hours is the documented way to cook an Android.
            tracksViewChanges={false}
          >
            {/*
              Le coureur porte son visage plutôt qu'une épingle : sur sa propre
              carte, une photo dit « c'est vous » sans un mot. L'initiale prend
              le relais quand il n'y a pas d'image — un avatar qui ne charge pas
              ne doit pas laisser un trou sur la carte.
            */}
            {marker.avatar !== undefined && (
              <View
                style={[
                  styles.avatar,
                  { borderColor: colours.runner, backgroundColor: colours.background },
                ]}
              >
                {marker.avatar.uri === undefined ? (
                  <Text style={[styles.initial, { color: colours.runner }]}>
                    {marker.avatar.initial}
                  </Text>
                ) : (
                  <Image source={{ uri: marker.avatar.uri }} style={styles.avatarImage} />
                )}
              </View>
            )}
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: AVATAR_RING,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  initial: { fontSize: AVATAR_INITIAL_SIZE, fontWeight: '700' },
  fill: { flex: 1 },
});
