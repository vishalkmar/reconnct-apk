import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, font } from '../../theme';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { AuthHeader, AuthCard, AuthField, AuthButton, USER_SVG, PHONE_SVG, FIELD_W, px } from './authUi';

// First-time onboarding: after OTP verify for a brand-new account, collect the
// name + phone the backend needs (completeProfile), then start the app. Same
// header/card/button visual language as Login/OTP — only the fields differ.
export default function OnboardingScreen({ email, token, onDone }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const valid = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10;

  const submit = async () => {
    if (!valid || loading) return;
    setError(''); setLoading(true);
    try {
      const data = await api.completeProfile(token, { name: name.trim(), phone: phone.trim() });
      toast(`Welcome, ${data.user?.name || name.trim()}!`);
      onDone(data.user);
    } catch (e) {
      setError(e.message);
      toast(e.message || 'Could not save your details');
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Same bottom illustration + top-edge fade as Login/OTP. */}
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
          <AuthHeader />

          <Text style={styles.title}>Create your profile</Text>
          <Text style={styles.subtitle}>Signing in as {email}</Text>

          <AuthCard style={styles.card}>
            <Text style={styles.label}>Full name</Text>
            <AuthField
              icon={USER_SVG}
              placeholder="e.g. Priya Sharma"
              value={name}
              onChangeText={(t) => { setName(t); setError(''); }}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Phone number</Text>
            <AuthField
              icon={PHONE_SVG}
              placeholder="10-digit mobile number"
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(''); }}
              keyboardType="phone-pad"
              onSubmitEditing={submit}
              returnKeyType="done"
              maxLength={15}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}
          </AuthCard>

          <AuthButton label="Get Started" active={valid} loading={loading} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FEFEFE' },
  bgWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: px(230) },
  bgImage: { width: '100%', height: '100%' },
  bgFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy, textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: font.small, color: colors.inkMuted, textAlign: 'center', marginTop: 6 },
  card: { marginTop: 20 },
  label: { fontSize: font.small, fontWeight: '800', color: colors.ink, marginBottom: 8, alignSelf: 'center', width: FIELD_W },
  error: { color: '#DC2626', fontSize: font.small, marginTop: 12, textAlign: 'center' },
});
