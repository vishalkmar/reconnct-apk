import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { toast } from '../../utils/toast';
import { api } from '../../api/client';
import { useSupplierAuth } from '../../store/SupplierAuthContext';
import { AuthHeader, AuthCard, AuthField, AuthButton, AuthNote, MAIL_SVG, LOCK_SVG, FIELD_W, px } from './authUi';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Supplier's own login — email + password (not the OTP flow user/host use).
// On success this opens a completely separate Supplier Portal dashboard
// (see src/screens/supplier/*), reusing Host's UI style but its own screens
// and its own account, tracked entirely apart from a User session.
export default function SupplierLoginScreen({ onBack, onLoggedIn }) {
  const insets = useSafeAreaInsets();
  const { signIn } = useSupplierAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const valid = EMAIL_RE.test(email.trim()) && password.length > 0;
  const emailValid = EMAIL_RE.test(email.trim());

  const sendForgot = async () => {
    if (!emailValid || forgotBusy) return;
    setForgotBusy(true);
    try {
      await api.supplierForgotPassword(email.trim().toLowerCase());
      setForgotSent(true);
    } catch (e) {
      toast(e.message || 'Could not send the reset link');
    } finally {
      setForgotBusy(false);
    }
  };

  const login = async () => {
    if (!valid || loading) return;
    setError(''); setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      onLoggedIn();
    } catch (e) {
      setError(e.message || 'Could not sign in');
      toast(e.message || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Same decorative footer illustration as the user login, bottom-anchored
          with a soft fade at its top edge. */}
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
        <TouchableOpacity style={[styles.back, { top: insets.top + 14 }]} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <AuthHeader />

        {mode === 'forgot' ? (
          <>
            <AuthCard>
              {forgotSent ? (
                <Text style={styles.forgotDone}>
                  If that email is a registered supplier account, a password-reset link is on its way. Open it on any browser to set a new password. The link expires in 1 hour.
                </Text>
              ) : (
                <>
                  <AuthNote>Enter your email — we&apos;ll send you a password-reset link.</AuthNote>
                  <AuthField
                    icon={MAIL_SVG}
                    placeholder="Email"
                    keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                    value={email} onChangeText={setEmail}
                    onSubmitEditing={sendForgot} returnKeyType="go"
                    style={{ marginTop: 12 }}
                  />
                </>
              )}
            </AuthCard>
            {!forgotSent && <AuthButton label="Send reset link" active={emailValid} loading={forgotBusy} onPress={sendForgot} style={{ marginTop: 26 }} />}
            <TouchableOpacity style={styles.forgotLink} onPress={() => { setMode('login'); setForgotSent(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.forgotLinkText}>‹ Back to sign in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <AuthCard>
              <AuthField
                icon={MAIL_SVG}
                placeholder="Email"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                value={email} onChangeText={(t) => { setEmail(t); setError(''); }}
                returnKeyType="next"
              />
              <AuthField
                icon={LOCK_SVG}
                placeholder="Password"
                secureTextEntry autoCapitalize="none" autoCorrect={false}
                value={password} onChangeText={(t) => { setPassword(t); setError(''); }}
                onSubmitEditing={login} returnKeyType="go"
                style={{ marginTop: 12 }}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
            </AuthCard>

            <AuthButton label="Login as Supplier" active={valid} loading={loading} onPress={login} style={{ marginTop: 26 }} />
            <TouchableOpacity style={styles.forgotLink} onPress={() => { setMode('forgot'); setForgotSent(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.forgotLinkText}>Forgot password?</Text>
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FEFEFE' },
  bgWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: px(230) },
  bgImage: { width: '100%', height: '100%' },
  bgFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  back: { position: 'absolute', left: 20, zIndex: 5 },
  backText: { color: colors.inkMuted, fontWeight: '700', fontSize: font.body },
  error: { width: FIELD_W, alignSelf: 'center', color: '#DC2626', fontSize: font.small, marginTop: 10 },
  forgotLink: { alignSelf: 'center', marginTop: 18 },
  forgotLinkText: { color: colors.brand, fontWeight: '700', fontSize: font.small },
  forgotDone: { color: colors.inkMuted, fontSize: font.small, lineHeight: 20, textAlign: 'center', paddingVertical: 6 },
});
