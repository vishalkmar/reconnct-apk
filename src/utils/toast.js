import { ToastAndroid, Platform, Alert } from 'react-native';

// Lightweight toast — native Android toast, Alert fallback elsewhere.
export function toast(message) {
  if (!message) return;
  const msg = String(message);
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert(msg);
}
