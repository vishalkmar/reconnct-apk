import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { api } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import { ICONS } from '../../icons';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';

// Mirrors the website (UserTransactionsPage): a "transaction" is a booking on
// which money actually moved. We derive everything from /bookings/me so the app
// and web show the exact same rows for the same signed-in user.
const TYPE_LABEL = {
  package: 'Retreat', room: 'Hotel Room', event: 'Event',
  addon: 'Add-on Activity', experience: 'Experience', event_activity: 'Activity',
};

const isPaid = (b) => !!b?.payment?.paidAt || ['confirmed', 'completed', 'refunded'].includes(b?.status);
const isRefunded = (b) => b?.status === 'refunded';

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'paid', label: 'Payments', match: (b) => b.status === 'confirmed' || b.status === 'completed' },
  { key: 'refunded', label: 'Refunds', match: (b) => b.status === 'refunded' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  let h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${h}:${mm} ${ap}`;
}

export default function TransactionsScreen() {
  const { token } = useAuth();
  const { push } = useNav();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    api.myBookings(token)
      .then((d) => { if (alive) setBookings((d.bookings || []).filter(isPaid)); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const stats = useMemo(() => {
    let paid = 0; let refunded = 0;
    for (const b of bookings) {
      const t = Number(b.pricing?.total || 0);
      if (b.status === 'refunded') refunded += t;
      else if (b.status === 'confirmed' || b.status === 'completed') paid += t;
    }
    return { paid, refunded, net: paid - refunded };
  }, [bookings]);

  const counts = useMemo(
    () => TABS.reduce((acc, t) => { acc[t.key] = bookings.filter(t.match).length; return acc; }, {}),
    [bookings],
  );

  const shown = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab) || TABS[0];
    let rows = bookings.filter(activeTab.match);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((b) =>
        (b.bookingCode || '').toLowerCase().includes(q) ||
        (b.item?.name || '').toLowerCase().includes(q) ||
        (b.payment?.paymentId || '').toLowerCase().includes(q) ||
        (b.payment?.orderId || '').toLowerCase().includes(q));
    }
    return rows.sort((a, b) => {
      const ta = new Date(a.payment?.paidAt || a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.payment?.paidAt || b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [bookings, tab, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Transactions" />
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(b, i) => String(b.bookingCode || b.id || i)}
          contentContainerStyle={{ padding: space.lg, paddingBottom: 32 }}
          ListHeaderComponent={
            <View>
              <Text style={styles.sub}>Every payment and refund, with the linked booking attached.</Text>
              <View style={styles.statsRow}>
                <StatCard label="Total paid" value={formatMoney(stats.paid, 'INR')} tint="#DCFCE7" fg="#059669" arrow="↑" />
                <StatCard label="Refunded" value={formatMoney(stats.refunded, 'INR')} tint="#FEE2E2" fg="#E11D48" arrow="↓" />
                <StatCard label="Net spend" value={formatMoney(stats.net, 'INR')} tint={colors.brandSoft} fg={colors.brandText} arrow="₹" />
              </View>
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
              <View style={styles.searchWrap}>
                <Image source={ICONS.searchMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search code, item, payment id…"
                  placeholderTextColor={colors.inkFaint}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const refunded = isRefunded(item);
            return (
              <TouchableOpacity style={styles.row} activeOpacity={0.85} onPress={() => push('bookingDetail', { code: item.bookingCode })}>
                <View style={[styles.dot, { backgroundColor: refunded ? '#FEE2E2' : '#DCFCE7' }]}>
                  <Text style={{ color: refunded ? '#E11D48' : '#059669', fontWeight: '900' }}>{refunded ? '↓' : '↑'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.desc} numberOfLines={1}>{item.item?.name || 'Booking'}</Text>
                  <Text style={styles.date}>{fmtDateTime(item.payment?.paidAt || item.updatedAt || item.createdAt)}</Text>
                  <Text style={styles.metaLine} numberOfLines={1}>
                    <Text style={styles.code}>{item.bookingCode}</Text>
                    {item.item?.type ? `  ·  ${TYPE_LABEL[item.item.type] || item.item.type}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.amt, { color: refunded ? '#E11D48' : '#059669' }]}>
                    {refunded ? '− ' : ''}{formatMoney(item.pricing?.total, item.currency)}
                  </Text>
                  <Text style={styles.detailsLink}>Details ›</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState emoji="💳" title={bookings.length ? 'Nothing matches that filter' : 'No transactions yet'}
              sub={bookings.length ? 'Try a different tab or clear the search.' : 'Your payment receipts appear here the moment your first booking is paid.'} />
          }
        />
      )}
    </View>
  );
}

function StatCard({ label, value, tint, fg, arrow }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}><Text style={{ color: fg, fontWeight: '900' }}>{arrow}</Text></View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkMuted, fontSize: font.small, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, ...shadow.card },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statLabel: { fontSize: 10, color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 15, fontWeight: '900', color: colors.ink, marginTop: 2 },

  tabs: { paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#fff' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: font.tiny, fontWeight: '800', color: colors.inkMuted },
  badgeTextActive: { color: '#fff' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: colors.border, marginBottom: 6 },
  searchIcon: { width: 15, height: 15, tintColor: colors.inkFaint, marginRight: 8 },
  searchInput: { flex: 1, color: colors.ink, fontSize: font.body, paddingVertical: 0 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginTop: 10, ...shadow.card },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: font.body, color: colors.ink, fontWeight: '700' },
  date: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  metaLine: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 1 },
  code: { fontWeight: '700', color: colors.inkMuted },
  amt: { fontSize: font.body, fontWeight: '900' },
  detailsLink: { fontSize: font.tiny, color: colors.brandText, fontWeight: '800', marginTop: 3 },
});
