import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { useHost } from '../../store/HostContext';
import { useAuth } from '../../store/AuthContext';
import { api, resolveImage } from '../../api/client';
import { initials, formatMoney } from '../../utils/format';
import ScreenHeader from '../../components/ScreenHeader';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];
const PILL = {
  upcoming: { label: 'upcoming', bg: colors.brandSoft, fg: colors.brandDark },
  completed: { label: 'completed', bg: '#EEF0F3', fg: colors.inkMuted },
  cancelled: { label: 'cancelled', bg: '#FEE2E2', fg: '#DC2626' },
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = (s) => { const [y, m, d] = String(s).split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };

export default function ListingBookingsScreen({ listing }) {
  const { token } = useAuth();
  const { bookingsForListing } = useHost();
  const [tab, setTab] = useState('all');
  // Fetch the listing detail so we get the REAL bookings feed for this
  // experience (the list endpoint carries none). Falls back to any bookings
  // already on the passed-in listing while the request is in flight.
  const [bookings, setBookings] = useState((listing && (listing.bookings || bookingsForListing(listing.id))) || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!listing || !listing.id) { setLoading(false); return undefined; }
    api.hostListing(token, listing.id)
      .then((d) => { if (alive && d && d.listing) setBookings(d.listing.bookings || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, listing]);

  const all = bookings || [];
  const counts = TABS.reduce((a, t) => { a[t.key] = t.key === 'all' ? all.length : all.filter((b) => b.status === t.key).length; return a; }, {});
  const shown = [...(tab === 'all' ? all : all.filter((b) => b.status === tab))].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const revenue = all.filter((b) => b.status === 'completed').reduce((n, b) => n + b.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Listing" />
      {/* Listing summary */}
      <View style={styles.summary}>
        <Image source={{ uri: resolveImage(listing && listing.image) }} style={styles.img} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{listing ? listing.title : 'Listing'}</Text>
          <Text style={styles.meta}>{formatMoney(listing && listing.price)}/{(listing && listing.priceUnit) || 'person'} · {(listing && listing.durationLabel) || ''}</Text>
          <View style={styles.revPill}><Text style={styles.revText}>Earned {formatMoney(revenue)}</Text></View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.85}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.badge, active && styles.badgeActive]}><Text style={[styles.badgeText, active && styles.badgeTextActive]}>{counts[t.key] || 0}</Text></View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={shown}
        style={{ flex: 1 }}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const pill = PILL[item.status] || PILL.upcoming;
          return (
            <View style={styles.bk}>
              <View style={styles.bkAvatar}><Text style={styles.bkAvatarText}>{initials(item.guest)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bkName}>{item.guest}</Text>
                <Text style={styles.bkMeta}>{pretty(item.date)} · {item.guests} guest{item.guests > 1 ? 's' : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.bkAmount}>{formatMoney(item.amount)}</Text>
                <View style={[styles.pill, { backgroundColor: pill.bg }]}><Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text></View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={loading
          ? <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
          : <Text style={styles.empty}>No {tab === 'all' ? '' : tab} bookings yet for this listing.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 12, padding: space.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  img: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: '#DCE0E6' },
  title: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  meta: { fontSize: font.small, color: colors.inkMuted, marginTop: 3 },
  revPill: { alignSelf: 'flex-start', backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, marginTop: 6 },
  revText: { color: '#16A34A', fontWeight: '800', fontSize: font.tiny },

  tabs: { flexDirection: 'row', paddingHorizontal: space.lg, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#101010' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeActive: { backgroundColor: 'rgba(16,16,16,0.18)' },
  badgeText: { fontSize: font.tiny, fontWeight: '800', color: colors.inkMuted },
  badgeTextActive: { color: '#101010' },

  bk: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 12, ...shadow.card },
  bkAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  bkAvatarText: { color: colors.brandDark, fontWeight: '900', fontSize: font.small },
  bkName: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  bkMeta: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  bkAmount: { fontSize: font.body, fontWeight: '900', color: colors.brandDark },
  pill: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: radius.pill, marginTop: 4 },
  pillText: { fontSize: 10, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40, fontSize: font.body },
});
