import { describe, expect, it, vi } from 'vitest';
import { distanceBetween, type GeoPoint } from '../measure/geo';
import { encodePolyline } from '../measure/polyline';
import { aSplit, FakeMapRenderer } from '../testing/fakes';
import {
  boundingBoxAround,
  kilometreMarks,
  pointAtDistance,
  splitEndDistances,
} from './domain/trackGeometry';
import { ActivityMapPresenter, type ActivityMapLabels } from './usecases/activityMap';
import { isTrackDecodingCancelled, TrackDecodingCancelled } from './ports/trackDecoder';

/**
 * A straight track heading due east from the Louvre, one point every `stepMetres`.
 * Due east keeps the expected distances arithmetic: no latitude change, so the
 * cumulative length is the step times the index, to within a millimetre.
 */
function straightTrack(count: number, stepMetres = 100): GeoPoint[] {
  const latitude = 48.8606;
  const metresPerDegree = 111_320 * Math.cos((latitude * Math.PI) / 180);
  return Array.from({ length: count }, (_, index) => ({
    latitude,
    longitude: 2.3376 + (index * stepMetres) / metresPerDegree,
  }));
}

const labels: ActivityMapLabels = {
  start: 'Départ',
  finish: 'Arrivée',
  runner: 'Coureur',
  kilometre: (index) => `Kilomètre ${String(index)}`,
};

describe('pointAtDistance', () => {
  it('rend le premier point pour une distance nulle ou négative', () => {
    const track = straightTrack(3);
    expect(pointAtDistance(track, 0)?.point).toEqual(track[0]);
    expect(pointAtDistance(track, -50)?.point).toEqual(track[0]);
  });

  it("n'a rien à rendre sur une trace vide", () => {
    expect(pointAtDistance([], 100)).toBeUndefined();
  });

  it('interpole entre deux points plutôt que de coller au suivant', () => {
    const track = straightTrack(2, 100);
    const found = pointAtDistance(track, 50);

    expect(found?.atMetres).toBe(50);
    expect(found?.afterIndex).toBe(0);
    const from = track[0];
    const point = found?.point;
    if (from === undefined || point === undefined) throw new Error('trace incomplète');
    expect(distanceBetween(from, point)).toBeCloseTo(50, 1);
  });

  it('marche sur plusieurs segments', () => {
    const track = straightTrack(6, 100);
    const found = pointAtDistance(track, 350);
    expect(found?.afterIndex).toBe(3);
    const start = track[0];
    const point = found?.point;
    if (start === undefined || point === undefined) throw new Error('trace incomplète');
    expect(distanceBetween(start, point)).toBeCloseTo(350, 0);
  });

  it("rend undefined quand la trace est plus courte que demandé — le cas d'une trace purgée", () => {
    expect(pointAtDistance(straightTrack(3, 100), 5_000)).toBeUndefined();
  });

  it("absorbe l'écart d'arrondi de fin de trace plutôt que de perdre le dernier repère", () => {
    // Le serveur mesure sur les points bruts, le client marche une polyline
    // arrondie : 2 000 m tombent quelques mètres après le dernier point.
    const track = straightTrack(21, 100);
    const found = pointAtDistance(track, 2_000);

    expect(found?.point).toEqual(track[track.length - 1]);
    expect(found?.atMetres).toBeLessThan(2_000);
    expect(found?.atMetres).toBeGreaterThan(1_950);
  });

  it('survit à deux points superposés : un coureur arrêté au feu', () => {
    const stalled: GeoPoint[] = [
      { latitude: 48.86, longitude: 2.33 },
      { latitude: 48.86, longitude: 2.33 },
      { latitude: 48.86, longitude: 2.34 },
    ];
    const found = pointAtDistance(stalled, 0.000_1);
    expect(found?.point.latitude).toBe(48.86);
    expect(Number.isFinite(found?.point.longitude ?? Number.NaN)).toBe(true);
  });
});

describe('splitEndDistances', () => {
  it('cumule des longueurs de tronçon, parce que le serveur ne cumule pas', () => {
    const splits = [
      aSplit({ kilometreIndex: 1 }),
      aSplit({ kilometreIndex: 2 }),
      aSplit({ kilometreIndex: 3, distanceMetres: 420, complete: false }),
    ];
    expect(splitEndDistances(splits)).toEqual([1000, 2000, 2420]);
  });

  it('ne cumule rien sans split', () => {
    expect(splitEndDistances([])).toEqual([]);
  });
});

describe('kilometreMarks', () => {
  const track = straightTrack(31, 100); // 3 000 m

  it('pose un repère par kilomètre complet', () => {
    const marks = kilometreMarks(track, [
      aSplit({ kilometreIndex: 1 }),
      aSplit({ kilometreIndex: 2 }),
    ]);
    expect(marks.map((mark) => mark.kilometreIndex)).toEqual([1, 2]);
    expect(marks[0]?.atMetres).toBe(1000);
  });

  it('laisse de côté le dernier kilomètre partiel', () => {
    const marks = kilometreMarks(track, [
      aSplit({ kilometreIndex: 1 }),
      aSplit({ kilometreIndex: 2, distanceMetres: 380, complete: false }),
    ]);
    expect(marks).toHaveLength(1);
  });

  it('laisse de côté un kilomètre que la trace ne porte pas', () => {
    const marks = kilometreMarks(straightTrack(5, 100), [aSplit({ kilometreIndex: 1 })]);
    expect(marks).toEqual([]);
  });
});

describe('boundingBoxAround', () => {
  it('encadre le point demandé', () => {
    const box = boundingBoxAround({ latitude: 48.86, longitude: 2.33 }, 250);
    expect(box.south).toBeLessThan(48.86);
    expect(box.north).toBeGreaterThan(48.86);
    expect(box.west).toBeLessThan(2.33);
    expect(box.east).toBeGreaterThan(2.33);
  });

  it('reste dans les bornes terrestres près du pôle', () => {
    const box = boundingBoxAround({ latitude: 89.999, longitude: 179.9 }, 100_000);
    expect(box.north).toBeLessThanOrEqual(90);
    expect(box.east).toBeLessThanOrEqual(180);
    expect(box.west).toBeGreaterThanOrEqual(-180);
  });
});

describe('ActivityMapPresenter — une trace terminée', () => {
  const track = straightTrack(21, 100); // 2 000 m
  const splits = [aSplit({ kilometreIndex: 1 }), aSplit({ kilometreIndex: 2 })];

  it("dessine d'un coup, pose ses marqueurs et cadre la trace", () => {
    const renderer = new FakeMapRenderer();
    new ActivityMapPresenter(renderer, labels).showTrack(track, splits);

    expect(renderer.traces).toHaveLength(1);
    expect(renderer.appended).toHaveLength(0);
    expect(renderer.fits).toHaveLength(1);
    expect(renderer.fits[0]?.animated).toBe(false);
    expect(renderer.lastMarkers.map((marker) => marker.id)).toEqual([
      'start',
      'km-1',
      'km-2',
      'finish',
    ]);
  });

  it('nomme chaque marqueur : §5, un repère porte du sens, donc il se dit', () => {
    const renderer = new FakeMapRenderer();
    new ActivityMapPresenter(renderer, labels).showTrack(track, splits);

    expect(renderer.lastMarkers.map((marker) => marker.accessibilityLabel)).toEqual([
      'Départ',
      'Kilomètre 1',
      'Kilomètre 2',
      'Arrivée',
    ]);
  });

  it("ne pose pas d'arrivée sur le départ quand la trace tient en un point", () => {
    const renderer = new FakeMapRenderer();
    new ActivityMapPresenter(renderer, labels).showTrack(track.slice(0, 1), []);

    expect(renderer.lastMarkers.map((marker) => marker.kind)).toEqual(['start']);
  });

  it("n'a aucun marqueur à poser sur une trace vide, et rien à cadrer", () => {
    const renderer = new FakeMapRenderer();
    new ActivityMapPresenter(renderer, labels).showTrack([], []);

    expect(renderer.lastMarkers).toEqual([]);
    expect(renderer.fits).toHaveLength(0);
  });
});

describe('ActivityMapPresenter — le cadrage', () => {
  it('montre la forme seule quand on le lui demande', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);

    presenter.showTrack(straightTrack(5, 100), [], { markers: false });

    // Sur une vignette, deux épingles couvrent le tracé qu'elles situent.
    expect(renderer.lastMarkers).toEqual([]);
    expect(renderer.traces).toHaveLength(1);
  });

  it('ne recule pas jusqu’à la région pour une trace d’un mètre', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);

    // Une course qui vient de démarrer : deux points à quelques mètres l'un de
    // l'autre. Cadrer leur boîte telle quelle, c'est afficher un département.
    presenter.showTrack([
      { latitude: 50.63, longitude: 3.06 },
      { latitude: 50.630005, longitude: 3.060005 },
    ]);

    const framed = renderer.fits[0];
    if (framed === undefined) throw new Error('cadrage attendu');
    expect((framed.box.north - framed.box.south) * 111_320).toBeGreaterThan(300);
  });
});

describe('ActivityMapPresenter — la position avant le départ', () => {
  const here = { latitude: 50.63, longitude: 3.06 };

  it('pose le visage du coureur quand la carte est la sienne', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, {
      ...labels,
      runnerAvatar: { uri: 'https://exemple.fr/moi.jpg', initial: 'T' },
    });

    presenter.showCurrentPosition(here);

    // Une photo dit « c'est vous » là où une épingle ne dit rien.
    expect(renderer.lastMarkers[0]?.avatar?.uri).toBe('https://exemple.fr/moi.jpg');
  });

  it('pose le coureur là où il est, et centre dessus', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);

    presenter.showCurrentPosition(here);

    expect(renderer.lastMarkers.map((marker) => marker.kind)).toEqual(['runner']);
    expect(renderer.followed).toHaveLength(1);
  });

  it('ne dessine aucune trace : la course n’a pas commencé', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);

    presenter.showCurrentPosition(here);

    expect(renderer.traces).toHaveLength(0);
  });

  it('laisse la vue à qui l’a prise, même si le point bouge', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    presenter.showCurrentPosition(here);
    renderer.pan();

    presenter.showCurrentPosition({ latitude: 50.64, longitude: 3.07 });

    // Le marqueur suit la position, mais la caméra ne bouge plus (§8).
    expect(renderer.lastMarkers[0]?.position.latitude).toBe(50.64);
    expect(renderer.followed).toHaveLength(1);
  });
});

describe('ActivityMapPresenter — le suivi, et la main rendue à l’utilisateur', () => {
  const snapshot = straightTrack(5, 100);

  it('suit le dernier point tant que personne ne touche à la vue', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);

    presenter.showLiveSnapshot(snapshot);
    presenter.appendLive(straightTrack(2, 100));

    expect(presenter.following).toBe(true);
    expect(renderer.appended).toHaveLength(1);
    expect(renderer.followed).toHaveLength(2);
    expect(renderer.lastMarkers.map((marker) => marker.kind)).toEqual(['start', 'runner']);
  });

  it('cesse de suivre dès que la vue est déplacée, et le dit une seule fois', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    const changed = vi.fn();
    presenter.onFollowingChanged(changed);

    presenter.showLiveSnapshot(snapshot);
    renderer.pan();
    renderer.pan();

    expect(presenter.following).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith(false);

    const followedBefore = renderer.followed.length;
    presenter.appendLive(straightTrack(1, 100));
    expect(renderer.followed).toHaveLength(followedBefore);
  });

  it('recentre sur demande, et se remet à suivre', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    presenter.showLiveSnapshot(snapshot);
    renderer.pan();

    presenter.recentre();

    expect(presenter.following).toBe(true);
    expect(renderer.followed[renderer.followed.length - 1]).toEqual(snapshot[snapshot.length - 1]);
  });

  it('recadre la trace entière quand on recentre une course terminée', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    presenter.showTrack(snapshot, []);
    renderer.pan();

    presenter.recentre();

    expect(renderer.fits).toHaveLength(2);
    expect(renderer.fits[1]?.animated).toBe(true);
    expect(renderer.followed).toHaveLength(0);
  });

  it("n'appelle pas la carte pour une rafale vide", () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    presenter.showLiveSnapshot(snapshot);

    presenter.appendLive([]);

    expect(renderer.appended).toHaveLength(0);
  });

  it("ne suit rien tant qu'aucun point n'est arrivé", () => {
    const renderer = new FakeMapRenderer();
    new ActivityMapPresenter(renderer, labels).showLiveSnapshot([]);
    expect(renderer.followed).toEqual([]);
  });
});

describe('ActivityMapPresenter — un split que l’on clique', () => {
  const track = straightTrack(21, 100);
  const splits = [aSplit({ kilometreIndex: 1 }), aSplit({ kilometreIndex: 2 })];

  it('cadre le kilomètre demandé et rend la vue à l’utilisateur', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    const changed = vi.fn();
    presenter.onFollowingChanged(changed);
    presenter.showTrack(track, splits);

    expect(presenter.focusKilometre(2)).toBe(true);

    expect(renderer.fits).toHaveLength(2);
    expect(renderer.fits[1]?.animated).toBe(true);
    expect(presenter.following).toBe(false);
    expect(changed).toHaveBeenCalledWith(false);
  });

  it('répond faux sur un kilomètre absent plutôt que de bouger la carte au hasard', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    presenter.showTrack(track, splits);

    expect(presenter.focusKilometre(9)).toBe(false);
    expect(renderer.fits).toHaveLength(1);
  });
});

describe('ActivityMapPresenter — la fin de vie', () => {
  it('se désabonne de la carte et de ses auditeurs', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    const changed = vi.fn();
    const unsubscribe = presenter.onFollowingChanged(changed);
    expect(renderer.listenerCount).toBe(1);

    presenter.dispose();
    presenter.dispose();

    expect(renderer.listenerCount).toBe(0);
    renderer.pan();
    expect(changed).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('laisse un auditeur se retirer seul', () => {
    const renderer = new FakeMapRenderer();
    const presenter = new ActivityMapPresenter(renderer, labels);
    const changed = vi.fn();
    presenter.onFollowingChanged(changed)();

    renderer.pan();

    expect(changed).not.toHaveBeenCalled();
  });
});

describe('TrackDecodingCancelled', () => {
  it('se reconnaît sans dépendre de son message', () => {
    expect(isTrackDecodingCancelled(new TrackDecodingCancelled())).toBe(true);
    expect(isTrackDecodingCancelled(new Error('autre chose'))).toBe(false);
  });

  it('décrit une trace que le décodeur a bien reçue', () => {
    // Le tour complet : ce que la passerelle rend est bien ce que la carte lit.
    const track = straightTrack(4, 100);
    expect(encodePolyline(track)).not.toBe('');
  });
});
