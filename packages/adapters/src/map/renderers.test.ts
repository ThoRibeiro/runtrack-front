import type { GeoPoint, MapMarker } from '@runtrack/core';
import type { MapSurfaceColours } from './mapSurface';
import {
  MapLibreRenderer,
  TRACE_LAYER_ID,
  TRACE_SOURCE_ID,
  type LineStringFeature,
  type MapEventLike,
  type MapLike,
  type MarkerLike,
} from './web/mapLibreRenderer';
import { NativeMapRenderer, type NativeMapHandle } from './native/nativeMapRenderer';

const colours: MapSurfaceColours = {
  trace: 'token:brand-500',
  start: 'token:brand-600',
  finish: 'token:text',
  runner: 'token:brand-500',
  split: 'token:text-muted',
  background: 'token:surface-alt',
};

const paris: GeoPoint = { latitude: 48.8566, longitude: 2.3522 };
const lyon: GeoPoint = { latitude: 45.764, longitude: 4.8357 };

function aMarker(overrides: Partial<MapMarker> = {}): MapMarker {
  return {
    id: 'start',
    position: paris,
    kind: 'start',
    accessibilityLabel: 'Départ',
    ...overrides,
  };
}

// --- MapLibre ---------------------------------------------------------------

class FakeMarker implements MarkerLike {
  positions: [number, number][] = [];
  removed = 0;
  added = 0;

  setLngLat(position: [number, number]): void {
    this.positions.push(position);
  }

  addTo(): void {
    this.added += 1;
  }

  remove(): void {
    this.removed += 1;
  }
}

class FakeMapLibre implements MapLike {
  sources = new Map<string, LineStringFeature>();
  layers: string[] = [];
  fits: { bounds: [[number, number], [number, number]]; animate: boolean }[] = [];
  eased: [number, number][] = [];
  jumped: [number, number][] = [];
  listeners = new Map<string, Set<(event: MapEventLike) => void>>();
  private loadListeners: (() => void)[] = [];

  constructor(private styleLoaded = true) {}

  addSource(id: string, source: { type: 'geojson'; data: LineStringFeature }): void {
    this.sources.set(id, source.data);
  }

  addLayer(layer: { id: string }): void {
    this.layers.push(layer.id);
  }

  getSource(id: string): { setData(data: LineStringFeature): void } | undefined {
    if (!this.sources.has(id)) return undefined;
    return {
      setData: (data) => {
        this.sources.set(id, data);
      },
    };
  }

  getLayer(id: string): unknown {
    return this.layers.includes(id) ? {} : undefined;
  }

  fitBounds(
    bounds: [[number, number], [number, number]],
    options: { padding: number; animate: boolean },
  ): void {
    this.fits.push({ bounds, animate: options.animate });
  }

  easeTo(options: { center: [number, number] }): void {
    this.eased.push(options.center);
  }

  jumpTo(options: { center: [number, number] }): void {
    this.jumped.push(options.center);
  }

  on(event: string, listener: (event: MapEventLike) => void): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener);
    this.listeners.set(event, set);
  }

  off(event: string, listener: (event: MapEventLike) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  isStyleLoaded(): boolean {
    return this.styleLoaded;
  }

  once(_event: 'load' | 'idle', listener: () => void): void {
    this.loadListeners.push(listener);
  }

  finishLoading(): void {
    this.styleLoaded = true;
    const pending = this.loadListeners;
    this.loadListeners = [];
    for (const listener of pending) listener();
  }

  emit(event: string, payload: MapEventLike): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }

  get coordinates(): [number, number][] {
    return this.sources.get(TRACE_SOURCE_ID)?.geometry.coordinates ?? [];
  }
}

function makeMapLibre(options: { styleLoaded?: boolean; reduceMotion?: boolean } = {}): {
  map: FakeMapLibre;
  renderer: MapLibreRenderer<object>;
  markers: FakeMarker[];
  elements: MapMarker[];
} {
  const map = new FakeMapLibre(options.styleLoaded ?? true);
  const markers: FakeMarker[] = [];
  const elements: MapMarker[] = [];
  const renderer = new MapLibreRenderer<object>({
    map,
    colours,
    reduceMotion: options.reduceMotion ?? false,
    createMarker: () => {
      const marker = new FakeMarker();
      markers.push(marker);
      return marker;
    },
    createMarkerElement: (marker) => {
      elements.push(marker);
      // Le renderer ne fait que transmettre l'élément : ce qu'il contient ne le
      // regarde pas, et il n'y a pas de DOM ici pour en fabriquer un vrai.
      return {};
    },
  });
  return { map, renderer, markers, elements };
}

describe('MapLibreRenderer', () => {
  it('pose la source et la couche du tracé au premier dessin', () => {
    const { map, renderer } = makeMapLibre();

    renderer.setTrace([paris, lyon]);

    expect(map.layers).toEqual([TRACE_LAYER_ID]);
    expect(map.coordinates).toEqual([
      [paris.longitude, paris.latitude],
      [lyon.longitude, lyon.latitude],
    ]);
  });

  it('attend que le style soit chargé plutôt que de dessiner dans le vide', () => {
    const { map, renderer } = makeMapLibre({ styleLoaded: false });

    renderer.setTrace([paris]);
    expect(map.layers).toEqual([]);

    map.finishLoading();
    expect(map.layers).toEqual([TRACE_LAYER_ID]);
  });

  it('ne dessine plus après démontage, même si le style finit par charger', () => {
    const { map, renderer } = makeMapLibre({ styleLoaded: false });

    renderer.setTrace([paris]);
    renderer.dispose();
    map.finishLoading();

    expect(map.layers).toEqual([]);
  });

  it('ajoute au tracé sans le redessiner de zéro', () => {
    const { map, renderer } = makeMapLibre();
    renderer.setTrace([paris]);

    renderer.appendToTrace([lyon]);
    renderer.appendToTrace([]);

    expect(map.coordinates).toHaveLength(2);
    expect(map.layers).toEqual([TRACE_LAYER_ID]);
  });

  it('déplace un marqueur existant au lieu de le reconstruire — le coureur bouge à la seconde', () => {
    const { renderer, markers } = makeMapLibre();
    renderer.setMarkers([aMarker({ id: 'runner', kind: 'runner' })]);
    renderer.setMarkers([aMarker({ id: 'runner', kind: 'runner', position: lyon })]);

    expect(markers).toHaveLength(1);
    expect(markers[0]?.positions).toHaveLength(2);
    expect(markers[0]?.removed).toBe(0);
  });

  it('retire les marqueurs qui ne sont plus demandés', () => {
    const { renderer, markers } = makeMapLibre();
    renderer.setMarkers([aMarker(), aMarker({ id: 'km-1', kind: 'split' })]);

    renderer.setMarkers([aMarker()]);

    expect(markers).toHaveLength(2);
    expect(markers[1]?.removed).toBe(1);
  });

  it('donne à chaque marqueur son libellé : le fabricant reçoit le marqueur entier', () => {
    const { renderer, elements } = makeMapLibre();
    renderer.setMarkers([aMarker({ accessibilityLabel: 'Kilomètre 3', kind: 'split' })]);

    expect(elements[0]?.accessibilityLabel).toBe('Kilomètre 3');
  });

  it('cadre une boîte en coordonnées MapLibre — longitude d’abord', () => {
    const { map, renderer } = makeMapLibre();

    renderer.fitTo({ south: 45, west: 2, north: 49, east: 5 });

    expect(map.fits[0]?.bounds).toEqual([
      [2, 45],
      [5, 49],
    ]);
    expect(map.fits[0]?.animate).toBe(true);
  });

  it('ne libère le suivi que sur un geste, pas sur ses propres mouvements de caméra', () => {
    const { map, renderer } = makeMapLibre();
    const moved = jest.fn();
    renderer.onUserMovedView(moved);

    map.emit('dragstart', {});
    expect(moved).not.toHaveBeenCalled();

    map.emit('dragstart', { originalEvent: { type: 'pointerdown' } });
    map.emit('zoomstart', { originalEvent: { type: 'wheel' } });
    expect(moved).toHaveBeenCalledTimes(2);
  });

  it('laisse un auditeur se retirer', () => {
    const { map, renderer } = makeMapLibre();
    const moved = jest.fn();
    renderer.onUserMovedView(moved)();

    map.emit('dragstart', { originalEvent: {} });

    expect(moved).not.toHaveBeenCalled();
  });

  it('saute au lieu de voler quand Reduce Motion est actif', () => {
    const { map, renderer } = makeMapLibre({ reduceMotion: true });

    renderer.followPosition(lyon);
    renderer.fitTo({ south: 45, west: 2, north: 49, east: 5 });

    expect(map.jumped).toHaveLength(1);
    expect(map.eased).toHaveLength(0);
    expect(map.fits[0]?.animate).toBe(false);
  });

  it('vole vers le coureur quand le mouvement est permis', () => {
    const { map, renderer } = makeMapLibre();

    renderer.followPosition(lyon);

    expect(map.eased).toEqual([[lyon.longitude, lyon.latitude]]);
  });

  it('rend ses nœuds DOM et ses abonnements au démontage, une seule fois', () => {
    const { map, renderer, markers } = makeMapLibre();
    renderer.setMarkers([aMarker()]);
    const moved = jest.fn();
    renderer.onUserMovedView(moved);

    renderer.dispose();
    renderer.dispose();

    expect(markers[0]?.removed).toBe(1);
    expect(map.listeners.get('dragstart')?.size).toBe(0);
    map.emit('dragstart', { originalEvent: {} });
    expect(moved).not.toHaveBeenCalled();
  });
});

// --- react-native-maps ------------------------------------------------------

function makeNative(reduceMotion = false): {
  renderer: NativeMapRenderer;
  handle: NativeMapHandle & {
    fits: { animated: boolean }[];
    animated: LatLngLike[];
    set: LatLngLike[];
  };
  drawings: { trace: readonly GeoPoint[]; markers: readonly MapMarker[] }[];
} {
  const fits: { animated: boolean }[] = [];
  const animated: LatLngLike[] = [];
  const set: LatLngLike[] = [];
  const handle = {
    fits,
    animated,
    set,
    fitToCoordinates: (_coordinates: LatLngLike[], options: { animated: boolean }) => {
      fits.push({ animated: options.animated });
    },
    animateCamera: (camera: { center: LatLngLike }) => {
      animated.push(camera.center);
    },
    setCamera: (camera: { center: LatLngLike }) => {
      set.push(camera.center);
    },
  };
  const drawings: { trace: readonly GeoPoint[]; markers: readonly MapMarker[] }[] = [];
  const renderer = new NativeMapRenderer(handle, (drawing) => drawings.push(drawing), reduceMotion);
  return { renderer, handle, drawings };
}

interface LatLngLike {
  latitude: number;
  longitude: number;
}

describe('NativeMapRenderer', () => {
  it('publie la trace accumulée, sans jamais la faire passer par l’écran', () => {
    const { renderer, drawings } = makeNative();

    renderer.setTrace([paris]);
    renderer.appendToTrace([lyon]);
    renderer.appendToTrace([]);

    expect(drawings).toHaveLength(2);
    expect(drawings[1]?.trace).toEqual([paris, lyon]);
  });

  it('publie les marqueurs avec la trace déjà accumulée', () => {
    const { renderer, drawings } = makeNative();
    renderer.setTrace([paris, lyon]);

    renderer.setMarkers([aMarker()]);

    expect(drawings[1]?.markers).toHaveLength(1);
    expect(drawings[1]?.trace).toHaveLength(2);
  });

  it('cadre la boîte par ses deux coins', () => {
    const { renderer, handle } = makeNative();

    renderer.fitTo({ south: 45, west: 2, north: 49, east: 5 }, { animated: false });

    expect(handle.fits).toEqual([{ animated: false }]);
  });

  it('suit le coureur par la caméra, en vol ou d’un bond selon Reduce Motion', () => {
    const flying = makeNative(false);
    flying.renderer.followPosition(lyon);
    expect(flying.handle.animated).toEqual([lyon]);
    expect(flying.handle.set).toEqual([]);

    const still = makeNative(true);
    still.renderer.followPosition(lyon);
    expect(still.handle.set).toEqual([lyon]);
    expect(still.handle.animated).toEqual([]);
  });

  it('ne libère le suivi que quand la surface dit que c’était un geste', () => {
    const { renderer } = makeNative();
    const moved = jest.fn();
    const unsubscribe = renderer.onUserMovedView(moved);

    renderer.reportUserMovedView();
    expect(moved).toHaveBeenCalledTimes(1);

    unsubscribe();
    renderer.reportUserMovedView();
    expect(moved).toHaveBeenCalledTimes(1);
  });

  it('oublie ses auditeurs au démontage', () => {
    const { renderer } = makeNative();
    const moved = jest.fn();
    renderer.onUserMovedView(moved);

    renderer.dispose();
    renderer.reportUserMovedView();

    expect(moved).not.toHaveBeenCalled();
  });
});
