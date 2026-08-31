import type { Page, PageRequest } from '../../shared/paging/page';
import type { NotificationId } from '../../shared/identity/ids';
import type { LiveMessage } from '../../live/domain/liveEvent';
import type { Notification } from '../domain/notification';
import type { NotificationPreferences } from '../domain/quietHours';

export interface NotificationGateway {
  inbox(page: PageRequest): Promise<Page<Notification>>;
  unreadCount(): Promise<number>;
  markRead(id: NotificationId): Promise<void>;
  markAllRead(): Promise<number>;
  preferences(): Promise<NotificationPreferences>;
  updatePreferences(preferences: NotificationPreferences): Promise<NotificationPreferences>;
}

/** The second SSE stream. Same shape as the live one, same resumption rules. */
export interface NotificationStream {
  open(request: {
    lastEventId?: string | undefined;
    onMessage: (message: LiveMessage) => void;
    onError: (error: unknown) => void;
  }): { close: () => void };
}
