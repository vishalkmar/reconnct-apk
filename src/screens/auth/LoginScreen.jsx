import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { useNav } from '../../navigation/NavContext';
import { AuthHeader, AuthCard, AuthNote, AuthField, AuthButton, MAIL_SVG, FIELD_W, px } from './authUi';

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
    <View style={styles.screen}>
      {/* Decorative footer illustration — bottom-anchored, with a soft fade at
          its top edge (instead of a hard rectangle cut) so it blends into the
          page background. */}
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
        {/* Browse without signing in — Book Now (and other account actions)
            will drop back into login when actually needed. */}
        <TouchableOpacity style={[styles.skip, { top: insets.top + 14 }]} onPress={() => setGuestMode(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <AuthHeader />

        {/* Card sits right under the header, and the button right under the
            card — both in normal flow now (not pushed to the bottom), so the
            illustration shows through the empty space below. */}
        <AuthCard>
          <AuthField
            icon={MAIL_SVG}
            placeholder="Email"
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            value={email} onChangeText={(t) => { setEmail(t); setError(''); }}
            onSubmitEditing={sendOtp} returnKeyType="send"
          />
          <AuthNote>A one time password will be sent to this email address.</AuthNote>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </AuthCard>

        <AuthButton label="Send OTP" active={valid} loading={loading} onPress={sendOtp} style={{ marginTop: 26 }} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FEFEFE' },
  bgWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: px(230) },
  bgImage: { width: '100%', height: '100%' },
  bgFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  skip: { position: 'absolute', left: 20, zIndex: 5 },
  skipText: { color: colors.inkMuted, fontWeight: '700', fontSize: font.body },
  error: { width: FIELD_W, alignSelf: 'center', color: '#DC2626', fontSize: font.small, marginTop: 10 },
});
