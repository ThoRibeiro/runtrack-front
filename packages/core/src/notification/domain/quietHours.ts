import type { Instant } from '../../shared/time/clock';

/**
 * The window during which the phone stays silent, expressed in the recipient's
 * own time zone.
 *
 * The zone is not decoration: "not before 7 a.m." only means anything where the
 * person is. Storing a bare time would wake a runner in Nouméa at what is 7 a.m.
 * in Paris.
 *
 * The usual window crosses midnight — 22:00 to 07:00 — so the comparison cannot
 * be a simple range check. When the start is after the end, the window is the
 * union of "after the start" and "before the end".
 *
 * `Intl` does the zone arithmetic. It is ECMAScript, not a platform API, so the
 * hexagon may use it — but a Hermes build compiled without Intl would not have
 * it, which is why the shells are the ones that pick the zone name.
 */
export interface QuietHours {
  /** Minutes since midnight, local to `zone`. */
  fromMinutes: number;
  toMinutes: number;
  /** An IANA name: "Europe/Paris". */
  zone: string;
}

const MINUTES_PER_DAY = 24 * 60;

export function quietHours(fromMinutes: number, toMinutes: number, zone: string): QuietHours {
  for (const value of [fromMinutes, toMinutes]) {
    if (!Number.isInteger(value) || value < 0 || value >= MINUTES_PER_DAY) {
      throw new RangeError('Une heure calme se situe entre 0 et 1439 minutes.');
    }
  }
  if (fromMinutes === toMinutes) {
    // An empty window and a 24-hour window would be written the same way.
    // Refusing lifts the ambiguity rather than picking one at random — the same
    // decision the server made.
    throw new RangeError(
      'Heures calmes de durée nulle ou totale : utilise l’absence de plage pour ne rien couper.',
    );
  }
  return { fromMinutes, toMinutes, zone };
}

/** Minutes since local midnight in the given zone. */
export function localMinutes(moment: Instant, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(moment));

  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;
  if (hour === undefined || minute === undefined) {
    throw new RangeError(`Fuseau horaire inutilisable : ${zone}`);
  }
  // "24:00" is how some locales spell midnight.
  return (Number(hour) % 24) * 60 + Number(minute);
}

export function covers(window: QuietHours, moment: Instant): boolean {
  const minutes = localMinutes(moment, window.zone);
  return window.fromMinutes < window.toMinutes
    ? minutes >= window.fromMinutes && minutes < window.toMinutes
    : minutes >= window.fromMinutes || minutes < window.toMinutes;
}

export interface NotificationPreferences {
  mutedTypes: readonly string[];
  quietHours: QuietHours | undefined;
  /**
   * Every kind the **server** knows about.
   *
   * It comes down with the preferences rather than being a constant here, and
   * the server's own comment says why: a settings screen holding its own list
   * diverges from the server's the first time a kind is added. `NOTIFICATION_TYPES`
   * stays, for the switches that have to be exhaustive at compile time; this is
   * what the screen enumerates.
   */
  availableTypes: readonly string[];
}

/** Whether a notification of this type should reach the phone right now. */
export function shouldNotify(
  preferences: NotificationPreferences,
  type: string,
  moment: Instant,
): boolean {
  if (preferences.mutedTypes.includes(type)) return false;
  if (preferences.quietHours === undefined) return true;
  return !covers(preferences.quietHours, moment);
}
