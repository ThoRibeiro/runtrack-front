import { paceParts, splitSeconds, type SecondsPerKm } from '@runtrack/core';

/**
 * Numbers, as a French-speaking runner reads them.
 *
 * The split into parts is `packages/core`'s job — it is arithmetic. What
 * happens here is the *wording*: a comma for the decimal separator, a leading
 * zero on seconds, and the spoken form a screen reader needs, which is never
 * the written one. "5:12/km" read out is "cinq deux-points douze barre k m".
 */
const DECIMAL = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const WHOLE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function formatKilometres(metres: number): string {
  return DECIMAL.format(metres / 1000);
}

export function formatWhole(value: number): string {
  return WHOLE.format(value);
}

const twoDigits = (value: number): string => String(value).padStart(2, '0');

/** `1:04:22` beyond an hour, `4:22` under it — never `0:04:22`. */
export function formatDuration(seconds: number): string {
  const parts = splitSeconds(seconds);
  return parts.hours > 0
    ? `${String(parts.hours)}:${twoDigits(parts.minutes)}:${twoDigits(parts.seconds)}`
    : `${String(parts.minutes)}:${twoDigits(parts.seconds)}`;
}

export function formatPace(pace: SecondsPerKm | undefined): string {
  if (pace === undefined) return '—';
  const parts = paceParts(pace);
  return parts.hours > 0
    ? `${String(parts.hours)}:${twoDigits(parts.minutes)}:${twoDigits(parts.seconds)}`
    : `${String(parts.minutes)}:${twoDigits(parts.seconds)}`;
}

/** "1 heure 4 minutes 22 secondes" — what a screen reader should say. */
export function spokenDuration(seconds: number): string {
  const parts = splitSeconds(seconds);
  const said: string[] = [];
  if (parts.hours > 0) said.push(`${String(parts.hours)} heure${parts.hours > 1 ? 's' : ''}`);
  if (parts.minutes > 0)
    said.push(`${String(parts.minutes)} minute${parts.minutes > 1 ? 's' : ''}`);
  if (parts.seconds > 0 || said.length === 0) {
    said.push(`${String(parts.seconds)} seconde${parts.seconds > 1 ? 's' : ''}`);
  }
  return said.join(' ');
}

export function spokenPace(pace: SecondsPerKm | undefined): string {
  if (pace === undefined) return 'allure inconnue';
  const parts = paceParts(pace);
  const minutes = parts.hours * 60 + parts.minutes;
  return `${String(minutes)} minute${minutes > 1 ? 's' : ''} ${String(parts.seconds)} par kilomètre`;
}

/**
 * Le jour d'une course, tel qu'on le dit : « 3 sept. ».
 *
 * Sans l'année quand c'est cette année — elle n'apprend rien et prend la place
 * du titre à côté. `Intl` fait le travail, y compris l'abréviation du mois, que
 * personne n'a envie de maintenir à la main pour douze valeurs.
 */
export function formatDay(instant: number, now: number = Date.now()): string {
  const date = new Date(instant);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}

/**
 * Une vitesse en kilomètres par heure, à partir d'une allure.
 *
 * À vélo, personne ne pense en minutes par kilomètre : on roule à 24 km/h, on ne
 * roule pas à 2:30/km. À pied, c'est l'inverse — et c'est le **type de course**
 * qui tranche, pas la mesure : afficher l'instantanée en km/h et la moyenne en
 * min/km sur le même écran donnerait deux nombres qu'on ne peut pas comparer.
 */
export function formatSpeed(pace: SecondsPerKm | undefined): string {
  if (pace === undefined || pace <= 0) return '—';
  const kilometresPerHour = 3_600 / pace;
  return kilometresPerHour.toFixed(1).replace('.', ',');
}

export function spokenSpeed(pace: SecondsPerKm | undefined): string {
  if (pace === undefined || pace <= 0) return 'vitesse inconnue';
  return `${formatSpeed(pace)} kilomètres par heure`;
}
