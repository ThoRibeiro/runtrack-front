import {
  NOTIFICATION_TYPES,
  notificationId,
  quietHours,
  userId,
  type Notification,
  type NotificationPreferences,
  type QuietHours,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import { narrow, required, toInstant, toOptionalInstant, toOptionalString } from './primitives';

type NotificationResponse = components['schemas']['NotificationResponse'];
type PreferencesResponse = components['schemas']['PreferencesResponse'];
type QuietHoursDto = components['schemas']['QuietHoursDto'];
type DeviceResponse = components['schemas']['DeviceResponse'];

/**
 * A notification kind this build has never heard of falls back rather than
 * throwing: a newer server may add one, and a single unknown kind must not take
 * down a whole inbox. It still shows — with a generic wording and its deep
 * link, which is what makes it useful at all.
 */
export function toNotification(dto: NotificationResponse): Notification {
  const createdAt = toInstant(required(dto.createdAt, 'date de notification'));
  const actor = toOptionalString(dto.actorId);

  return {
    id: notificationId(required(dto.id, 'id de notification')),
    type: narrow(dto.type, NOTIFICATION_TYPES, 'NEW_FOLLOWER'),
    createdAt,
    readAt: toOptionalInstant(dto.readAt),
    unread: dto.unread ?? false,
    actorId: actor === undefined ? undefined : userId(actor),
    deepLink: dto.deepLink ?? '',
    // A server that sends nothing means "one fact", not "no facts".
    aggregateCount: dto.aggregateCount ?? 1,
  };
}

/** "22:00:00" — the wire speaks local time, the hexagon speaks minutes. */
export function toMinutes(localTime: string): number {
  const [hours, minutes] = localTime.split(':');
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);
  if (!Number.isInteger(parsedHours) || !Number.isInteger(parsedMinutes)) {
    throw new RangeError(`Heure locale illisible : ${localTime}`);
  }
  return parsedHours * 60 + parsedMinutes;
}

export function toLocalTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}:00`;
}

/**
 * The parameter is `Partial` on purpose.
 *
 * The OpenAPI description marks the three fields required, and a `null`
 * `quietHours` is how the server says "none at all" — but the description is
 * generated, and a field it promises is still a field that can arrive missing.
 * Typing the boundary as partial is what makes the checks below legitimate
 * rather than dead code the linter is right to complain about.
 */
export function toQuietHours(dto: Partial<QuietHoursDto> | undefined): QuietHours | undefined {
  if (dto?.from === undefined || dto.to === undefined || dto.zone === undefined) return undefined;
  return quietHours(toMinutes(dto.from), toMinutes(dto.to), dto.zone);
}

export function toPreferences(dto: PreferencesResponse): NotificationPreferences {
  return {
    mutedTypes: dto.muted ?? [],
    quietHours: toQuietHours(dto.quietHours),
    // §12's settings screen enumerates this rather than a constant of its own.
    availableTypes: dto.available ?? [...NOTIFICATION_TYPES],
  };
}

export interface Device {
  token: string;
  platform: string;
  registeredAt: number | undefined;
}

export function toDevice(dto: DeviceResponse): Device {
  return {
    token: required(dto.token, 'jeton d’appareil'),
    platform: dto.platform ?? 'ANDROID',
    registeredAt: toOptionalInstant(dto.registeredAt),
  };
}
