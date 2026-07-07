import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Pressable, ScrollView } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { useHost } from '../../store/HostContext';
import { useNav } from '../../navigation/NavContext';
import { initials, formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';
import ScreenHeader from '../../components/ScreenHeader';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'pending', label: 'Pending' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = (s) => { const [y, m, d] = String(s).split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const monthKey = (s) => s.slice(0, 7);
const monthLabel = (k) => { const [y, m] = k.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };

export default function HostTransactionsScreen() {
  const { transactions, listings } = useHost();
  const { push } = useNav();
  const [status, setStatus] = useState('all');
  const [listingId, setListingId] = useState('all');
  const [month, setMonth] = useState('all');
  const [dropdown, setDropdown] = useState(null); // 'listing' | 'month' | null

  const months = useMemo(() => {
    const set = new Set(transactions.map((t) => monthKey(t.date)));
    return ['all', ...[...set].sort().reverse()];
  }, [transactions]);

  const filtered = transactions.filter((t) =>
    (status === 'all' || t.type === status) &&
    (listingId === 'all' || t.listingId === listingId) &&
    (month === 'all' || monthKey(t.date) === month));

  const revenue = filtered.filter((t) => t.type === 'completed').reduce((n, t) => n + t.amount, 0);
  const pending = filtered.filter((t) => t.type === 'pending').reduce((n, t) => n + t.amount, 0);

  const listingName = listingId === 'all' ? 'All experiences' : (listings.find((l) => l.id === listingId) || {}).title;

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
      <View style={styles.tabs}>
        {STATUS_TABS.map((t) => {
          const active = status === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setStatus(t.key)} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.85}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filters: experience + month dropdowns */}
      <View style={styles.dropRow}>
        <DropButton icon={ICONS.compass} label={listingName} onPress={() => setDropdown('listing')} />
        <DropButton icon={ICONS.calendar} label={month === 'all' ? 'All months' : monthLabel(month)} onPress={() => setDropdown('month')} />
      </View>

      <FlatList
        data={filtered}
        style={{ flex: 1 }}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ padding: space.lg, paddingTop: 6, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tx} activeOpacity={0.8} onPress={() => push('hostBookingDetail', { id: item.id })}>
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

      {/* Dropdown modal */}
      <Modal visible={dropdown !== null} transparent animationType="fade" onRequestClose={() => setDropdown(null)}>
        <Pressable style={styles.dropBackdrop} onPress={() => setDropdown(null)}>
          <View style={styles.dropCard}>
            <Text style={styles.dropTitle}>{dropdown === 'listing' ? 'Filter by experience' : 'Filter by month'}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {dropdown === 'listing' && (
                <>
                  <DropOption label="All experiences" active={listingId === 'all'} onPress={() => { setListingId('all'); setDropdown(null); }} />
                  {listings.map((l) => <DropOption key={l.id} label={l.title} active={listingId === l.id} onPress={() => { setListingId(l.id); setDropdown(null); }} />)}
                </>
              )}
              {dropdown === 'month' && months.map((m) => (
                <DropOption key={m} label={m === 'all' ? 'All months' : monthLabel(m)} active={month === m} onPress={() => { setMonth(m); setDropdown(null); }} />
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function DropButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.dropBtn} onPress={onPress} activeOpacity={0.85}>
      <Image source={icon} style={styles.dropBtnIcon} />
      <Text style={styles.dropBtnText} numberOfLines={1}>{label}</Text>
      <Text style={styles.dropCaret}>▾</Text>
    </TouchableOpacity>
  );
}
function DropOption({ label, active, onPress }) {
  return (
    <TouchableOpacity style={styles.dropOption} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.dropOptionText, active && { color: colors.brand, fontWeight: '800' }]} numberOfLines={1}>{label}</Text>
      {active && <Text style={styles.dropCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 12, padding: space.lg, paddingBottom: 6 },
  sumCard: { flex: 1, borderRadius: radius.lg, padding: 16 },
  sumValue: { fontSize: font.h2, fontWeight: '900' },
  sumLabel: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 3 },

  tabs: { flexDirection: 'row', paddingHorizontal: space.lg, paddingVertical: 8, gap: 8 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#101010' },

  dropRow: { flexDirection: 'row', gap: 10, paddingHorizontal: space.lg, paddingBottom: 6 },
  dropBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, height: 44 },
  dropBtnIcon: { width: 15, height: 15, tintColor: colors.brand },
  dropBtnText: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.ink },
  dropCaret: { fontSize: 10, color: colors.inkMuted },

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

  dropBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  dropCard: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 8, ...shadow.card },
  dropTitle: { fontSize: font.small, fontWeight: '800', color: colors.inkMuted, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  dropOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: radius.md },
  dropOptionText: { fontSize: font.body, color: colors.ink, fontWeight: '600', flex: 1 },
  dropCheck: { color: colors.brand, fontWeight: '900', fontSize: font.body, marginLeft: 8 },
});
