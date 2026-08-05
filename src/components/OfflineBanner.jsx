import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font } from '../theme';
import { ICONS } from '../icons';
import { useConnectivity } from '../store/ConnectivityContext';

/**
 * Full-screen offline state, rendered as a Modal so it ALWAYS covers the entire
 * app on its own layer — over the login screen, any tab, any sheet — the instant
 * the native connectivity listener reports the device is offline. It disappears
 * (and screens refresh) the moment the internet is back. The Retry button is
 * just a manual nudge; recovery is automatic.
 */
export default function OfflineBanner() {
  const { online, checking, retry } = useConnectivity();

  return (
    <Modal
      visible={!online}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <Body checking={checking} retry={retry} />
    </Modal>
  );
}

function Body({ checking, retry }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fill, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Image source={ICONS.locWhite || ICONS.bell} style={styles.icon} />
        </View>
        <Text style={styles.title}>You’re offline</Text>
        <Text style={styles.sub}>
          Please check your internet connection. This screen will close on its own the moment you’re back online.
        </Text>
        <TouchableOpacity style={styles.retry} onPress={retry} disabled={checking} activeOpacity={0.85}>
          {checking
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.retryText}>Retry now</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.bg || '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  center: { alignItems: 'center', paddingHorizontal: 32, width: '100%' },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  icon: { width: 40, height: 40, tintColor: '#fff' },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  sub: { color: colors.inkMuted, fontSize: font.body, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  retry: {
    marginTop: 28, backgroundColor: colors.brand, paddingHorizontal: 40, height: 52,
    borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', minWidth: 180,
  },
  retryText: { color: '#fff', fontWeight: '800', fontSize: font.h3 || 16 },
});
