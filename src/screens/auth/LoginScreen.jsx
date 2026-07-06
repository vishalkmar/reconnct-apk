import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { useNav } from '../../navigation/NavContext';
import { AuthHeader, AuthField, AuthButton, MAIL_SVG, FIELD_W, px } from './authUi';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LoginScreen({ onOtpSent }) {
  const insets = useSafeAreaInsets();
  const { setGuestMode } = useNav();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const valid = EMAIL_RE.test(email.trim());

  const sendOtp = async () => {
    if (!valid || loading) return;
    setError(''); setLoading(true);
    try {
      const data = await api.requestOtp(email.trim().toLowerCase());
      toast(data && data.emailDelivered === false ? 'OTP generated (check server log in dev)' : 'OTP sent to your email');
      onOtpSent(email.trim().toLowerCase(), data);
    } catch (e) { setError(e.message); toast(e.message || 'Could not send OTP'); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Browse without signing in — Book Now (and other account actions)
          will drop back into login when actually needed. */}
      <TouchableOpacity style={[styles.skip, { top: insets.top + 14 }]} onPress={() => setGuestMode(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <AuthHeader />

      {/* The field block sits centred in the remaining space (flex above +
          below), and the button stays pinned near the bottom, separate from
          it — matching the reference instead of both being bottom-anchored. */}
      <View style={styles.middle}>
        <View style={styles.body}>
          <AuthField
            icon={MAIL_SVG}
            placeholder="Email"
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            value={email} onChangeText={(t) => { setEmail(t); setError(''); }}
            onSubmitEditing={sendOtp} returnKeyType="send"
          />
          <Text style={styles.helper}>A one time password will be sent to this email address.</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>

      <View style={{ paddingBottom: insets.bottom + 24 }}>
        <AuthButton label="Send OTP" active={valid} loading={loading} onPress={sendOtp} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FEFEFE' },
  skip: { position: 'absolute', left: 20, zIndex: 5 },
  skipText: { color: colors.inkMuted, fontWeight: '700', fontSize: font.body },
  middle: { flex: 1, justifyContent: 'center' },
  body: { alignItems: 'center' },
  // Exact spec: width 302 (Fill, matches the field), font-size 14, color #1A1A2E.
  helper: { width: FIELD_W, fontSize: px(14), color: '#1A1A2E', marginTop: 6 },
  error: { width: FIELD_W, color: '#DC2626', fontSize: font.small, marginTop: 10 },
});
