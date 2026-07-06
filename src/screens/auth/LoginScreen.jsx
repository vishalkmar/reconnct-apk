import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { AuthHeader, AuthField, AuthButton, MAIL_SVG, FIELD_W } from './authUi';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LoginScreen({ onOtpSent }) {
  const insets = useSafeAreaInsets();
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
  middle: { flex: 1, justifyContent: 'center' },
  body: { alignItems: 'center' },
  helper: { width: FIELD_W, fontSize: font.tiny, color: colors.inkFaint, marginTop: 6 },
  error: { width: FIELD_W, color: '#DC2626', fontSize: font.small, marginTop: 10 },
});
