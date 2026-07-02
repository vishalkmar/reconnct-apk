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
const HERO = 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=80';

// First-time onboarding: after OTP verify for a brand-new account, collect the
// name + phone the backend needs (completeProfile), then start the app.
export default function OnboardingScreen({ email, token, onDone }) {
  const insets = useSafeAreaInsets();
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.hero}>
            <Image source={{ uri: HERO }} style={styles.heroImg} resizeMode="cover" />
            <View style={styles.heroFade} />
            <View style={[styles.heroContent, { paddingTop: insets.top + 24 }]}>
              <Text style={styles.logo}>One last step</Text>
              <Text style={styles.tagline}>Tell us a little about you</Text>
            </View>
          </View>

          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.title}>Create your profile</Text>
            <Text style={styles.subtitle}>Signing in as {email}</Text>

            <Text style={styles.label}>Full name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor={colors.inkFaint}
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Phone number</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.inkFaint}
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(''); }}
                keyboardType="phone-pad"
                onSubmitEditing={submit}
                returnKeyType="done"
                maxLength={15}
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={[styles.button, (!valid || loading) && styles.buttonDisabled]} onPress={submit} activeOpacity={0.9} disabled={!valid || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get Started  ›</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: { height: SCREEN_H * 0.34, backgroundColor: colors.brandSoft, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', justifyContent: 'center' },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroFade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,18,32,0.4)' },
  heroContent: { alignItems: 'center', zIndex: 2 },
  logo: { fontSize: 32, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 8 },
  tagline: { fontSize: font.body, color: 'rgba(255,255,255,0.92)', marginTop: 6 },
  sheet: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: space.xl, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy, textAlign: 'center' },
  subtitle: { fontSize: font.small, color: colors.inkMuted, textAlign: 'center', marginTop: 6 },
  label: { fontSize: font.small, fontWeight: '800', color: colors.ink, marginTop: 20, marginBottom: 8 },
  inputWrap: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 16, height: 54, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  input: { fontSize: font.h3, color: colors.ink },
  error: { color: '#DC2626', fontSize: font.small, marginTop: 12, textAlign: 'center' },
  button: { backgroundColor: colors.brand, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#1A1A2E', fontSize: font.h3, fontWeight: '900' },
});
