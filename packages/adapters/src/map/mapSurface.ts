import type { ComponentType } from 'react';
import type { MapRenderer } from '@runtrack/core';

/**
 * The React side of §8's port.
 *
 * `MapRenderer` says what a map can be *told*; something still has to mount the
 * map itself, and that something is a component — `react-native-maps` on mobile,
 * a MapLibre canvas on the web, with nothing in common between them. The
 * hexagon cannot name a component type (it has never heard of React), so the
 * type lives here, at the edge, and each shell wires its own implementation
 * into the runtime.
 *
 * The two implementations live behind separate entry points on purpose —
 * `@runtrack/adapters/map/native` and `@runtrack/adapters/map/web` — so that the
 * web bundle never pulls in `react-native-maps`, nor the mobile bundle MapLibre.
 * A single module exporting both would put a megabyte of the wrong map in each.
 */
export interface MapSurfaceColours {
  /** §3: `brand-500` for a fill or a trace — the theme decides, not the adapter. */
  trace: string;
  start: string;
  finish: string;
  runner: string;
  split: string;
  /** Behind the map while its tiles load, so there is no white flash. */
  background: string;
}

export interface MapSurfaceProps {
  /**
   * Handed the renderer once the map is able to be told things. Called again
   * with a fresh renderer if the map remounts; the caller redraws.
   */
  onReady: (renderer: MapRenderer) => void;
  /** §5: a map carries meaning, so it is named — never left as an unlabelled image. */
  accessibilityLabel: string;
  colours: MapSurfaceColours;
  /**
   * §4/§5: with Reduce Motion on, the camera jumps instead of flying. The
   * movement is not removed — the map still goes where it was told — it just
   * stops being an animation.
   */
  reduceMotion?: boolean | undefined;
  /**
   * Faux pour une vignette : la carte se laisse regarder, pas manipuler.
   *
   * Une liste de courses en montre plusieurs à la fois ; sans cela, chaque
   * glissement du doigt sur une carte déplacerait la carte au lieu de faire
   * défiler la liste, et la liste deviendrait inutilisable.
   */
  interactive?: boolean | undefined;
  /**
   * §3 : pendant une course, l'écran est sombre — il se lit en plein soleil et
   * reste allumé trois heures. Une carte claire sous des panneaux noirs coupe
   * l'écran en deux ; ce drapeau la met au même diapason.
   */
  dark?: boolean | undefined;
  testID?: string | undefined;
}

export type MapSurfaceComponent = ComponentType<MapSurfaceProps>;
