import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { toast } from '../../utils/toast';
import { useSupplierAuth } from '../../store/SupplierAuthContext';
import { AuthHeader, AuthCard, AuthField, AuthButton, MAIL_SVG, LOCK_SVG, FIELD_W } from './authUi';

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
  const valid = EMAIL_RE.test(email.trim()) && password.length > 0;

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={[styles.back, { top: insets.top + 14 }]} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <AuthHeader />

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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FEFEFE' },
  back: { position: 'absolute', left: 20, zIndex: 5 },
  backText: { color: colors.inkMuted, fontWeight: '700', fontSize: font.body },
  error: { width: FIELD_W, alignSelf: 'center', color: '#DC2626', fontSize: font.small, marginTop: 10 },
});
