import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../theme';
import { api } from '../api/client';
import { useAuth } from '../store/AuthContext';
import { useWishlist } from '../store/WishlistContext';
import { useNav } from '../navigation/NavContext';
import { initials } from '../utils/format';
import { ICONS } from '../icons';

const MENU = [
  { label: 'My Profile', icon: ICONS.navProfile, screen: 'myProfile' },
  { label: 'My Bookings', icon: ICONS.ticket, screen: 'bookings' },
  { label: 'Transactions', icon: ICONS.card, screen: 'transactions' },
  { label: 'Wishlist', icon: ICONS.heart, screen: 'wishlist' },
  { label: 'Notifications', icon: ICONS.bell, screen: 'notifications' },
  { label: 'Language & Region', icon: ICONS.globe, screen: null },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, signOut } = useAuth();
  const { count: wishCount } = useWishlist();
  const { push, switchMode } = useNav();
  const [trips, setTrips] = useState(0);

  const name = (user && user.name) || 'Guest';

  useEffect(() => {
    api.myBookings(token).then((d) => setTrips((d.bookings || []).length)).catch(() => {});
  }, [token]);

  const soon = (what) => Alert.alert(what, 'Coming soon.');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {/* Yellow header — image 3 style */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.idRow}>
          <View style={styles.avatar}><Text style={styles.avatarInit}>{initials(name)}</Text></View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.name}>{name}</Text>
            {!!(user && user.email) && <Text style={styles.email}>{user.email}</Text>}
            {!!(user && user.createdAt) && <View style={styles.badge}><Text style={styles.badgeText}>Member since {new Date(user.createdAt).getFullYear()}</Text></View>}
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={trips} label="Trips" />
          <View style={styles.statDiv} />
          <Stat value={wishCount} label="Wishlist" />
          <View style={styles.statDiv} />
          <Stat value={0} label="Reviews" />
        </View>
      </View>

      {/* Switch to Hosting */}
      <TouchableOpacity style={styles.hosting} activeOpacity={0.9} onPress={() => switchMode('host')}>
        <View style={styles.hostIcon}><Image source={ICONS.swap} style={{ width: 20, height: 20, tintColor: '#101010' }} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hostTitle}>Switch to Hosting</Text>
          <Text style={styles.hostSub}>Manage your experiences &amp; earnings</Text>
        </View>
        <Text style={styles.hostChev}>›</Text>
      </TouchableOpacity>

      {/* Links */}
      <View style={styles.list}>
        {MENU.map((m, i) => (
          <TouchableOpacity
            key={m.label}
            style={[styles.row, i === MENU.length - 1 && styles.rowLast]}
            activeOpacity={0.7}
            onPress={() => (m.screen ? push(m.screen, m.params) : soon(m.label))}
          >
            <Image source={m.icon} style={styles.rowIconImg} />
            <Text style={styles.rowText}>{m.label}</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut} activeOpacity={0.85}>
        <Image source={ICONS.signout} style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.brand, paddingHorizontal: space.lg, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  idRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarInit: { fontSize: 24, fontWeight: '800', color: colors.brand },
  name: { fontSize: font.h2, fontWeight: '800', color: '#fff' },
  email: { fontSize: font.small, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, marginTop: 6 },
  badgeText: { color: '#fff', fontSize: font.tiny, fontWeight: '700' },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.md, marginTop: 16, paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: font.h2, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.9)', fontSize: font.tiny, marginTop: 2 },
  statDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },

  hosting: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.navy, marginHorizontal: space.lg, marginTop: 16, borderRadius: radius.lg, padding: 14 },
  hostIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  hostTitle: { color: '#fff', fontSize: font.body, fontWeight: '800' },
  hostSub: { color: 'rgba(255,255,255,0.7)', fontSize: font.small, marginTop: 1 },
  hostChev: { color: 'rgba(255,255,255,0.7)', fontSize: 22 },

  list: { backgroundColor: colors.surface, marginTop: 14, marginHorizontal: space.lg, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { fontSize: 17, width: 24, textAlign: 'center' },
  rowIconImg: { width: 20, height: 20, tintColor: colors.brand },
  rowText: { flex: 1, fontSize: font.body, color: colors.ink, fontWeight: '600' },
  chev: { fontSize: 20, color: colors.inkFaint },
  unreadPill: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#D4183D', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  unreadPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, marginHorizontal: space.lg, borderWidth: 1.5, borderColor: '#F4B0BA', borderRadius: radius.md, paddingVertical: 14 },
  logoutIcon: { width: 18, height: 18, tintColor: '#D4183D' },
  logoutText: { color: '#D4183D', fontWeight: '800', fontSize: font.h3 },
});
