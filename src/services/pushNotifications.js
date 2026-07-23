import { Platform, PermissionsAndroid } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging, requestPermission, AuthorizationStatus, getToken, onTokenRefresh,
  onMessage, onNotificationOpenedApp, getInitialNotification,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { api } from '../api/client';
import { goToRoute, routeForPush } from './pushNav';

export const CHANNEL_ID = 'reconnct-default';

// Android 13+ needs the runtime POST_NOTIFICATIONS permission on top of the
// FCM/notifee wiring, or nothing ever shows in the tray.
export async function ensureNotificationPermission() {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33) return true;
  try {
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (already) return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'reconnct',
    importance: AndroidImportance.HIGH,
  });
}

// Foreground messages never auto-display on Android — FCM only hands them to
// onMessage — so we render them ourselves via notifee, carrying the same
// `data` payload the background/quit paths route on.
async function displayForeground(remoteMessage) {
  try {
    await ensureChannel();
    const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'reconnct';
    const body = remoteMessage.notification?.body || remoteMessage.data?.body || '';
    const id = await notifee.displayNotification({
      title,
      body,
      data: remoteMessage.data || {},
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        color: '#FFB900',
        pressAction: { id: 'default' },
      },
    });
    console.warn('[push] displayForeground OK, notification id:', id);
  } catch (e) {
    console.warn('[push] displayForeground FAILED:', e.message);
  }
}

let wired = false;

// Registers every listener needed for tap-to-open across all three app
// states. Background/quit taps come from the OS-displayed notification (the
// `notification` block the backend sends alongside `data`) via RNFirebase's
// own handlers; foreground taps come from the notifee notification we
// display ourselves in displayForeground(). Safe to call more than once —
// only wires up on the first call.
export function wirePushHandlers() {
  if (wired) return;
  wired = true;
  const messaging = getMessaging(getApp());

  onMessage(messaging, async (remoteMessage) => {
    console.warn('[push] onMessage received:', JSON.stringify(remoteMessage.data), remoteMessage.notification?.title);
    await displayForeground(remoteMessage);
  });
  console.warn('[push] wirePushHandlers registered');

  onNotificationOpenedApp(messaging, (remoteMessage) => {
    goToRoute(routeForPush(remoteMessage?.data));
  });

  getInitialNotification(messaging).then((remoteMessage) => {
    if (remoteMessage) goToRoute(routeForPush(remoteMessage.data));
  }).catch(() => {});

  notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) goToRoute(routeForPush(detail.notification?.data));
  });
}

// Requests permission, pulls the device's FCM token, and registers it with
// the backend against the signed-in user — call once an auth token exists.
// Get this device's FCM token (after ensuring permission). Shared by the user
// and supplier registration paths below.
async function getDeviceFcmToken() {
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  const messaging = getMessaging(getApp());
  await requestPermission(messaging).catch(() => AuthorizationStatus.DENIED);
  return { messaging, fcmToken: await getToken(messaging) };
}

// Same account for both traveller and host mode (Switch to Hosting is the
// same User row), so one token covers both.
export async function registerPushToken(authToken) {
  if (!authToken) return;
  try {
    const r = await getDeviceFcmToken();
    if (!r || !r.fcmToken) return;
    await api.registerPushToken(authToken, r.fcmToken).catch((e) => { console.warn('[push] register API failed:', e.message); });
    onTokenRefresh(r.messaging, (newToken) => { api.registerPushToken(authToken, newToken).catch(() => {}); });
  } catch (e) {
    console.warn('[push] registerPushToken failed:', e.message);
  }
}

// A supplier signed in on their own portal — register the device against the
// SUPPLIER so a booking on their listing pushes to this phone.
export async function registerSupplierPushToken(supplierToken) {
  if (!supplierToken) return;
  try {
    const r = await getDeviceFcmToken();
    if (!r || !r.fcmToken) return;
    await api.registerSupplierPushToken(supplierToken, r.fcmToken).catch((e) => { console.warn('[push] supplier register failed:', e.message); });
    onTokenRefresh(r.messaging, (newToken) => { api.registerSupplierPushToken(supplierToken, newToken).catch(() => {}); });
  } catch (e) {
    console.warn('[push] registerSupplierPushToken failed:', e.message);
  }
}
