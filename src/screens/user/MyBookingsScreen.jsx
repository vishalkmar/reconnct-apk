import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, ScrollView, TouchableOpacity } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { api, resolveImage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';

const STATUS_COLOR = {
  confirmed: colors.success, paid: colors.success,
  pending_payment: '#D97706', cancelled: '#DC2626', refunded: '#6B7280',
};
const label = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Status groups for the filter tabs (no "Upcoming", per spec).
const GROUPS = {
  pending: ['pending_payment', 'pending'],
  completed: ['confirmed', 'paid', 'completed'],
  cancelled: ['cancelled', 'refunded'],
};
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending payment' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];
const inGroup = (status, key) => key === 'all' || (GROUPS[key] || []).includes(status);

export default function MyBookingsScreen() {
  const { token } = useAuth();
  const { navigateTab } = useNav();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let alive = true;
    api.myBookings(token)
      .then((d) => { if (alive) setItems(d.bookings || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const counts = TABS.reduce((acc, t) => { acc[t.key] = items.filter((b) => inGroup(b.status, t.key)).length; return acc; }, {});
  const shown = items.filter((b) => inGroup(b.status, tab));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="My Bookings" />
      <Text style={styles.sub}>Track your upcoming trips, completed visits and cancellations — all in one place.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.8}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.badge, active && styles.badgeActive]}><Text style={[styles.badgeText, active && styles.badgeTextActive]}>{counts[t.key] || 0}</Text></View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(b) => String(b.id || b.bookingCode)}
          contentContainerStyle={{ padding: space.lg }}
          renderItem={({ item }) => {
            const snap = item.item || {};
            const img = resolveImage(snap.image || snap.mainImage);
            return (
              <View style={styles.card}>
                {img ? <Image source={{ uri: img }} style={styles.img} /> : <View style={[styles.img, styles.imgPh]} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>{snap.name || snap.title || 'Experience'}</Text>
                  <Text style={styles.code}>#{item.bookingCode}</Text>
                  {!!item.scheduledFor && <Text style={styles.meta}>📅 {String(item.scheduledFor).slice(0, 10)}</Text>}
                  <View style={styles.row}>
                    <Text style={[styles.status, { color: STATUS_COLOR[item.status] || colors.inkMuted }]}>● {label(item.status)}</Text>
                    {!!(item.pricing && item.pricing.total) && (
                      <Text style={styles.total}>{formatMoney(item.pricing.total, item.currency)}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState emoji="🎟️" title="No bookings yet"
              sub="Your booked experiences will appear here."
              cta="Explore experiences" onCta={() => navigateTab('experiences')} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkMuted, fontSize: font.small, paddingHorizontal: space.lg, paddingTop: 12 },
  tabs: { paddingHorizontal: space.lg, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#fff' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: font.tiny, fontWeight: '800', color: colors.inkMuted },
  badgeTextActive: { color: '#fff' },
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginBottom: 12, ...shadow.card },
  img: { width: 84, height: 84, borderRadius: radius.md },
  imgPh: { backgroundColor: '#DCE0E6' },
  name: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  code: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 2 },
  meta: { fontSize: font.small, color: colors.inkMuted, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  status: { fontSize: font.small, fontWeight: '700' },
  total: { fontSize: font.h3, fontWeight: '800', color: colors.price },
});
