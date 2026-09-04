import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MapSurfaceProps } from '../mapSurface';
import { MapLibreRenderer, type MapEventLike, type MapLike } from './mapLibreRenderer';
import { createMarkerElement } from './markerElement';

/**
 * §8 on the web: a MapLibre GL canvas.
 *
 * Two things are worth knowing before touching this file.
 *
 * **MapLibre is loaded on demand.** It is the heaviest dependency in the
 * project by a wide margin, and §14 budgets the *initial* bundle. A dynamic
 * import keeps it out of the first load: nobody pays for a map until they open
 * an activity. The map is not needed to paint the first screen either, so
 * nothing is lost.
 *
 * **The tile style is configuration, not code.** §11 forbids an API key in the
 * bundle, so the style URL comes from the environment; the fallback is
 * MapLibre's own key-free demo style, which is enough to develop against and
 * obviously not a production basemap.
 */
const configuredStyle: unknown = process.env['EXPO_PUBLIC_MAP_STYLE_URL'];
const MAP_STYLE_URL =
  typeof configuredStyle === 'string' && configuredStyle !== ''
    ? configuredStyle
    : 'https://demotiles.maplibre.org/style.json';

/**
 * Le fond sombre, quand il y en a un.
 *
 * Là où le mobile a un `userInterfaceStyle` que le système traduit tout seul,
 * une carte MapLibre sombre est un *autre jeu de tuiles* : sans seconde URL
 * configurée, la carte reste claire — mieux vaut ça qu'un fond noir sans rues.
 */
const configuredDarkStyle: unknown = process.env['EXPO_PUBLIC_MAP_STYLE_URL_DARK'];
const DARK_MAP_STYLE_URL =
  typeof configuredDarkStyle === 'string' && configuredDarkStyle !== ''
    ? configuredDarkStyle
    : undefined;

/** Somewhere to look at before a track arrives. Paris, and zoomed out. */
const INITIAL_CENTRE: [number, number] = [2.3522, 48.8566];
const INITIAL_ZOOM = 11;

/**
 * Adapts MapLibre's `Map` to the slice `MapLibreRenderer` declares.
 *
 * Written out method by method rather than asserted: MapLibre's `on` is
 * overloaded across dozens of event names, and a cast would paper over the day
 * one of these signatures changes rather than failing the build (§15).
 */
interface MapLibreModule {
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    attributionControl: { compact: boolean };
    interactive?: boolean;
  }) => MapLibreMap;
  Marker: new (options: { element: HTMLElement }) => {
    setLngLat(position: [number, number]): unknown;
    addTo(map: unknown): unknown;
    remove(): void;
  };
}

interface MapLibreMap extends MapLike {
  remove(): void;
  resize(): void;
}

export function WebMapSurface({
  onReady,
  accessibilityLabel,
  colours,
  reduceMotion = false,
  interactive = true,
  dark = false,
  testID,
}: MapSurfaceProps): ReactNode {
  const container = useRef<unknown>(null);
  const keep = useRef({ onReady, colours, reduceMotion, interactive, dark });
  keep.current = { onReady, colours, reduceMotion, interactive, dark };

  const attach = useCallback((node: unknown) => {
    container.current = node;
  }, []);

  // Mounting a WebGL canvas is a subscription, not a data fetch (§15): it has
  // to happen after the node exists, and it has to be undone on the way out.
  // The dependency list is empty on purpose — remounting the map because a
  // colour changed would throw away the tiles and the camera with them.
  useEffect(() => {
    const node = container.current;
    if (!(node instanceof HTMLElement)) return undefined;

    // Read through a function: a plain `let` is narrowed to `false` by the
    // compiler across the await, and the check silently disappears.
    const mounting = { disposed: false };
    const gone = (): boolean => mounting.disposed;
    let map: MapLibreMap | undefined;
    let renderer: MapLibreRenderer | undefined;

    void (async () => {
      const maplibre: MapLibreModule = await import('maplibre-gl');
      if (gone()) return;

      map = new maplibre.Map({
        container: node,
        style: (keep.current.dark ? DARK_MAP_STYLE_URL : undefined) ?? MAP_STYLE_URL,
        center: INITIAL_CENTRE,
        zoom: INITIAL_ZOOM,
        attributionControl: { compact: true },
        // Une vignette se regarde : sans cela, la molette zoomerait la carte
        // au lieu de faire défiler la liste qui la contient.
        interactive: keep.current.interactive,
      });

      renderer = new MapLibreRenderer({
        map,
        colours: keep.current.colours,
        reduceMotion: keep.current.reduceMotion,
        createMarker: (element) => {
          const marker = new maplibre.Marker({ element });
          return {
            setLngLat: (position) => {
              marker.setLngLat(position);
            },
            // MapLibre attaches to the map it was given; the renderer passes
            // its own reference, and the two are the same object.
            addTo: (target) => {
              marker.addTo(target);
            },
            remove: () => {
              marker.remove();
            },
          };
        },
        createMarkerElement,
      });
      keep.current.onReady(renderer);
    })();

    return () => {
      mounting.disposed = true;
      renderer?.dispose();
      map?.remove();
    };
  }, []);

  return (
    <View
      ref={attach}
      style={[styles.fill, { backgroundColor: colours.background }]}
      testID={testID}
      // §5: one named image. What moves inside it is never announced.
      accessibilityRole="image"
      aria-label={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

export type { MapEventLike };
