import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { AuthHeader, AuthField, AuthButton, MAIL_SVG, LOCK_SVG, FIELD_W } from './authUi';

const LENGTH = 6;

export default function OtpScreen({ email, onBack, onVerified }) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(90);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = async (value = code) => {
    if (value.length !== LENGTH || loading) return;
    setError('');
    setLoading(true);
    try {
      const data = await api.verifyOtp(email, value);
      onVerified(data); // AuthNavigator routes: onboarding (new) or straight in
    } catch (e) {
      setError(e.message);
      toast(e.message || 'Verification failed');
      setLoading(false);
    }
  };

  const onChange = (t) => {
    const clean = t.replace(/\D/g, '').slice(0, LENGTH);
    setCode(clean);
    setError('');
    if (clean.length === LENGTH) verify(clean);
  };

  const resend = async () => {
    if (seconds > 0) return;
    setError('');
    try {
      await api.resendOtp(email);
      setSeconds(90);
      setCode('');
      toast('A new code has been sent');
    } catch (e) {
      setError(e.message);
      toast(e.message || 'Could not resend the code');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthHeader />

      {/* Field block centred in the remaining space; button pinned near the
          bottom, separate from it — matching the reference. */}
      <View style={styles.middle}>
        <View style={styles.body}>
          <AuthField icon={MAIL_SVG} value={email} editable={false} />

          <View style={{ height: 12 }} />

          <AuthField
            icon={LOCK_SVG}
            placeholder="OTP"
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            maxLength={LENGTH}
            secureTextEntry={code.length === LENGTH}
            autoFocus
          />
          <Text style={styles.helper}>
            A one time password has been sent to the email address.{' '}
            <Text style={[styles.resend, seconds > 0 && styles.resendMuted]} onPress={resend}>
              {seconds > 0 ? `Resend (${seconds}s)` : 'Resend'}
            </Text>
          </Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>

      <View style={{ alignItems: 'center', paddingBottom: insets.bottom + 24 }}>
        <AuthButton label="Verify" active={code.length === LENGTH} loading={loading} onPress={() => verify()} />
        <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={styles.back}>‹ Change email</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FEFEFE' },
  middle: { flex: 1, justifyContent: 'center' },
  body: { alignItems: 'center' },
  helper: { width: FIELD_W, fontSize: font.tiny, color: colors.inkFaint, marginTop: 6, lineHeight: 16 },
  resend: { color: '#2563EB', fontWeight: '700' },
  resendMuted: { color: colors.inkFaint },
  error: { width: FIELD_W, color: '#DC2626', fontSize: font.small, marginTop: 10 },
  back: { color: colors.inkMuted, fontWeight: '700', fontSize: font.small },
});
