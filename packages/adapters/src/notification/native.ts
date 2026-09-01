/**
 * Push, mobile only (§12).
 *
 * A separate entry point for the same reason as recording: importing this
 * installs a notification handler, and a browser has neither a push token nor
 * anything to install it into.
 */
export { ExpoPushRegistry } from './expoPushRegistry';
export type { DeviceRegistrar } from './expoPushRegistry';
export { deepLinkPath, parseNotificationResponse } from './deepLinks';
