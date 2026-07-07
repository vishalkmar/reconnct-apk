import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, font } from '../../theme';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { AuthHeader, AuthCard, AuthField, AuthButton, MAIL_SVG, LOCK_SVG, FIELD_W, px } from './authUi';

const LENGTH = 6;

export default function OtpScreen({ email, onBack, onVerified }) {
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
    <View style={styles.screen}>
      {/* Same bottom illustration + top-edge fade as the login screen. */}
      <View style={styles.bgWrap} pointerEvents="none">
        <Image source={require('../../assets/loginimage.png')} style={styles.bgImage} resizeMode="cover" />
        <Svg style={styles.bgFade} width="100%" height={px(90)}>
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FEFEFE" stopOpacity="1" />
              <Stop offset="1" stopColor="#FEFEFE" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fade)" />
        </Svg>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AuthHeader />

        {/* Card right under the header, button right under the card — both in
            normal flow (not centred/bottom-pinned) so the gap stays tight. */}
        <AuthCard>
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
        </AuthCard>

        <View style={{ alignItems: 'center' }}>
          <AuthButton label="Verify" active={code.length === LENGTH} loading={loading} onPress={() => verify()} />
          <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
            <Text style={styles.back}>‹ Change email</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FEFEFE' },
  bgWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: px(230) },
  bgImage: { width: '100%', height: '100%' },
  bgFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Same spec as the email screen's helper: width 302, font-size 14, #1A1A2E —
  // only the "Resend" word itself stays blue as a link.
  helper: { width: FIELD_W, fontSize: px(14), color: '#1A1A2E', marginTop: 6, lineHeight: px(18) },
  resend: { color: '#2563EB', fontWeight: '700' },
  resendMuted: { color: colors.inkFaint },
  error: { width: FIELD_W, color: '#DC2626', fontSize: font.small, marginTop: 10 },
  back: { color: colors.inkMuted, fontWeight: '700', fontSize: font.small },
});
