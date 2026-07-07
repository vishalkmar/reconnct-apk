import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';

// Cashfree's own outcome pages (Payment Success / Failed / Pending) only
// navigate to OUR return_url on success — failed/pending render in place
// (no URL change), so onNavigationStateChange never fires for them. This
// script watches the live DOM for those outcome texts and pings us via
// postMessage, so failed/pending react exactly like success does instead of
// leaving the user stuck looking at Cashfree's own page forever.
const DETECT_OUTCOME_JS = `
(function() {
  if (window.__cfOutcomeObserverInstalled) { return true; }
  window.__cfOutcomeObserverInstalled = true;
  function check() {
    try {
      var t = (document.body && document.body.innerText) || '';
      if (/payment\\s+(failed|pending)/i.test(t) || /oh no!/i.test(t)) {
        window.ReactNativeWebView.postMessage('cf_outcome_terminal');
      }
    } catch (e) {}
  }
  var obs = new MutationObserver(check);
  obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  check();
  true;
})();
`;

/**
 * In-app Cashfree checkout. We load the hosted payment-link URL inside a WebView
 * instead of bouncing to the external browser — that flow silently failed to
 * open on some devices (Linking.openURL) and broke the return/auto-poll loop.
 *
 * onReturn fires when Cashfree redirects back to our success URL, OR when the
 * in-page failed/pending outcome text is detected, so the caller can close
 * this and check the booking's real paid status either way.
 */
export default function PaymentWebView({ visible, url, onClose, onReturn }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const webRef = useRef(null);
  const firedRef = useRef(false);

  useEffect(() => { firedRef.current = false; }, [url]);

  if (!url) return null;

  const fireReturn = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onReturn && onReturn();
  };

  const handleNav = (nav) => {
    const u = nav.url || '';
    if (u.includes('/booking-success')) fireReturn();
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
            ref={webRef}
            source={{ uri: url }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              // Re-inject on every page load — Cashfree's outcome content can
              // arrive via a fresh navigation (new document) rather than an
              // in-place DOM update, which would silently drop the previous
              // MutationObserver along with the old document.
              webRef.current && webRef.current.injectJavaScript(DETECT_OUTCOME_JS);
            }}
            onNavigationStateChange={handleNav}
            onMessage={(e) => {
              if (e.nativeEvent.data === 'cf_outcome_terminal') fireReturn();
            }}
            injectedJavaScript={DETECT_OUTCOME_JS}
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
