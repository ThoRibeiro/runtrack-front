import type {
  NotificationGateway,
  NotificationId,
  NotificationPreferences,
  Notification,
  Page,
  PageRequest,
} from '@runtrack/core';
import type { components } from '../generated/schema';
import { toPage, type CursorPage, type HttpClient } from '../http/httpClient';
import { toLocalTime, toNotification, toPreferences } from '../mappers/notification';

type NotificationResponse = components['schemas']['NotificationResponse'];
type PreferencesResponse = components['schemas']['PreferencesResponse'];
type UnreadCountResponse = components['schemas']['UnreadCountResponse'];
type MarkAllReadResponse = components['schemas']['MarkAllReadResponse'];

/**
 * The inbox (§12). The paths are the back-end's, not the brief's — same
 * discrepancy as lot 3, §1.
 *
 * The preferences endpoint is a **PATCH that replaces the whole list**, and the
 * server's own comment says why: the settings screen knows the complete state,
 * and a replace cannot drift the way an add/remove pair can.
 */
export class HttpNotificationGateway implements NotificationGateway {
  constructor(private readonly http: HttpClient) {}

  async inbox(page: PageRequest): Promise<Page<Notification>> {
    const dto = await this.http.request<CursorPage<NotificationResponse>>('/notification/v1', {
      query: { cursor: page.cursor, limit: page.limit },
    });
    return toPage(dto, toNotification);
  }

  async unreadCount(): Promise<number> {
    const dto = await this.http.request<UnreadCountResponse>('/notification/v1/unread-count');
    return dto.unread ?? 0;
  }

  async markRead(id: NotificationId): Promise<void> {
    await this.http.requestVoid(`/notification/v1/${id}/read`, { method: 'POST' });
  }

  async markAllRead(): Promise<number> {
    const dto = await this.http.request<MarkAllReadResponse>('/notification/v1/read-all', {
      method: 'POST',
    });
    return dto.marked ?? 0;
  }

  async preferences(): Promise<NotificationPreferences> {
    const dto = await this.http.request<PreferencesResponse>(
      '/user/v1/me/notification-preferences',
    );
    return toPreferences(dto);
  }

  async updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    const dto = await this.http.request<PreferencesResponse>(
      '/user/v1/me/notification-preferences',
      {
        method: 'PATCH',
        body: {
          muted: [...preferences.mutedTypes],
          // `null` and not "absent": the server reads the field to mean "no
          // quiet hours at all", and omitting it would leave the old window in
          // place — a runner who turned them off would still be silenced.
          quietHours:
            preferences.quietHours === undefined
              ? null
              : {
                  from: toLocalTime(preferences.quietHours.fromMinutes),
                  to: toLocalTime(preferences.quietHours.toMinutes),
                  zone: preferences.quietHours.zone,
                },
        },
      },
    );
    return toPreferences(dto);
  }
}
