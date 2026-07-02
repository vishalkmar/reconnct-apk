import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../../theme';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';

const { height: SCREEN_H } = Dimensions.get('window');
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const DEFAULTS = {
  brandTitle: 'reconnct',
  tagline: 'Experiences that connect',
  heroMedia: { url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=80' },
  headline: 'Let’s get you started',
  subtitle: 'Enter your email to discover amazing experiences around you.',
  buttonText: 'Send OTP',
  emailPlaceholder: 'Enter your email',
  legal: 'By continuing, you agree to our Terms of Use & Privacy Policy',
};

export default function LoginScreen({ onOtpSent, content }) {
  const insets = useSafeAreaInsets();
  const c = { ...DEFAULTS, ...(content || {}) };
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

  const heroUrl = c.heroMedia && c.heroMedia.url;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
          {/* Full-bleed hero image with a curved bottom */}
          <View style={styles.heroWrap}>
            {heroUrl ? <Image source={{ uri: heroUrl }} style={styles.heroImg} resizeMode="cover" /> : <View style={[styles.heroImg, { backgroundColor: colors.brandSoft }]} />}
            <View style={styles.heroFade} />
            <View style={[styles.brandBlock, { paddingTop: insets.top + 18 }]}>
              <Text style={styles.logo}>{c.brandTitle}</Text>
              <Text style={styles.tagline}>{c.tagline}</Text>
            </View>
          </View>

          {/* Sheet */}
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.title}>{c.headline}</Text>
            <Text style={styles.subtitle}>{c.subtitle}</Text>

            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder={c.emailPlaceholder}
                placeholderTextColor={colors.inkFaint}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                value={email} onChangeText={(t) => { setEmail(t); setError(''); }}
                onSubmitEditing={sendOtp} returnKeyType="send"
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={[styles.button, (!valid || loading) && styles.buttonDisabled]} onPress={sendOtp} activeOpacity={0.9} disabled={!valid || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{c.buttonText}  ›</Text>}
            </TouchableOpacity>

            <Text style={styles.legal}>{c.legal}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  heroWrap: { height: SCREEN_H * 0.46, backgroundColor: colors.brandSoft, borderBottomLeftRadius: 120, borderBottomRightRadius: 36, overflow: 'hidden' },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroFade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  brandBlock: { alignItems: 'center' },
  logo: { fontSize: 42, fontWeight: '800', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 8 },
  tagline: { fontSize: font.h3, color: '#fff', marginTop: 2, fontWeight: '600' },
  sheet: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: space.xl, paddingTop: 26 },
  title: { fontSize: 28, fontWeight: '800', color: colors.navy, textAlign: 'center' },
  subtitle: { fontSize: font.body, color: colors.inkMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 18, marginTop: 24, height: 56, borderWidth: 1, borderColor: colors.border },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, fontSize: font.h3, color: colors.ink },
  error: { color: '#DC2626', fontSize: font.small, marginTop: 10, textAlign: 'center' },
  button: { backgroundColor: colors.brand, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: font.h3, fontWeight: '800' },
  demoBox: { backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: 12, marginTop: 20 },
  demoTitle: { color: colors.brandText, fontWeight: '800', fontSize: font.small },
  demoText: { color: colors.brandText, fontSize: font.small, marginTop: 4, lineHeight: 18 },
  legal: { textAlign: 'center', color: colors.inkMuted, fontSize: font.small, marginTop: 18, lineHeight: 20 },
});
