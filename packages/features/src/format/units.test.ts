import { effortOf, usesSpeed } from './effort';
import {
  formatDay,
  formatSpeed,
  formatDuration,
  formatKilometres,
  formatPace,
  spokenDuration,
  spokenPace,
} from './units';

describe('distances', () => {
  it('rend des kilomètres avec la virgule décimale', () => {
    expect(formatKilometres(12_400)).toBe('12,4');
    expect(formatKilometres(0)).toBe('0,0');
  });
});

describe('durées', () => {
  it('cache les heures quand il n’y en a pas', () => {
    expect(formatDuration(262)).toBe('4:22');
  });

  it('les montre quand il y en a', () => {
    expect(formatDuration(3_862)).toBe('1:04:22');
  });

  it('remplit les secondes à deux chiffres', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('se prononce en toutes lettres', () => {
    expect(spokenDuration(3_862)).toBe('1 heure 4 minutes 22 secondes');
    expect(spokenDuration(62)).toBe('1 minute 2 secondes');
    expect(spokenDuration(0)).toBe('0 seconde');
  });
});

describe('allures', () => {
  it('rend minutes et secondes par kilomètre', () => {
    expect(formatPace(312)).toBe('5:12');
  });

  it('garde les heures pour une marche très lente', () => {
    expect(formatPace(3_915)).toBe('1:05:15');
  });

  it('n’invente pas d’allure quand il n’y en a pas', () => {
    // Afficher « 0:00 » ferait croire à une allure mesurée.
    expect(formatPace(undefined)).toBe('—');
    expect(spokenPace(undefined)).toBe('allure inconnue');
  });

  it('se prononce autrement qu’il ne s’écrit', () => {
    // « 5:12/km » lu tel quel donne « cinq deux-points douze barre k m ».
    expect(spokenPace(312)).toBe('5 minutes 12 par kilomètre');
  });
});

describe('le jour d’une course', () => {
  const IN_2026 = Date.UTC(2026, 8, 3, 10, 0, 0);

  it('dit le jour et le mois, sans l’année quand c’est cette année', () => {
    expect(formatDay(IN_2026, IN_2026)).toBe('3 sept.');
  });

  it('ajoute l’année quand la course est plus vieille', () => {
    // Sinon deux « 3 sept. » à un an d'écart seraient indiscernables.
    expect(formatDay(Date.UTC(2025, 8, 3), IN_2026)).toContain('2025');
  });
});

describe('vitesse et allure, selon le type', () => {
  it('rend une vitesse en kilomètres par heure', () => {
    // 2:30 par kilomètre, c'est 24 km/h : la même mesure, dite autrement.
    expect(formatSpeed(150)).toBe('24,0');
    expect(formatSpeed(undefined)).toBe('—');
  });

  it('donne au vélo des km/h et à la course des min/km', () => {
    // Les deux mesures d'un même écran partagent l'unité : sinon l'instantanée
    // et la moyenne ne se comparent plus.
    expect(effortOf('BIKE', 150).unit).toBe('km/h');
    expect(effortOf('BIKE', 150).value).toBe('24,0');
    expect(effortOf('RUN', 300).unit).toBe('min/km');
    expect(effortOf('RUN', 300).value).toBe('5:00');
    expect(usesSpeed('TRAIL')).toBe(false);
    expect(usesSpeed('WALK')).toBe(false);
  });
});
