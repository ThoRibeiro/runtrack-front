import type { DeviceToken } from '../../shared/identity/ids';

/**
 * FCM and APNs tokens. Nothing on the web, which is why the whole thing is a
 * port: the web adapter is a no-op rather than a branch in a use case.
 */
export const DEVICE_PLATFORMS = ['IOS', 'ANDROID'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export interface RegisteredDevice {
  token: DeviceToken;
  platform: DevicePlatform;
}

export interface PushRegistry {
  /**
   * §12: the token changes on its own — a reinstall, a restored backup. It is
   * re-registered on every launch, and the server treats that as a no-op.
   */
  currentToken(): Promise<DeviceToken | undefined>;
  requestPermission(): Promise<boolean>;
  register(device: RegisteredDevice): Promise<void>;
  unregister(token: DeviceToken): Promise<void>;
}
