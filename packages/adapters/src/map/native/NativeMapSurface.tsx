import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
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
    <View style={styles.fill} testID={testID}>
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
            pinColor={colourFor(marker.kind, colours)}
            title={marker.accessibilityLabel}
            accessibilityLabel={marker.accessibilityLabel}
            // The runner marker moves every second: re-capturing its bitmap at
            // 1 Hz for three hours is the documented way to cook an Android.
            tracksViewChanges={false}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
