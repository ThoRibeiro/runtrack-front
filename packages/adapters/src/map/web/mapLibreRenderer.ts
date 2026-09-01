import type { BoundingBox, GeoPoint, MapMarker, MapRenderer } from '@runtrack/core';
import type { MapSurfaceColours } from '../mapSurface';

/**
 * The MapLibre half of §8, as a plain object.
 *
 * It is deliberately separate from the component that mounts the canvas: a
 * renderer is a pile of decisions — when to redraw, what a marker looks like,
 * whether a camera move counts as the user taking the view — and every one of
 * them is testable against a double, while a WebGL canvas is not testable at
 * all. So the component does the mounting and nothing else, and this does the
 * deciding.
 *
 * The types below are the *slice* of MapLibre this uses, written out rather
 * than imported. That keeps the tests free of a WebGL dependency, and it makes
 * the surface we depend on visible: eight methods, and the day one of them
 * changes, the compiler says so here instead of at runtime.
 */
export interface GeoJsonSourceLike {
  setData(data: LineStringFeature): void;
}

export interface MarkerLike {
  setLngLat(position: [number, number]): void;
  addTo(map: MapLike): void;
  remove(): void;
}

export interface MapLike {
  addSource(id: string, source: { type: 'geojson'; data: LineStringFeature }): void;
  addLayer(layer: LineLayer): void;
  /**
   * MapLibre types this as a union of every source kind, and only some of them
   * can be handed new data. So it comes back as `unknown` and is narrowed
   * below — a cast here would be the assertion §15 forbids, hiding the real
   * case where the style declares a vector source under the same name.
   */
  getSource(id: string): unknown;
  getLayer(id: string): unknown;
  fitBounds(
    bounds: [[number, number], [number, number]],
    options: { padding: number; animate: boolean; duration?: number },
  ): void;
  easeTo(options: { center: [number, number]; duration: number }): void;
  jumpTo(options: { center: [number, number] }): void;
  on(
    event: 'dragstart' | 'zoomstart' | 'rotatestart',
    listener: (event: MapEventLike) => void,
  ): void;
  off(
    event: 'dragstart' | 'zoomstart' | 'rotatestart',
    listener: (event: MapEventLike) => void,
  ): void;
  /**
   * MapLibre types this `boolean | void` — a union TypeScript is right to
   * dislike. It comes back as `unknown` and is compared to `true`, which is
   * what the two shapes have in common.
   */
  isStyleLoaded(): unknown;
  once(event: 'load' | 'idle', listener: () => void): void;
}

/** A camera move carries its DOM event when a person caused it, and nothing when code did. */
export interface MapEventLike {
  originalEvent?: unknown;
}

export interface LineStringFeature {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

export interface LineLayer {
  id: string;
  type: 'line';
  source: string;
  layout: { 'line-cap': 'round'; 'line-join': 'round' };
  paint: { 'line-color': string; 'line-width': number };
}

/**
 * Builds the node behind a marker: a canvas is not readable, an element is.
 *
 * The element type is a parameter because the renderer never touches it — it
 * takes what the factory built and hands it straight to `createMarker`. On the
 * web that is an `HTMLElement`; a test passes whatever it likes, without a cast
 * that would claim a DOM exists where there is none.
 */
export type MarkerElementFactory<Element> = (
  marker: MapMarker,
  colours: MapSurfaceColours,
) => Element;

export type MarkerFactory<Element> = (element: Element) => MarkerLike;

export const TRACE_SOURCE_ID = 'runtrack-trace';
export const TRACE_LAYER_ID = 'runtrack-trace-line';

/**
 * §5: the trace is a non-textual element that carries meaning, so it needs 3:1
 * against what is behind it — which `brand-500` has — and enough width to be
 * seen at all. Four pixels is the reference's own trace.
 */
const TRACE_WIDTH_PIXELS = 4;
/** Room around a fitted track so the start pin is not welded to the edge. */
const FIT_PADDING_PIXELS = 48;
const CAMERA_DURATION_MILLIS = 400;

function acceptsData(candidate: unknown): candidate is GeoJsonSourceLike {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'setData' in candidate &&
    typeof Reflect.get(candidate, 'setData') === 'function'
  );
}

function toLineString(points: readonly GeoPoint[]): LineStringFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: points.map((point) => [point.longitude, point.latitude]),
    },
  };
}

export interface MapLibreRendererOptions<Element> {
  map: MapLike;
  colours: MapSurfaceColours;
  createMarker: MarkerFactory<Element>;
  createMarkerElement: MarkerElementFactory<Element>;
  reduceMotion?: boolean;
}

export class MapLibreRenderer<Element = HTMLElement> implements MapRenderer {
  private points: readonly GeoPoint[] = [];
  private markers = new Map<string, MarkerLike>();
  private panListeners = new Set<() => void>();
  private disposed = false;

  private readonly onCameraGesture = (event: MapEventLike): void => {
    // §8: only a *user* move releases the follow. `easeTo` fires the same
    // events, and without this check the map would stop following itself.
    if (event.originalEvent === undefined) return;
    for (const listener of this.panListeners) listener();
  };

  constructor(private readonly options: MapLibreRendererOptions<Element>) {
    for (const event of ['dragstart', 'zoomstart', 'rotatestart'] as const) {
      options.map.on(event, this.onCameraGesture);
    }
  }

  setTrace(points: readonly GeoPoint[]): void {
    this.points = points;
    this.draw();
  }

  appendToTrace(points: readonly GeoPoint[]): void {
    if (points.length === 0) return;
    this.points = [...this.points, ...points];
    this.draw();
  }

  setMarkers(markers: readonly MapMarker[]): void {
    const wanted = new Set(markers.map((marker) => marker.id));
    for (const [id, existing] of this.markers) {
      if (!wanted.has(id)) {
        existing.remove();
        this.markers.delete(id);
      }
    }

    for (const marker of markers) {
      const position: [number, number] = [marker.position.longitude, marker.position.latitude];
      const existing = this.markers.get(marker.id);
      if (existing !== undefined) {
        // The runner marker moves every second: moving it beats destroying and
        // rebuilding a DOM node at 1 Hz for three hours.
        existing.setLngLat(position);
        continue;
      }
      const created = this.options.createMarker(
        this.options.createMarkerElement(marker, this.options.colours),
      );
      created.setLngLat(position);
      created.addTo(this.options.map);
      this.markers.set(marker.id, created);
    }
  }

  fitTo(box: BoundingBox, options?: { animated?: boolean }): void {
    this.options.map.fitBounds(
      [
        [box.west, box.south],
        [box.east, box.north],
      ],
      {
        padding: FIT_PADDING_PIXELS,
        animate: this.animates(options?.animated),
        duration: CAMERA_DURATION_MILLIS,
      },
    );
  }

  followPosition(position: GeoPoint): void {
    const centre: [number, number] = [position.longitude, position.latitude];
    if (this.animates(true)) {
      this.options.map.easeTo({ center: centre, duration: CAMERA_DURATION_MILLIS });
    } else {
      this.options.map.jumpTo({ center: centre });
    }
  }

  onUserMovedView(listener: () => void): () => void {
    this.panListeners.add(listener);
    return () => this.panListeners.delete(listener);
  }

  /** Called when the component unmounts: markers are DOM nodes, they leak. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const event of ['dragstart', 'zoomstart', 'rotatestart'] as const) {
      this.options.map.off(event, this.onCameraGesture);
    }
    for (const marker of this.markers.values()) marker.remove();
    this.markers.clear();
    this.panListeners.clear();
  }

  /** §4/§5: Reduce Motion replaces the flight with a jump — it does not cancel it. */
  private animates(asked: boolean | undefined): boolean {
    return asked !== false && this.options.reduceMotion !== true;
  }

  private draw(): void {
    const data = toLineString(this.points);
    const source = this.options.map.getSource(TRACE_SOURCE_ID);
    if (acceptsData(source)) {
      source.setData(data);
      return;
    }

    // The style has to be loaded before a source can be added. The map is
    // usually ready by the time a track is decoded, but a cached track on a
    // cold style is exactly the race that shows up once in production.
    if (this.options.map.isStyleLoaded() !== true) {
      this.options.map.once('load', () => {
        if (!this.disposed) this.draw();
      });
      return;
    }

    this.options.map.addSource(TRACE_SOURCE_ID, { type: 'geojson', data });
    if (this.options.map.getLayer(TRACE_LAYER_ID) === undefined) {
      this.options.map.addLayer({
        id: TRACE_LAYER_ID,
        type: 'line',
        source: TRACE_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': this.options.colours.trace, 'line-width': TRACE_WIDTH_PIXELS },
      });
    }
  }
}
