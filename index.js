/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import App from './App.jsx';
import { name as appName } from './app.json';
import { goToRoute, routeForPush } from './src/services/pushNav';

// Required by RNFirebase even when there's nothing to do here — the OS
// auto-displays the notification block for background/killed-state
// messages, so the actual work is just acknowledging receipt.
setBackgroundMessageHandler(getMessaging(getApp()), async () => {});

// Only fires for notifications WE displayed via notifee (the foreground
// path) that get tapped after the app drops to background before the user
// taps it — background/quit taps on the OS-shown notification are handled
// by RNFirebase's own onNotificationOpenedApp/getInitialNotification.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) goToRoute(routeForPush(detail.notification?.data));
});

AppRegistry.registerComponent(appName, () => App);
