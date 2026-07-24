import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useAuth } from '../../store/AuthContext';
import { useSupplierAuth } from '../../store/SupplierAuthContext';
import { api } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';
import ScreenHeader from '../../components/ScreenHeader';
import ListFilterBar from '../../components/ListFilterBar';
import { emptyFilters, passesFilters } from '../../utils/listFilters';

/*
  "All Bookings" — every booking across ALL of this owner's listings, the app
  counterpart of the website's All Bookings tab. Category tabs (All / Upcoming /
  Ongoing / Completed, plus Cancelled) with live counts, a search box (guest
  name / email / phone / amount), and tap-through to the booking detail.

  `mode` chooses supplier vs host identity + endpoint so one screen serves both.
*/
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLE = {
  upcoming: { label: 'Upcoming', bg: '#DBEAFE', fg: '#1D4ED8' },
  ongoing: { label: 'Ongoing', bg: '#FEF9C3', fg: '#A16207' },
  completed: { label: 'Completed', bg: '#DCFCE7', fg: '#15803D' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', fg: '#B91C1C' },
};

const fmtDate = (s) => {
  if (!s) return '—';
  try {
    const d = typeof s === 'string' && s.length <= 10 ? new Date(`${s}T00:00:00`) : new Date(s);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return String(s); }
};

export default function AllBookingsScreen({ mode = 'supplier' }) {
  const { push } = useNav();
  const userAuth = useAuth();
  const supplierAuth = useSupplierAuth();
  const token = mode === 'host' ? userAuth.token : supplierAuth.token;
  const fetchAll = mode === 'host' ? api.hostAllBookings : api.supplierAllBookings;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(emptyFilters);

  // Bookings are filtered by their experience (scheduled) date.
  const dateOf = (b) => b.scheduledFor || b.bookedAt;
  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [rows],
  );

  const load = useCallback(async () => {
    try {
      const d = await fetchAll(token);
      setRows((d && d.bookings) || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAll, token]);

  useEffect(() => { load(); }, [load]);

  /*
    Every filter EXCEPT the status tab — the tab counts are computed off this,
    so the numbers on the tabs always agree with what's listed below.
  */
  const base = useMemo(() => rows.filter((r) => passesFilters({
    date: dateOf(r),
    amount: r.amount,
    category: r.category,
    rating: r.rating,
    search: [r.guestName, r.guestEmail, r.guestPhone, r.amount, r.experienceName],
  }, filters, query)), [rows, filters, query]);

  const countFor = (key) => (key === 'all' ? base.length : base.filter((r) => r.status === key).length);

  // Newest booking first, matching the web table's ordering.
  const shown = useMemo(() => base
    .filter((r) => tab === 'all' || r.status === tab)
    .sort((a, b) => String(b.bookedAt).localeCompare(String(a.bookedAt))), [base, tab]);

  const openDetail = (b) => push(mode === 'host' ? 'hostBookingDetail' : 'supplierBookingDetail', { id: b.id });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="All Bookings" />

      <ListFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search name, email, phone or amount…"
        filters={filters}
        onChange={setFilters}
        categories={categories}
      />

      <View style={styles.tabsWrap}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          contentContainerStyle={{ paddingHorizontal: space.lg, gap: 8 }}
          renderItem={({ item: t }) => {
            const on = tab === t.key;
            return (
              <TouchableOpacity onPress={() => setTab(t.key)} style={[styles.tab, on && styles.tabActive]} activeOpacity={0.85}>
                <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
                <View style={[styles.tabBadge, on && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, on && styles.tabBadgeTextActive]}>{countFor(t.key)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: space.lg, paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>{query.trim() ? `No bookings match "${query.trim()}".` : 'No bookings here yet.'}</Text>}
          renderItem={({ item }) => {
            const st = STATUS_STYLE[item.status] || STATUS_STYLE.upcoming;
            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => openDetail(item)}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guest} numberOfLines={1}>{item.guestName}</Text>
                    <Text style={styles.exp} numberOfLines={1}>{item.experienceName}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Meta icon={ICONS.calendar} text={fmtDate(item.scheduledFor)} />
                  {!!item.slot && <Meta icon={ICONS.clock} text={item.slot} />}
                  <Meta icon={ICONS.people} text={`${item.guests} guest${item.guests > 1 ? 's' : ''}`} />
                </View>

                <View style={styles.cardBottom}>
                  <Text style={styles.contact} numberOfLines={1}>
                    {[item.guestEmail, item.guestPhone].filter(Boolean).join(' · ') || 'No contact'}
                  </Text>
                  <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function Meta({ icon, text }) {
  return (
    <View style={styles.meta}>
      {icon ? <Image source={icon} style={styles.metaIcon} /> : null}
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({

  tabsWrap: { paddingTop: 12, paddingBottom: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#101010' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeActive: { backgroundColor: 'rgba(16,16,16,0.18)' },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: colors.inkMuted },
  tabBadgeTextActive: { color: '#101010' },

  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 50, fontSize: font.body },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 12, ...shadow.card },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  guest: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  exp: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontSize: font.tiny, fontWeight: '900' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaIcon: { width: 13, height: 13, tintColor: colors.inkMuted },
  metaText: { fontSize: font.small, color: colors.inkMuted },

  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  contact: { flex: 1, fontSize: font.tiny, color: colors.inkMuted },
  amount: { fontSize: font.h3, fontWeight: '900', color: colors.price },
});
