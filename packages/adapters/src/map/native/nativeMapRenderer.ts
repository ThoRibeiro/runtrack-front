import type { BoundingBox, GeoPoint, MapMarker, MapRenderer } from '@runtrack/core';

/**
 * The `react-native-maps` half of §8.
 *
 * The awkward part, and why this file is worth reading: `react-native-maps`
 * draws its `Polyline` and its `Marker`s **declaratively**, as children. There
 * is no imperative "add a point" — the only way to move a trace is to hand the
 * component a new one. Which collides head-on with §7: a `position` every
 * second for three hours cannot go through the tree.
 *
 * The compromise, and it holds the budget: the state stays *inside the map
 * surface*. This renderer accumulates points here, outside React, and pushes to
 * a sink that the surface throttles to one render per frame. So a burst of ten
 * points is one render of one leaf component, never a render of the screen —
 * which is what §14's "une mise à jour d'interface par seconde" is protecting.
 *
 * The camera, at least, is genuinely imperative, and goes straight to the ref.
 */
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** The slice of `MapView`'s imperative API that §8 needs. */
export interface NativeMapHandle {
  fitToCoordinates(
    coordinates: LatLng[],
    options: { edgePadding: EdgeInsets; animated: boolean },
  ): void;
  animateCamera(camera: { center: LatLng }, options: { duration: number }): void;
  setCamera(camera: { center: LatLng }): void;
}

export interface NativeMapDrawing {
  trace: readonly GeoPoint[];
  markers: readonly MapMarker[];
}

/** Where the accumulated drawing goes. The surface throttles it to a frame. */
export type NativeMapSink = (drawing: NativeMapDrawing) => void;

const FIT_PADDING = 48;
const CAMERA_DURATION_MILLIS = 400;

export class NativeMapRenderer implements MapRenderer {
  private points: readonly GeoPoint[] = [];
  private markers: readonly MapMarker[] = [];
  private panListeners = new Set<() => void>();

  constructor(
    private readonly handle: NativeMapHandle,
    private readonly publish: NativeMapSink,
    private readonly reduceMotion = false,
  ) {}

  setTrace(points: readonly GeoPoint[]): void {
    this.points = points;
    this.flush();
  }

  appendToTrace(points: readonly GeoPoint[]): void {
    if (points.length === 0) return;
    this.points = [...this.points, ...points];
    this.flush();
  }

  setMarkers(markers: readonly MapMarker[]): void {
    this.markers = markers;
    this.flush();
  }

  fitTo(box: BoundingBox, options?: { animated?: boolean }): void {
    this.handle.fitToCoordinates(
      [
        { latitude: box.south, longitude: box.west },
        { latitude: box.north, longitude: box.east },
      ],
      {
        edgePadding: {
          top: FIT_PADDING,
          right: FIT_PADDING,
          bottom: FIT_PADDING,
          left: FIT_PADDING,
        },
        animated: this.animates(options?.animated),
      },
    );
  }

  followPosition(position: GeoPoint): void {
    if (this.animates(true)) {
      this.handle.animateCamera({ center: position }, { duration: CAMERA_DURATION_MILLIS });
    } else {
      this.handle.setCamera({ center: position });
    }
  }

  onUserMovedView(listener: () => void): () => void {
    this.panListeners.add(listener);
    return () => this.panListeners.delete(listener);
  }

  /**
   * Called by the surface from `onRegionChangeComplete`, which is the only
   * place that knows whether a gesture caused the move. A camera flight fires
   * the same callback, and following would otherwise cancel itself.
   */
  reportUserMovedView(): void {
    for (const listener of this.panListeners) listener();
  }

  dispose(): void {
    this.panListeners.clear();
  }

  private animates(asked: boolean | undefined): boolean {
    return asked !== false && !this.reduceMotion;
  }

  private flush(): void {
    this.publish({ trace: this.points, markers: this.markers });
  }
}
