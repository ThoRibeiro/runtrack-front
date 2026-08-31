import type { ActivityStats, ActivityStatus } from '../../activity/domain/activity';
import type { LivePosition } from '../../activity/domain/track';

/**
 * What a spectator receives while an activity is running (§7). Named events on
 * the wire: `position`, `stats`, `status`, `heartbeat`.
 *
 * There is no `snapshot` event, and that is deliberate on the server's side: on
 * connection it replays a `status`, a `stats` and up to two hundred `position`
 * events. The client draws the map in one go and then follows — the same code
 * path either way, which is exactly what §7 asks for ("ton code doit gérer les
 * deux sans distinction").
 */
export type LiveEvent =
  | { kind: 'position'; position: LivePosition }
  | { kind: 'stats'; stats: ActivityStats }
  | { kind: 'status'; status: ActivityStatus }
  | { kind: 'heartbeat'; at: number };

/** One raw message off the transport, before it is understood. */
export interface LiveMessage {
  /** The SSE `id:`. Sent back as `Last-Event-ID` to resume without a gap. */
  id?: string | undefined;
  event: string;
  data: unknown;
}
