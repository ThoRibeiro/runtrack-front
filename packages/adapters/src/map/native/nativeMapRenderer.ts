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
/**
 * Les deux plateformes ne cadrent pas avec la même unité : Android parle en
 * niveaux de zoom, iOS en altitude de caméra. `react-native-maps` accepte les
 * deux dans le même objet et ignore celui qui ne le concerne pas.
 */
export interface CameraPosition {
  center: LatLng;
  /**
   * Sans `| undefined`, contrairement au reste du dépôt : `Partial<Camera>` de
   * `react-native-maps` déclare ses champs sans, et sous
   * `exactOptionalPropertyTypes` un `zoom: undefined` explicite est refusé. Le
   * champ est donc absent ou renseigné, jamais présent et vide.
   */
  zoom?: number;
  altitude?: number;
}

export interface NativeMapHandle {
  fitToCoordinates(
    coordinates: LatLng[],
    options: { edgePadding: EdgeInsets; animated: boolean },
  ): void;
  animateCamera(camera: CameraPosition, options: { duration: number }): void;
  setCamera(camera: CameraPosition): void;
}

export interface NativeMapDrawing {
  trace: readonly GeoPoint[];
  markers: readonly MapMarker[];
}

/** Where the accumulated drawing goes. The surface throttles it to a frame. */
export type NativeMapSink = (drawing: NativeMapDrawing) => void;

/**
 * De l'air autour de la trace : cadrée au ras du bord, elle paraît à l'étroit.
 *
 * Proportionnelle, et c'est tout l'enjeu : 72 points fixes, sur une vignette de
 * 148 points de haut, ne laissent que quatre points pour la trace — la carte
 * s'éloigne alors jusqu'à la région pour « faire tenir » le cadrage demandé.
 */
const FIT_PADDING = 72;
const FIT_PADDING_RATIO = 0.12;
const MINIMUM_FIT_PADDING = 8;
const CAMERA_DURATION_MILLIS = 400;

/**
 * L'échelle de la rue, pas celle du département.
 *
 * Sans niveau imposé, la caméra se contente de se centrer : elle garde le zoom
 * initial de la carte — le monde — et le coureur devient un point au milieu de
 * rien. Le niveau n'est donné qu'au **premier** cadrage : ensuite la caméra
 * suit sans y toucher, sinon chaque position annulerait le zoom choisi à la
 * main deux secondes plus tôt.
 */
const FOLLOW_ZOOM = 15;
const FOLLOW_ALTITUDE_METRES = 1_200;

export class NativeMapRenderer implements MapRenderer {
  private viewport: { width: number; height: number } | undefined;
  private lastFit: BoundingBox | undefined;
  private points: readonly GeoPoint[] = [];
  private markers: readonly MapMarker[] = [];
  private panListeners = new Set<() => void>();
  /** Vrai dès que l'échelle a été décidée une fois — par un cadrage ou un suivi. */
  private framed = false;

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
    // Un cadrage choisit son échelle tout seul : le suivi n'a plus à en imposer.
    this.framed = true;
    this.lastFit = box;
    this.handle.fitToCoordinates(
      [
        { latitude: box.south, longitude: box.west },
        { latitude: box.north, longitude: box.east },
      ],
      {
        edgePadding: {
          top: this.fitPadding(),
          right: this.fitPadding(),
          bottom: this.fitPadding(),
          left: this.fitPadding(),
        },
        animated: this.animates(options?.animated),
      },
    );
  }

  followPosition(position: GeoPoint): void {
    const camera: CameraPosition = this.framed
      ? { center: position }
      : { center: position, zoom: FOLLOW_ZOOM, altitude: FOLLOW_ALTITUDE_METRES };
    this.framed = true;

    if (this.animates(true)) {
      this.handle.animateCamera(camera, { duration: CAMERA_DURATION_MILLIS });
    } else {
      this.handle.setCamera(camera);
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
  /**
   * La surface mesure, le renderer en tire sa marge de cadrage — et rejoue le
   * dernier cadrage : il a eu lieu avant que la taille soit connue, donc avec
   * une marge provisoire.
   */
  resize(width: number, height: number): void {
    const first = this.viewport === undefined;
    this.viewport = { width, height };
    if (first && this.lastFit !== undefined) {
      this.fitTo(this.lastFit, { animated: false });
    }
  }

  private fitPadding(): number {
    const smallest = Math.min(this.viewport?.width ?? 0, this.viewport?.height ?? 0);
    // Tant que la carte n'a pas été mesurée, la marge la plus petite : une
    // marge trop grande fait reculer la carte jusqu'à la région pour « faire
    // tenir » le cadrage, et c'est ce qui arrivait à toutes les vignettes —
    // `onLayout` arrive après le premier cadrage.
    if (smallest === 0) return MINIMUM_FIT_PADDING;
    return Math.max(MINIMUM_FIT_PADDING, Math.min(FIT_PADDING, smallest * FIT_PADDING_RATIO));
  }

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
