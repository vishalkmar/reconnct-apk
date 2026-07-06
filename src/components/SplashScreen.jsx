import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

// App-open splash (Figma "Login_Opening" frame): solid brand-orange screen with
// the centered "reconnct" wordmark. Shown for a fixed ~1.2s on launch (see
// App.jsx) while providers/session-restore load underneath, then dismisses
// automatically into whatever screen is ready (login or home).
export default function SplashScreen() {
  return (
    <View style={styles.wrap}>
      <StatusBar barStyle="light-content" backgroundColor="#F9B402" />
      <Text style={styles.logo}>reconnct</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F9B402',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  logo: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
});
