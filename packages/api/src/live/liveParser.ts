import type { LiveEvent, LiveMessage } from '@runtrack/core';
import type { components } from '../generated/schema';
import { toStats, toStatus } from '../mappers/activity';
import { toInstant } from '../mappers/primitives';

/**
 * One raw SSE message into the event the hexagon understands (§7).
 *
 * Everything here **returns `undefined` rather than throwing**, and that is the
 * whole design. A live stream runs for hours; one malformed frame — a field the
 * server added, a truncated payload, an event kind from a newer build — must
 * cost that frame and nothing else. Throwing would take down the stream, and
 * with it the map of a run someone is watching.
 *
 * The `id` is not read here: `LiveSession` records it for every message,
 * including the ones this drops, because resuming from an older id makes the
 * server replay everything in between.
 */
type StatsResponse = components['schemas']['StatsResponse'];

interface PositionPayload {
  sequenceNumber: number;
  latitude: number;
  longitude: number;
  elevation: number;
  recordedAt: string;
  heartRate?: number;
}

interface StatusPayload {
  status: string;
  since: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numberAt(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringAt(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === 'string' ? value : undefined;
}

function toPositionPayload(data: unknown): PositionPayload | undefined {
  if (!isObject(data)) return undefined;

  const sequenceNumber = numberAt(data, 'sequenceNumber');
  const latitude = numberAt(data, 'latitude');
  const longitude = numberAt(data, 'longitude');
  const recordedAt = stringAt(data, 'recordedAt');
  if (
    sequenceNumber === undefined ||
    latitude === undefined ||
    longitude === undefined ||
    recordedAt === undefined
  ) {
    return undefined;
  }

  const payload: PositionPayload = {
    sequenceNumber,
    latitude,
    longitude,
    // Elevation is optional on the wire in practice: a phone without a
    // barometer sends nothing, and a missing metre is not a missing point.
    elevation: numberAt(data, 'elevation') ?? 0,
    recordedAt,
  };
  const heartRate = numberAt(data, 'heartRate');
  return heartRate === undefined ? payload : { ...payload, heartRate };
}

function toStatusPayload(data: unknown): StatusPayload | undefined {
  if (!isObject(data)) return undefined;
  const status = stringAt(data, 'status');
  const since = stringAt(data, 'since');
  return status === undefined || since === undefined ? undefined : { status, since };
}

/**
 * The stats payload is the same `StatsResponse` as `GET /race/v1/{id}` — the
 * server serialises it once, on purpose — so it goes through the same mapper.
 */
function toStatsPayload(data: unknown): StatsResponse | undefined {
  return isObject(data) ? data : undefined;
}

export function parseLiveEvent(message: LiveMessage): LiveEvent | undefined {
  try {
    switch (message.event) {
      case 'position': {
        const payload = toPositionPayload(message.data);
        if (payload === undefined) return undefined;
        return {
          kind: 'position',
          position: {
            sequenceNumber: payload.sequenceNumber,
            position: { latitude: payload.latitude, longitude: payload.longitude },
            elevationMetres: payload.elevation,
            recordedAt: toInstant(payload.recordedAt),
            heartRate: payload.heartRate,
          },
        };
      }
      case 'stats': {
        const payload = toStatsPayload(message.data);
        return payload === undefined ? undefined : { kind: 'stats', stats: toStats(payload) };
      }
      case 'status': {
        const payload = toStatusPayload(message.data);
        if (payload === undefined) return undefined;
        const since = toInstant(payload.since);
        return { kind: 'status', status: toStatus(payload.status, since, since) };
      }
      case 'heartbeat': {
        // Its payload is the server's clock, quoted. What matters is that it
        // arrived at all — §7 makes *silence* the reconnection signal.
        const at = typeof message.data === 'string' ? Date.parse(message.data) : Number.NaN;
        return { kind: 'heartbeat', at: Number.isNaN(at) ? 0 : at };
      }
      default:
        return undefined;
    }
  } catch {
    // `toInstant` and `toStatus` throw on values this build cannot read. One
    // unreadable frame costs that frame — never the stream.
    return undefined;
  }
}
