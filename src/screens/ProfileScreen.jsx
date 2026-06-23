import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../theme';
import { useAuth } from '../store/AuthContext';
import { useNav } from '../navigation/NavContext';
import { initials } from '../utils/format';

const MENU = [
  { label: 'My Bookings', icon: '🎟️', screen: 'bookings' },
  { label: 'Transactions', icon: '💳', screen: 'transactions' },
  { label: 'Wishlist', icon: '🤍', screen: 'wishlist' },
  { label: 'Refer & Earn', icon: '🎁', screen: 'transactions' },
  { label: 'Help & Support', icon: '💬', screen: null },
  { label: 'Settings', icon: '⚙️', screen: null },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { push } = useNav();
  const name = (user && user.name) || 'Guest';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.logo}>reconnct</Text>
        <View style={styles.avatar}><Text style={styles.avatarInit}>{initials(name)}</Text></View>
        <Text style={styles.name}>{name}</Text>
        {!!(user && user.email) && <Text style={styles.email}>{user.email}</Text>}
        {!!(user && user.phone) && <Text style={styles.email}>📞 {user.phone}</Text>}
      </View>

      <View style={styles.list}>
        {MENU.map((m) => (
          <TouchableOpacity key={m.label} style={styles.row} activeOpacity={0.7} onPress={() => m.screen && push(m.screen)}>
            <Text style={styles.rowIcon}>{m.icon}</Text>
            <Text style={styles.rowText}>{m.label}</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.brand, alignItems: 'center', paddingBottom: 28, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  logo: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 14 },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarInit: { fontSize: 28, fontWeight: '800', color: colors.brand },
  name: { fontSize: font.h2, fontWeight: '800', color: '#fff', marginTop: 12 },
  email: { fontSize: font.body, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  list: { backgroundColor: colors.surface, marginTop: 16, marginHorizontal: space.lg, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rowText: { flex: 1, fontSize: font.body, color: colors.ink, fontWeight: '600' },
  chev: { fontSize: 20, color: colors.inkFaint },
  logout: { marginTop: 24, marginHorizontal: space.lg, borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#DC2626', fontWeight: '800', fontSize: font.h3 },
});
