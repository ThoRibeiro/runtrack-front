import { formatDuration, formatKilometres, formatPace, spokenDuration, spokenPace } from './units';

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
