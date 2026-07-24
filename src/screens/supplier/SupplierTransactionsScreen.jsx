import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { useSupplier } from '../../store/SupplierContext';
import { useNav } from '../../navigation/NavContext';
import { initials, formatMoney } from '../../utils/format';
import ScreenHeader from '../../components/ScreenHeader';
import ListFilterBar from '../../components/ListFilterBar';
import { emptyFilters, passesFilters } from '../../utils/listFilters';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = (s) => { const [y, m, d] = String(s).split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };

export default function SupplierTransactionsScreen() {
  const { transactions } = useSupplier();
  const { push } = useNav();
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(emptyFilters);

  // The "Experience" section of the filter sheet lists this owner's listings.
  const experiences = useMemo(
    () => [...new Set(transactions.map((t) => t.listingTitle).filter(Boolean))].sort(),
    [transactions],
  );
  // Everything except the status tab, so the tabs and totals agree.
  const base = useMemo(() => transactions.filter((t) => passesFilters({
    date: t.date, amount: t.amount, category: t.listingTitle,
    search: [t.guest, t.listingTitle, t.amount],
  }, filters, query)), [transactions, filters, query]);

  const filtered = base.filter((t) => status === 'all' || t.type === status);

  const revenue = filtered.filter((t) => t.type === 'completed').reduce((n, t) => n + t.amount, 0);
  const pending = filtered.filter((t) => t.type === 'pending').reduce((n, t) => n + t.amount, 0);


  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Transactions" />

      {/* Revenue summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.sumCard, { backgroundColor: '#DCFCE7' }]}>
          <Text style={[styles.sumValue, { color: '#16A34A' }]}>{formatMoney(revenue)}</Text>
          <Text style={styles.sumLabel}>Revenue (completed)</Text>
        </View>
        <View style={[styles.sumCard, { backgroundColor: colors.brandSoft }]}>
          <Text style={[styles.sumValue, { color: colors.brandDark }]}>{formatMoney(pending)}</Text>
          <Text style={styles.sumLabel}>Pending</Text>
        </View>
      </View>

      {/* Filters: status tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {STATUS_TABS.map((t) => {
          const active = status === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setStatus(t.key)} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.85}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ListFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search guest, experience or amount…"
        filters={filters}
        onChange={setFilters}
        categories={experiences}
        categoryLabel="Experience"
        show={{ rating: false }}
        style={styles.filterBar}
      />

      <FlatList
        data={filtered}
        style={{ flex: 1 }}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: space.lg, paddingTop: 6, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tx} activeOpacity={0.8} onPress={() => push('supplierBookingDetail', { id: item.id })}>
            <View style={styles.txAvatar}><Text style={styles.txAvatarText}>{initials(item.guest)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.txName}>{item.guest}</Text>
              <Text style={styles.txMeta} numberOfLines={1}>{item.listingTitle}</Text>
              <Text style={styles.txDate}>{pretty(item.date)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.txAmount, { color: item.type === 'completed' ? '#16A34A' : colors.brandDark }]}>+{formatMoney(item.amount)}</Text>
              <View style={[styles.pill, { backgroundColor: item.type === 'completed' ? '#DCFCE7' : colors.brandSoft }]}>
                <Text style={[styles.pillText, { color: item.type === 'completed' ? '#16A34A' : colors.brandDark }]}>{item.type}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No transactions for this filter.</Text>}
      />

    </View>
  );
}


const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 12, padding: space.lg, paddingBottom: 6 },
  sumCard: { flex: 1, borderRadius: radius.lg, padding: 16 },
  sumValue: { fontSize: font.h2, fontWeight: '900' },
  sumLabel: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 3 },

  filterBar: { paddingTop: 4, paddingBottom: 4 },
  // Keeps the horizontal tab strip from stretching vertically.
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabs: { paddingHorizontal: space.lg, paddingVertical: 8, gap: 8 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#101010' },


  tx: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 10, ...shadow.card },
  txAvatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  txAvatarText: { color: colors.brandDark, fontWeight: '900', fontSize: font.small },
  txName: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  txMeta: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  txDate: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 2 },
  txAmount: { fontSize: font.body, fontWeight: '900' },
  pill: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: radius.pill, marginTop: 4 },
  pillText: { fontSize: 10, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40, fontSize: font.body },

});
