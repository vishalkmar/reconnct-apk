import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import { useHost } from '../../store/HostContext';
import { initials, formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';

const NAVY = '#15233F';

const MENU = [
  { label: 'Host Profile', sub: 'Your details & company', icon: ICONS.navProfile, screen: 'hostProfileDetail' },
  { label: 'My Listings', sub: 'Listings & their bookings', icon: ICONS.compass, tab: 'listings' },
  { label: 'Notifications', sub: 'Messages, updates & emails', icon: ICONS.bell, screen: 'hostNotifications' },
  { label: 'Transactions', sub: 'Revenue, completed & pending', icon: ICONS.card, screen: 'hostTransactions' },
  { label: 'Support', sub: 'Chat with the reconnct team', icon: ICONS.navInbox, screen: 'support', params: { queue: 'supplier' } },
];

export default function HostProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { switchMode, push, navigateTab } = useNav();
  const { stats } = useHost();
  const name = (user && user.name) || 'Host';
  const email = (user && user.email) || '';
  const soon = (w) => Alert.alert(w, 'Coming soon.');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {/* Dark header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Image source={ICONS.logoWhite} style={styles.logo} resizeMode="contain" />
        <View style={styles.idRow}>
          <View style={styles.avatar}><Text style={styles.avatarInit}>{initials(name)}</Text></View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.name}>{name}</Text>
            {!!email && <Text style={styles.email}>{email}</Text>}
            <View style={styles.superhost}>
              <Image source={ICONS.star} style={styles.superhostIcon} />
              <Text style={styles.superhostText}>Superhost</Text>
            </View>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat value={`₹${(Number(stats.earnedTotal || 0) / 1000).toFixed(1)}K`} label="Earned" />
          <View style={styles.statDiv} />
          <Stat value={String(stats.listingCount)} label="Listings" />
          <View style={styles.statDiv} />
          <Stat value={`${stats.rating} ★`} label="Rating" />
        </View>
      </View>

      {/* Switch to Travelling */}
      <TouchableOpacity style={styles.switchCard} activeOpacity={0.9} onPress={() => switchMode('traveller')}>
        <View style={styles.switchIcon}><Image source={ICONS.swap} style={{ width: 22, height: 22, tintColor: '#101010' }} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchTitle}>Switch to Travelling</Text>
          <Text style={styles.switchSub}>Browse &amp; book experiences as a guest</Text>
        </View>
        <Text style={styles.switchChev}>›</Text>
      </TouchableOpacity>

      {/* Menu */}
      <View style={styles.list}>
        {MENU.map((m, i) => (
          <TouchableOpacity key={m.label} style={[styles.row, i === MENU.length - 1 && styles.rowLast]} activeOpacity={0.7}
            onPress={() => (m.tab ? navigateTab(m.tab) : m.screen ? push(m.screen, m.params) : soon(m.label))}>
            <View style={styles.rowIconWrap}><Image source={m.icon} style={styles.rowIcon} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowText}>{m.label}</Text>
              {!!m.sub && <Text style={styles.rowSub}>{m.sub}</Text>}
            </View>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Admin portal (internal, disabled) */}
      <View style={styles.adminRow}>
        <View style={styles.adminIconWrap}><Image source={ICONS.chart} style={styles.adminIcon} /></View>
        <Text style={styles.adminText}>Admin Portal</Text>
        <View style={styles.internalBadge}><Text style={styles.internalText}>Internal</Text></View>
      </View>

      <TouchableOpacity style={styles.signout} onPress={signOut} activeOpacity={0.85}>
        <Image source={ICONS.signout} style={{ width: 18, height: 18, tintColor: '#D4183D' }} />
        <Text style={styles.signoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: NAVY, paddingHorizontal: space.lg, paddingBottom: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  logo: { width: 116, height: 26 },
  idRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  avatar: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { fontSize: 24, fontWeight: '900', color: '#101010' },
  name: { fontSize: font.h2, fontWeight: '900', color: '#fff' },
  email: { fontSize: font.small, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  superhost: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.brand, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, marginTop: 7 },
  superhostIcon: { width: 12, height: 12, tintColor: '#101010', marginRight: 4 },
  superhostText: { color: '#101010', fontSize: font.tiny, fontWeight: '900' },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, marginTop: 18, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: font.h3, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: font.tiny, marginTop: 3 },
  statDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.14)' },

  switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.brand, marginHorizontal: space.lg, marginTop: 16, borderRadius: radius.lg, padding: 16 },
  switchIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(16,16,16,0.12)', alignItems: 'center', justifyContent: 'center' },
  switchTitle: { color: '#101010', fontSize: font.h3, fontWeight: '900' },
  switchSub: { color: 'rgba(16,16,16,0.72)', fontSize: font.small, marginTop: 2 },
  switchChev: { color: 'rgba(16,16,16,0.6)', fontSize: 24 },

  list: { backgroundColor: colors.surface, marginTop: 14, marginHorizontal: space.lg, borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  rowIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 18, height: 18, tintColor: colors.brand },
  rowText: { fontSize: font.body, color: colors.ink, fontWeight: '700' },
  rowSub: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  chev: { fontSize: 20, color: colors.inkFaint },

  adminRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: space.lg, marginTop: 14, backgroundColor: '#EEF0F3', borderRadius: radius.lg, paddingVertical: 15, paddingHorizontal: 16 },
  adminIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E2E5EA', alignItems: 'center', justifyContent: 'center' },
  adminIcon: { width: 18, height: 18, tintColor: colors.inkFaint },
  adminText: { flex: 1, fontSize: font.body, color: colors.inkMuted, fontWeight: '700' },
  internalBadge: { backgroundColor: '#E2E5EA', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  internalText: { color: colors.inkMuted, fontSize: font.tiny, fontWeight: '700' },

  signout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, marginHorizontal: space.lg, borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: radius.md, paddingVertical: 14 },
  signoutText: { color: '#DC2626', fontWeight: '800', fontSize: font.h3 },
});
