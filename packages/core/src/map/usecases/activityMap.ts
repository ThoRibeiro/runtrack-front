import type { Split } from '../../activity/domain/track';
import { boundingBoxOf, type GeoPoint } from '../../measure/geo';
import type { MapMarker, MapRenderer } from '../ports/mapRenderer';
import { boundingBoxAround, kilometreMarks } from '../domain/trackGeometry';

/**
 * What a map shows for one activity, and who decides when.
 *
 * It sits between a decoded trace and a `MapRenderer`, and it exists so that
 * none of this lives in a component. Two reasons, both from the brief:
 *
 *  - §7's performance trap. A `position` a second for three hours: if each one
 *    went through React the tree would re-render 10 800 times. Everything here
 *    is imperative — the map is *told*, it does not re-render;
 *  - §8's follow rule. "La carte suit le coureur, mais cesse de le suivre dès
 *    que l'utilisateur déplace la vue." That is a small state machine with a
 *    subscription in it, and a small state machine is exactly the thing that
 *    rots when it is spread across a `useEffect` and two refs.
 *
 * Only the *fact* that following stopped crosses back into React, so the shell
 * can offer to re-centre. That is one render, not one per point.
 */
export interface ActivityMapLabels {
  start: string;
  finish: string;
  runner: string;
  /** Le visage à poser sur le marqueur du coureur, quand la carte est la sienne. */
  runnerAvatar?: { uri: string | undefined; initial: string } | undefined;
  /** Numbered from 1, as the server numbers splits. */
  kilometre: (index: number) => string;
}

/** How much ground a single focused split gets, on each side. */
const SPLIT_FOCUS_HALF_WIDTH_METRES = 250;

/** Le plus petit cadrage qui ait du sens : une rue, pas une région. */
const MINIMUM_FRAME_METRES = 400;
const METRES_PER_DEGREE_LATITUDE = 111_320;

export class ActivityMapPresenter {
  private points: readonly GeoPoint[] = [];
  private splits: readonly Split[] = [];
  private live = false;
  private markersShown = true;
  private followingRunner = true;
  private unsubscribe: (() => void) | undefined;
  private listeners = new Set<(following: boolean) => void>();

  constructor(
    private readonly renderer: MapRenderer,
    private readonly labels: ActivityMapLabels,
  ) {
    // §8: the moment the user pans, the map is theirs. Subscribing in the
    // constructor rather than on the first trace means a pan during the decode
    // is not silently overridden by the framing that follows it.
    this.unsubscribe = renderer.onUserMovedView(() => {
      this.setFollowing(false);
    });
  }

  get following(): boolean {
    return this.followingRunner;
  }

  /**
   * A finished track, drawn in one go — §7: "dessine la carte d'un coup, pas
   * point par point".
   */
  showTrack(
    points: readonly GeoPoint[],
    splits: readonly Split[] = [],
    options: { markers?: boolean } = {},
  ): void {
    this.points = points;
    this.splits = splits;
    this.live = false;
    // Sur une vignette de liste, deux épingles de départ et d'arrivée couvrent
    // le tracé qu'elles sont censées situer : on ne garde que la forme.
    this.markersShown = options.markers ?? true;
    this.renderer.setTrace(points);
    this.renderer.setMarkers(this.markers());
    this.frameWholeTrack({ animated: false });
  }

  /**
   * The live snapshot: the last 200 points the server sent on connection. Same
   * one-shot draw, and framing only makes sense before the runner has moved.
   */
  showLiveSnapshot(points: readonly GeoPoint[]): void {
    this.points = points;
    this.live = true;
    this.renderer.setTrace(points);
    this.renderer.setMarkers(this.markers());
    this.frameWholeTrack({ animated: false });
    this.followLast();
  }

  /** Points off the stream. Appended, never redrawn. */
  appendLive(points: readonly GeoPoint[]): void {
    if (points.length === 0) return;
    this.live = true;
    this.points = [...this.points, ...points];
    this.renderer.appendToTrace(points);
    this.renderer.setMarkers(this.markers());
    this.followLast();
  }

  /**
   * Before the run: the dot and nothing else.
   *
   * It does not touch the trace — there is none yet — so the first recorded
   * point still starts an empty line rather than continuing from a marker.
   */
  showCurrentPosition(position: GeoPoint): void {
    this.renderer.setMarkers([
      {
        id: 'runner',
        position,
        kind: 'runner',
        accessibilityLabel: this.labels.runner,
        avatar: this.labels.runnerAvatar,
      },
    ]);
    if (this.followingRunner) this.renderer.followPosition(position);
  }

  /** §8: the offer to re-centre, once the user has taken the view. */
  recentre(): void {
    this.setFollowing(true);
    if (this.live) {
      this.followLast();
    } else {
      this.frameWholeTrack({ animated: true });
    }
  }

  /**
   * §8: the kilometre marks are clickable. Clicking one frames it — and hands
   * the view to the user, because a map that keeps snapping back to the runner
   * while you read a split is the very behaviour §8 calls unbearable.
   */
  focusKilometre(kilometreIndex: number): boolean {
    const mark = kilometreMarks(this.points, this.splits).find(
      (candidate) => candidate.kilometreIndex === kilometreIndex,
    );
    if (mark === undefined) return false;

    this.setFollowing(false);
    this.renderer.fitTo(boundingBoxAround(mark.point, SPLIT_FOCUS_HALF_WIDTH_METRES), {
      animated: true,
    });
    return true;
  }

  onFollowingChanged(listener: (following: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.listeners.clear();
  }

  private markers(): readonly MapMarker[] {
    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    if (first === undefined || !this.markersShown) return [];

    const markers: MapMarker[] = [
      { id: 'start', position: first, kind: 'start', accessibilityLabel: this.labels.start },
    ];

    for (const mark of kilometreMarks(this.points, this.splits)) {
      markers.push({
        id: `km-${String(mark.kilometreIndex)}`,
        position: mark.point,
        kind: 'split',
        accessibilityLabel: this.labels.kilometre(mark.kilometreIndex),
      });
    }

    // One point is a start and nothing else: a finish flag on top of the start
    // flag reads as two places to a screen reader.
    if (last !== undefined && this.points.length > 1) {
      markers.push({
        id: this.live ? 'runner' : 'finish',
        position: last,
        kind: this.live ? 'runner' : 'finish',
        accessibilityLabel: this.live ? this.labels.runner : this.labels.finish,
        ...(this.live ? { avatar: this.labels.runnerAvatar } : {}),
      });
    }

    return markers;
  }

  /**
   * Cadre la trace — avec un plancher.
   *
   * Une course qui vient de démarrer tient en un point : sa boîte est
   * quasiment nulle, et la carte recule alors jusqu'à la région entière pour
   * la « contenir ». Deux cents mètres de part et d'autre, c'est une rue, et
   * c'est le minimum qui veut dire quelque chose.
   */
  private frameWholeTrack(options: { animated: boolean }): void {
    const box = boundingBoxOf(this.points);
    if (box === undefined) return;

    const spanMetres = Math.max(
      (box.north - box.south) * METRES_PER_DEGREE_LATITUDE,
      (box.east - box.west) * METRES_PER_DEGREE_LATITUDE * Math.cos((box.north * Math.PI) / 180),
    );

    this.renderer.fitTo(
      spanMetres >= MINIMUM_FRAME_METRES
        ? box
        : boundingBoxAround(
            {
              latitude: (box.north + box.south) / 2,
              longitude: (box.east + box.west) / 2,
            },
            MINIMUM_FRAME_METRES / 2,
          ),
      options,
    );
  }

  private followLast(): void {
    if (!this.followingRunner) return;
    const last = this.points[this.points.length - 1];
    if (last !== undefined) this.renderer.followPosition(last);
  }

  private setFollowing(following: boolean): void {
    if (this.followingRunner === following) return;
    this.followingRunner = following;
    for (const listener of this.listeners) listener(following);
  }
}
