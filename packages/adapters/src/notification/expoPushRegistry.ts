import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  deviceToken,
  type DevicePlatform,
  type DeviceToken,
  type PushRegistry,
  type RegisteredDevice,
} from '@runtrack/core';

/**
 * Push, on a device (§12).
 *
 * The port covers both halves — the platform token and the server that has to
 * know about it — so this holds a gateway. Neither half is useful alone: a
 * token nobody registered receives nothing, and a registration without a token
 * is a row pointing at no phone.
 *
 * Three things §12 asks for that are settled here:
 *
 *  - **the permission is asked after showing what it buys**, never on first
 *    launch. This class only asks; the explanation is the screen's job;
 *  - **the token is re-registered at every launch.** It changes on its own —
 *    a reinstall, a restored backup — and the server treats a repeat as a
 *    no-op, so re-registering costs one request and closes the hole where a
 *    phone silently stops receiving;
 *  - **no system banner while the app is in the foreground.** The handler below
 *    says so: the badge and the open screen update instead, which is what the
 *    notification stream already does.
 */
export interface DeviceRegistrar {
  register(token: DeviceToken, platform: string): Promise<void>;
  remove(token: DeviceToken): Promise<void>;
}

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      // §12: "l'application au premier plan n'affiche pas de bannière système".
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
});

function platformOf(): DevicePlatform {
  return Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
}

export class ExpoPushRegistry implements PushRegistry {
  constructor(private readonly devices: DeviceRegistrar) {}

  async currentToken(): Promise<DeviceToken | undefined> {
    // A simulator has no push token, and asking for one there throws rather
    // than returning nothing.
    if (!Device.isDevice) return undefined;

    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== Notifications.PermissionStatus.GRANTED) return undefined;

    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' ? deviceToken(token.data) : undefined;
  }

  async requestPermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === Notifications.PermissionStatus.GRANTED) return true;
    // A refusal cannot be re-asked: the system dialog is one-shot, and past it
    // the only way back is the settings app.
    if (!current.canAskAgain) return false;

    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === Notifications.PermissionStatus.GRANTED;
  }

  async register(device: RegisteredDevice): Promise<void> {
    await this.devices.register(device.token, device.platform);
  }

  async unregister(token: DeviceToken): Promise<void> {
    await this.devices.remove(token);
  }

  /**
   * The launch routine: token, then registration. Silent on failure — a phone
   * that cannot register still records runs, and an error dialog at start-up
   * about a feature nobody asked for yet is worse than none.
   */
  async registerCurrentDevice(): Promise<DeviceToken | undefined> {
    const token = await this.currentToken();
    if (token === undefined) return undefined;
    await this.register({ token, platform: platformOf() });
    return token;
  }
}
