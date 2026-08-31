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
