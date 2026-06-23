import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../../theme';

const { height: SCREEN_H } = Dimensions.get('window');
import { api } from '../../api/client';
import { useAuth } from '../../store/AuthContext';
import { DEMO_EMAIL, DEMO_OTP } from '../../config';

const LENGTH = 6;
const OTP_DEFAULTS = {
  otpHeadline: 'Almost there!',
  otpSubtitle: 'We’ve sent a 6-digit code to',
  otpMedia: { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80' },
  secureText: 'Secure & encrypted',
};

export default function OtpScreen({ email, onBack, content }) {
  const c = { ...OTP_DEFAULTS, ...(content || {}) };
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const inputRef = useRef(null);
  const isDemo = (email || '').toLowerCase() === DEMO_EMAIL;
  const [code, setCode] = useState(isDemo ? DEMO_OTP : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(90);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const digits = code.padEnd(LENGTH).split('').slice(0, LENGTH);

  const verify = async (value = code) => {
    if (value.length !== LENGTH || loading) return;
    setError('');
    setLoading(true);
    try {
      const data = await api.verifyOtp(email, value);
      signIn(data.token, data.user); // unmounts the auth flow → main app
    } catch (e) {
      setError(e.message);
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
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Full-bleed hero image with the text overlaid on top */}
        <View style={styles.hero}>
          {c.otpMedia && c.otpMedia.url
            ? <Image source={{ uri: c.otpMedia.url }} style={styles.heroBg} resizeMode="cover" />
            : <View style={[styles.heroBg, { backgroundColor: colors.brandSoft }]} />}
          <View style={styles.heroScrim} />
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={onBack}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={[styles.heroContent, { paddingTop: insets.top }]}>
            <Text style={styles.title}>{c.otpHeadline}</Text>
            <Text style={styles.subtitle}>{c.otpSubtitle}</Text>
            <View style={styles.emailRow}>
              <Text style={styles.email}>{email}</Text>
              <TouchableOpacity onPress={onBack}><Text style={styles.edit}>  Edit ✎</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.enterLabel}>Enter OTP</Text>
          <Text style={styles.expire}>Code will expire in <Text style={styles.timer}>{mmss}</Text></Text>

          <Pressable style={styles.boxes} onPress={() => inputRef.current && inputRef.current.focus()}>
            {digits.map((d, i) => (
              <View key={i} style={[styles.box, code.length === i && styles.boxActive]}>
                <Text style={styles.boxText}>{d.trim()}</Text>
              </View>
            ))}
          </Pressable>

          {/* Hidden field that actually captures input */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            maxLength={LENGTH}
            autoFocus
            style={styles.hiddenInput}
            caretHidden
          />

          <Text style={styles.secure}>🔒 {c.secureText}</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, (code.length !== LENGTH || loading) && styles.buttonDisabled]}
            onPress={() => verify()}
            activeOpacity={0.9}
            disabled={code.length !== LENGTH || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify &amp; Continue  ›</Text>}
          </TouchableOpacity>

          <Text style={styles.resendRow}>
            Didn’t receive the code?{' '}
            <Text style={[styles.link, seconds > 0 && styles.linkMuted]} onPress={resend}>
              {seconds > 0 ? `Resend OTP (${seconds}s)` : 'Resend OTP'}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: { height: Math.round(SCREEN_H * 0.42), borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden', justifyContent: 'center' },
  heroBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,18,32,0.45)' },
  backBtn: {
    position: 'absolute', left: space.xl, zIndex: 3,
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  backIcon: { fontSize: 28, color: colors.navy, marginTop: -4 },
  heroContent: { paddingHorizontal: space.xl, alignItems: 'center', zIndex: 2 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 8, textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 8 },
  subtitle: { fontSize: font.body, color: 'rgba(255,255,255,0.92)', marginTop: 10 },
  emailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  email: { fontSize: font.h3, fontWeight: '800', color: '#fff' },
  edit: { fontSize: font.body, color: '#FFE2A8', fontWeight: '700' },
  sheet: {
    flex: 1, backgroundColor: colors.surface,
    borderTopLeftRadius: 34, borderTopRightRadius: 34,
    marginTop: -22, paddingHorizontal: space.xl, paddingTop: 28, alignItems: 'center',
  },
  enterLabel: { fontSize: 22, fontWeight: '800', color: colors.navy },
  expire: { fontSize: font.body, color: colors.inkMuted, marginTop: 6 },
  timer: { color: colors.brand, fontWeight: '700' },
  boxes: { flexDirection: 'row', gap: 10, marginTop: 22 },
  box: {
    width: 46, height: 54, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  boxActive: { borderColor: colors.brand },
  boxText: { fontSize: 22, fontWeight: '700', color: colors.ink },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  secure: { fontSize: font.small, color: colors.inkMuted, marginTop: 18 },
  error: { color: '#DC2626', fontSize: font.small, marginTop: 10, textAlign: 'center' },
  button: {
    backgroundColor: colors.brand, height: 56, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', marginTop: 22, width: '100%',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: font.h3, fontWeight: '800' },
  resendRow: { marginTop: 22, color: colors.ink, fontSize: font.body, textAlign: 'center' },
  link: { color: '#2563EB', fontWeight: '700' },
  linkMuted: { color: colors.inkFaint },
});
