import type { DeviceToken } from '@runtrack/core';
import type { components } from '../generated/schema';
import type { HttpClient } from '../http/httpClient';
import { toDevice, type Device } from '../mappers/notification';

type DeviceListResponse = components['schemas']['DeviceListResponse'];

/**
 * The devices that may be pushed to (§12).
 *
 * Not a port of its own: `PushRegistry` is the port, and it needs both a
 * platform (the token, the permission) and a server. This is the server half,
 * and the Expo adapter holds one.
 *
 * Registering is **idempotent by contract**: §12 says the token is
 * re-registered on every launch — it changes on a reinstall or a restored
 * backup — and the server treats a repeat as a no-op.
 */
export class HttpDeviceGateway {
  constructor(private readonly http: HttpClient) {}

  async register(token: DeviceToken, platform: string): Promise<void> {
    await this.http.requestVoid('/user/v1/me/devices', {
      method: 'POST',
      body: { token, platform },
    });
  }

  async list(): Promise<readonly Device[]> {
    const dto = await this.http.request<DeviceListResponse>('/user/v1/me/devices');
    return (dto.items ?? []).map(toDevice);
  }

  async remove(token: DeviceToken): Promise<void> {
    await this.http.requestVoid(`/user/v1/me/devices/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
  }
}
