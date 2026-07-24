import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useSupplier } from '../../store/SupplierContext';
import { useSupplierAuth } from '../../store/SupplierAuthContext';
import { initials, formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';
import NotificationBell from '../../components/NotificationBell';
import KamSheet from '../../components/KamSheet';

const NAVY = '#15233F';

const DATE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const prettyDate = (s) => {
  if (!s) return '';
  const [y, m, d] = String(s).split('-').map(Number);
  return `${DATE_MONTHS[(m || 1) - 1]} ${d}, ${y}`;
};

export default function SupplierDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { push, navigateTab } = useNav();
  const { token, stats, profile } = useSupplier();
  const { signOut } = useSupplierAuth();
  const [kamOpen, setKamOpen] = useState(false);
  const name = profile.name || 'Supplier';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {/* Dark header — full-bleed, with a soft decorative circle top-right */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerCircle} />
        <View style={styles.headerTop}>
          <Image source={ICONS.logoWhite} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerActions}>
            <NotificationBell mode="supplier" token={token} />
          <TouchableOpacity style={styles.modePill} onPress={signOut} activeOpacity={0.85}>
            <Text style={styles.modePillText}>Supplier</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.idRow}>
          <View style={styles.avatar}><Text style={styles.avatarInit}>{initials(name)}</Text></View>
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.welcome}>Welcome back</Text>
            <Text style={styles.name}>{name}</Text>
          </View>
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.statRow}>
        <StatCard icon={ICONS.dollar} tint={colors.brand} bg="#FDEFD3" value={formatMoney(stats.earnedMonth)} label="This Month" />
        {/* Tapping Bookings opens the full All Bookings board — same place the
            web portal's "All Bookings" sidebar tab goes. */}
        <StatCard icon={ICONS.plane} tint="#2563EB" bg="#DBEAFE" value={String(stats.bookings)} label="Bookings"
          onPress={() => push('allBookings', { mode: 'supplier' })} />
        <StatCard icon={ICONS.star} tint="#16A34A" bg="#DCFCE7" value={String(stats.rating)} label="Rating" />
        {/* Your Key Account Manager — same info the web portal's KAM page shows. */}
        <StatCard icon={ICONS.people} tint="#7C3AED" bg="#EDE9FE" value="KAM" label="Assigned KAM"
          onPress={() => setKamOpen(true)} />
      </View>

      {/* Action cards */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.action, styles.actionPrimary]} activeOpacity={0.9} onPress={() => push('supplierCreateListing')}>
          <Image source={ICONS.plus} style={styles.actionPlus} />
          <Text style={styles.actionPrimaryTitle}>Create Listing</Text>
          <Text style={styles.actionPrimarySub}>Add a new experience</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.action, styles.actionGhost]} activeOpacity={0.9} onPress={() => navigateTab('listings')}>
          <View style={styles.actionGhostIcon}><Image source={ICONS.compass} style={styles.actionGhostImg} /></View>
          <Text style={styles.actionGhostTitle}>My Listings</Text>
          <Text style={styles.actionGhostSub}>{stats.activeCount} active</Text>
        </TouchableOpacity>
      </View>

      {/* Earnings */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Earnings</Text>
        </View>
        <View style={styles.earnRow}>
          <View style={styles.earnCell}>
            <Text style={styles.earnValue}>{formatMoney(stats.earnedMonth)}</Text>
            <Text style={styles.earnLabel}>This month</Text>
          </View>
          <View style={styles.earnDiv} />
          <View style={styles.earnCell}>
            <Text style={styles.earnValue}>{formatMoney(stats.earnedTotal)}</Text>
            <Text style={styles.earnLabel}>All time</Text>
          </View>
        </View>
      </View>

      {/* Recent bookings */}
      <View style={styles.recentHead}>
        <Text style={styles.recentTitle}>Recent Bookings</Text>
        <TouchableOpacity onPress={() => push('allBookings', { mode: 'supplier' })}><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
      </View>
      <View style={{ marginHorizontal: space.lg }}>
        {!stats.recentBookings.length && (
          <Text style={styles.empty}>No bookings yet on your listings.</Text>
        )}
        {stats.recentBookings.map((r) => (
          <TouchableOpacity key={r.id} style={styles.bk} activeOpacity={0.85}
            onPress={() => push('supplierBookingDetail', { id: r.id })}>
            <View style={styles.bkAvatar}><Text style={styles.bkAvatarText}>{initials(r.guest)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bkName}>{r.guest}</Text>
              <Text style={styles.bkMeta} numberOfLines={1}>{r.experience} · {prettyDate(r.date)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.bkAmount}>{formatMoney(r.amount)}</Text>
              <View style={[styles.bkPill, r.status === 'completed' ? styles.bkPillDone : styles.bkPillUp]}>
                <Text style={[styles.bkPillText, r.status === 'completed' ? styles.bkPillTextDone : styles.bkPillTextUp]}>{r.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <KamSheet visible={kamOpen} onClose={() => setKamOpen(false)} mode="supplier" token={token} />
    </ScrollView>
  );
}

// A plain card, or a tappable one when `onPress` is given.
function StatCard({ icon, tint, bg, value, label, onPress }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={styles.stat} {...(onPress ? { onPress, activeOpacity: 0.85 } : {})}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}><Image source={icon} style={{ width: 18, height: 18, tintColor: tint }} /></View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: NAVY, paddingHorizontal: space.lg, paddingBottom: 28, overflow: 'hidden' },
  headerCircle: { position: 'absolute', top: -70, right: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.045)' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 116, height: 26 },
  modePill: { backgroundColor: colors.brand, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  modePillText: { color: '#101010', fontWeight: '900', fontSize: font.small },
  idRow: { flexDirection: 'row', alignItems: 'center', marginTop: 26 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { fontSize: 20, fontWeight: '900', color: '#101010' },
  welcome: { color: 'rgba(255,255,255,0.6)', fontSize: font.small },
  name: { color: '#fff', fontSize: font.h2, fontWeight: '900', marginTop: 1 },

  statRow: { flexDirection: 'row', gap: 8, paddingHorizontal: space.lg, marginTop: 18 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', ...shadow.card },
  statIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: font.body, fontWeight: '900', color: colors.ink },
  statLabel: { fontSize: 10, color: colors.inkMuted, marginTop: 2, textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: space.lg, marginTop: 16 },
  action: { flex: 1, borderRadius: radius.lg, padding: 16, minHeight: 116, justifyContent: 'flex-end' },
  actionPrimary: { backgroundColor: colors.brand },
  actionPlus: { width: 26, height: 26, tintColor: '#101010', marginBottom: 'auto' },
  actionPrimaryTitle: { fontSize: font.h3, fontWeight: '900', color: '#101010' },
  actionPrimarySub: { fontSize: font.small, color: 'rgba(16,16,16,0.7)', marginTop: 2 },
  actionGhost: { backgroundColor: colors.surface, ...shadow.card },
  actionGhostIcon: { width: 30, height: 30, marginBottom: 'auto' },
  actionGhostImg: { width: 26, height: 26, tintColor: colors.brand },
  actionGhostTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  actionGhostSub: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: space.lg, marginTop: 16, padding: 16, ...shadow.card },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  cardSub: { fontSize: font.small, color: colors.inkMuted },
  earnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  earnCell: { flex: 1, alignItems: 'center' },
  earnValue: { fontSize: font.h2, fontWeight: '900', color: colors.brandDark },
  earnLabel: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 3 },
  earnDiv: { width: 1, height: 34, backgroundColor: colors.border },

  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, marginTop: 22, marginBottom: 12 },
  recentTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  viewAll: { color: colors.brand, fontWeight: '800', fontSize: font.small },
  bk: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 12, ...shadow.card },
  bkAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  bkAvatarText: { color: colors.brandDark, fontWeight: '900', fontSize: font.small },
  bkName: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  bkMeta: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  bkAmount: { fontSize: font.body, fontWeight: '900', color: colors.brandDark },
  bkPill: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: radius.pill, marginTop: 4 },
  bkPillUp: { backgroundColor: colors.brandSoft },
  bkPillDone: { backgroundColor: '#EEF0F3' },
  bkPillText: { fontSize: 10, fontWeight: '800' },
  bkPillTextUp: { color: colors.brandDark },
  bkPillTextDone: { color: colors.inkMuted },
  empty: { textAlign: 'center', color: colors.inkMuted, fontSize: font.body, paddingVertical: 20 },
});
