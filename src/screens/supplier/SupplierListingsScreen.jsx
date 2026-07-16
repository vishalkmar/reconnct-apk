import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useSupplier } from '../../store/SupplierContext';
import { resolveImage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';

const STATUS = {
  active: { label: 'approved', bg: '#16A34A' },
  pending: { label: 'pending', bg: '#D97706' },
  draft: { label: 'draft', bg: '#6B7280' },
  paused: { label: 'paused', bg: '#D97706' },
};
// Filter tabs → which listing statuses they include.
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
  { key: 'approved', label: 'Approved', statuses: ['active'] },
  { key: 'draft', label: 'Drafts', statuses: ['draft'] },
];

export default function SupplierListingsScreen() {
  const insets = useSafeAreaInsets();
  const { push } = useNav();
  const { listings, removeListing } = useSupplier();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const soon = (w) => Alert.alert(w, 'Coming soon.');

  const countFor = (t) => (t.key === 'all' ? listings.length : listings.filter((l) => t.statuses.includes(l.status)).length);
  const active = TABS.find((t) => t.key === tab);
  const byTab = tab === 'all' ? listings : listings.filter((l) => active.statuses.includes(l.status));
  // Search by name, city or price.
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((l) => (
      (l.title || '').toLowerCase().includes(q)
      || (l.city || '').toLowerCase().includes(q)
      || String(l.price || '').includes(q)
    ));
  }, [byTab, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>My Listings</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.9} onPress={() => push('supplierCreateListing')}>
          <Image source={ICONS.plus} style={styles.addIcon} />
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Image source={ICONS.searchMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, location or price…"
          placeholderTextColor={colors.inkFaint}
          value={query}
          onChangeText={setQuery}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, on && styles.tabActive]} activeOpacity={0.85}>
              <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.tabBadge, on && styles.tabBadgeActive]}><Text style={[styles.tabBadgeText, on && styles.tabBadgeTextActive]}>{countFor(t)}</Text></View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={shown}
        style={{ flex: 1 }}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ padding: space.lg, paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>{query.trim() ? `No listings match "${query.trim()}".` : `No ${tab === 'all' ? '' : tab} listings yet.`}</Text>}
        renderItem={({ item }) => {
          const st = STATUS[item.status] || STATUS.draft;
          const img = resolveImage(item.image);
          return (
            <View style={styles.card}>
              <View style={styles.imgWrap}>
                {img ? <Image source={{ uri: img }} style={styles.img} /> : <View style={[styles.img, styles.imgPh]} />}
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}><Text style={styles.statusText}>{st.label}</Text></View>
              </View>
              <View style={styles.body}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.rating}><Image source={ICONS.star} style={styles.ratingIcon} /><Text style={styles.ratingText}>{item.rating || '—'}</Text></View>
                </View>
                <Text style={styles.meta}>{formatMoney(item.price)}/{item.priceUnit || 'person'} · {item.durationLabel || '—'}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => soon('Edit listing')}>
                    <Image source={ICONS.edit} style={styles.btnIcon} />
                    <Text style={styles.btnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => push('supplierListingBookings', { listing: item })}>
                    <Image source={ICONS.eye} style={styles.btnIcon} />
                    <Text style={styles.btnText}>Bookings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.trashBtn} activeOpacity={0.85}
                    onPress={() => Alert.alert('Delete listing', `Remove "${item.title}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeListing(item.id) }])}>
                    <Image source={ICONS.trash} style={styles.trashIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: font.h2, fontWeight: '900', color: colors.ink },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  addIcon: { width: 16, height: 16, tintColor: '#101010' },
  addText: { color: '#101010', fontWeight: '900', fontSize: font.small },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, marginHorizontal: space.lg, marginTop: 12, paddingHorizontal: 14, height: 42 },
  searchIcon: { width: 15, height: 15, tintColor: colors.inkFaint },
  searchInput: { flex: 1, fontSize: font.small, color: colors.ink, paddingVertical: 0 },
  searchClear: { color: colors.inkFaint, fontSize: 13, fontWeight: '700' },

  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: space.lg, paddingTop: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#101010' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeActive: { backgroundColor: 'rgba(16,16,16,0.18)' },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: colors.inkMuted },
  tabBadgeTextActive: { color: '#101010' },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 50, fontSize: font.body },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 14, overflow: 'hidden', ...shadow.card },
  imgWrap: { height: 130 },
  img: { width: '100%', height: '100%' },
  imgPh: { backgroundColor: '#DCE0E6' },
  statusPill: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  statusText: { color: '#fff', fontSize: font.tiny, fontWeight: '900' },
  body: { padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1, fontSize: font.h3, fontWeight: '900', color: '#1A1A2E' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 },
  ratingIcon: { width: 13, height: 13, tintColor: '#F9B402' },
  ratingText: { fontSize: font.small, fontWeight: '800', color: '#F9B402' },
  meta: { fontSize: font.small, color: '#888899', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  btnIcon: { width: 15, height: 15, tintColor: colors.ink },
  btnText: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  trashBtn: { width: 42, height: 42, borderRadius: radius.md, borderWidth: 1.5, borderColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center' },
  trashIcon: { width: 17, height: 17, tintColor: '#DC2626' },
});
