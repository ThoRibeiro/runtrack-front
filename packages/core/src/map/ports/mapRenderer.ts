import type { BoundingBox, GeoPoint } from '../../measure/geo';

/**
 * The map, and the one place where the three targets have **nothing** in common:
 * `react-native-maps` on mobile, MapLibre GL on the web (§8).
 *
 * The port is deliberately imperative. §7's performance trap is a `position`
 * every second for three hours: a declarative surface would re-render the tree
 * on each one, and the phone would cook. `appendToTrace` pushes a point into the
 * map without React ever hearing about it.
 */
export interface MapMarker {
  id: string;
  position: GeoPoint;
  kind: 'start' | 'finish' | 'split' | 'runner';
  /** §5: a marker carries meaning, so it says what it is. */
  accessibilityLabel: string;
  /**
   * Le visage du coureur, quand on le connaît : sur sa propre carte, une photo
   * dit « c'est vous » mieux qu'une épingle. L'initiale sert de repli — un
   * avatar qui ne charge pas ne doit pas laisser un trou sur la carte.
   */
  avatar?: { uri: string | undefined; initial: string } | undefined;
}

export interface MapRenderer {
  /** Replaces the whole trace — the snapshot on connection, or a decoded track. */
  setTrace(points: readonly GeoPoint[]): void;
  /** Adds to the end without redrawing: the live case. */
  appendToTrace(points: readonly GeoPoint[]): void;
  setMarkers(markers: readonly MapMarker[]): void;
  /** §8: automatic framing on the track. */
  fitTo(box: BoundingBox, options?: { animated?: boolean }): void;
  /** §8: follows the runner — until the user moves the view. */
  followPosition(position: GeoPoint): void;
  /**
   * Fires when the user pans. §8: a map that takes the wheel back is
   * unbearable, so the shell stops following and offers to re-centre.
   */
  onUserMovedView(listener: () => void): () => void;
}
