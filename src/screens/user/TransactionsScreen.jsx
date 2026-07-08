import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { colors, radius, space } from '../../theme';
import { api, resolveImage, DUMMY_IMAGE } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { MONTHS_FULL } from '../../utils/booking';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';

// Mirrors the website (UserTransactionsPage): a "transaction" is a booking on
// which money actually moved. We derive everything from /bookings/me so the
// app and web show the exact same underlying rows for the same signed-in user.
const isTransaction = (b) => ['confirmed', 'completed', 'refunded'].includes(b?.status);

// A confirmed booking is "Pending" until its experience date has passed, at
// which point it's effectively "Completed" — same upcoming/completed split
// host.controller.js already uses for the host side.
const derivedStatus = (b) => {
  if (b.status === 'refunded') return 'refunded';
  if (b.status === 'completed') return 'completed';
  const end = b.scheduledEndAt || b.scheduledFor;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const past = end ? new Date(end) < today : false;
  return past ? 'completed' : 'pending';
};

const STATUS_COLOR = { pending: '#FE9A00', completed: '#009966', refunded: '#E11D48' };
const STATUS_LABEL = { pending: 'Pending', completed: 'Completed', refunded: 'Refunded' };

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'pending', label: 'Pending', match: (b) => derivedStatus(b) === 'pending' },
  { key: 'completed', label: 'Completed', match: (b) => derivedStatus(b) === 'completed' },
  { key: 'refunded', label: 'Refunds', match: (b) => derivedStatus(b) === 'refunded' },
];

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']; const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const dateOf = (b) => b.payment?.paidAt || b.updatedAt || b.createdAt;
const rowDateLabel = (iso) => {
  const d = new Date(iso);
  return `${ordinal(d.getDate())} ${MONTHS_FULL[d.getMonth()]}`;
};

export default function TransactionsScreen() {
  const { token } = useAuth();
  const { push } = useNav();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let alive = true;
    api.myBookings(token)
      .then((d) => { if (alive) setBookings((d.bookings || []).filter(isTransaction)); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  // Filter by tab, then group into month sections (newest first), matching
  // the "This Month" / "June 2026" layout.
  const groups = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab) || TABS[0];
    const rows = bookings.filter(activeTab.match)
      .sort((a, b) => new Date(dateOf(b)).getTime() - new Date(dateOf(a)).getTime());

    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const map = new Map();
    for (const b of rows) {
      const d = new Date(dateOf(b));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    }
    return Array.from(map.entries()).map(([key, data]) => {
      const [y, m] = key.split('-').map(Number);
      return { key, title: key === curKey ? 'This Month' : `${MONTHS_FULL[m - 1]} ${y}`, data };
    });
  }, [bookings, tab]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Transactions" />
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.key}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={styles.tabs}>
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={styles.tab} activeOpacity={0.7}>
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                    <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          }
          renderItem={({ item: group }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{group.title}</Text>
              <View style={styles.card}>
                {group.data.map((b, i) => {
                  const st = derivedStatus(b);
                  const color = STATUS_COLOR[st];
                  const img = resolveImage(b.item?.image);
                  return (
                    <TouchableOpacity
                      key={b.bookingCode || b.id}
                      activeOpacity={0.8}
                      onPress={() => push('bookingDetail', { code: b.bookingCode })}
                      style={[styles.row, i < group.data.length - 1 && styles.rowBorder]}
                    >
                      <Image source={{ uri: img || DUMMY_IMAGE }} style={styles.thumb} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title} numberOfLines={1}>{b.item?.name || 'Booking'}</Text>
                        <Text style={styles.subtitle}>Paid by you on {rowDateLabel(dateOf(b))}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.price, { color }]}>{formatMoney(b.pricing?.total, b.currency)}</Text>
                        <Text style={[styles.statusLabel, { color }]}>{STATUS_LABEL[st]}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState emoji="💳" title={bookings.length ? 'Nothing matches that filter' : 'No transactions yet'}
              sub={bookings.length ? 'Try a different tab.' : 'Your payment receipts appear here the moment your first booking is paid.'} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', paddingHorizontal: space.lg, paddingTop: 14, gap: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { alignItems: 'center', paddingBottom: 10 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.inkMuted },
  tabTextActive: { color: '#FE9A00' },
  tabUnderline: { height: 2, marginTop: 8, width: '100%', backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: '#FE9A00' },

  section: { paddingHorizontal: space.lg, marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 10, paddingVertical: 10, minHeight: 70 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 14, fontWeight: '600', lineHeight: 16.5, color: colors.ink },
  subtitle: { fontSize: 12, fontWeight: '400', color: colors.inkMuted, marginTop: 3 },
  price: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
  statusLabel: { fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 3 },
});
