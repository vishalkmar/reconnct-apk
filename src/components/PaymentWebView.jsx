import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';

/**
 * In-app Cashfree checkout. We load the hosted payment-link URL inside a WebView
 * instead of bouncing to the external browser — that flow silently failed to
 * open on some devices (Linking.openURL) and broke the return/auto-poll loop.
 *
 * onReturn fires when Cashfree redirects back to our success URL, so the caller
 * can close this and check the booking's paid status.
 */
export default function PaymentWebView({ visible, url, onClose, onReturn }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  if (!url) return null;

  const handleNav = (nav) => {
    const u = nav.url || '';
    if (u.includes('/booking-success')) onReturn && onReturn();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
        <View style={styles.bar}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Secure payment · Cashfree</Text>
          <TouchableOpacity onPress={() => Linking.openURL(url).catch(() => {})} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.ext}>Browser ↗</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: url }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={handleNav}
            onShouldStartLoadWithRequest={(req) => {
              // Let UPI / other payment app deep-links open in their native app.
              if (/^(upi|intent|tez|phonepe|paytmmp|gpay|bhim|whatsapp|mailto|tel):/i.test(req.url || '')) {
                Linking.openURL(req.url).catch(() => {});
                return false;
              }
              return true;
            }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            mixedContentMode="always"
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
          />
          {loading && (
            <View style={styles.loader} pointerEvents="none">
              <ActivityIndicator color={colors.brand} size="large" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  close: { fontSize: 20, color: colors.ink, fontWeight: '700' },
  title: { flex: 1, fontSize: font.body, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  ext: { fontSize: font.small, color: colors.brandText, fontWeight: '800' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.85)' },
});
