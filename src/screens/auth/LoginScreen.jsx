import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, font, space } from '../../theme';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { AuthHeader, AuthField, AuthButton, MAIL_SVG } from './authUi';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LoginScreen({ onOtpSent }) {
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
    <View style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHeader />

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

            <AuthButton label="Send OTP" active={valid} loading={loading} onPress={sendOtp} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FEFEFE' },
  body: { paddingHorizontal: space.xl, paddingTop: 8 },
  helper: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 6 },
  error: { color: '#DC2626', fontSize: font.small, marginTop: 10 },
});
