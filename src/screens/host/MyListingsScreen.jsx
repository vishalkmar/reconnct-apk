import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useHost } from '../../store/HostContext';
import { resolveImage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';
import ListFilterBar from '../../components/ListFilterBar';
import { emptyFilters, passesFilters } from '../../utils/listFilters';

// Same wording and the same four lanes the Supplier Portal and the website
// use, driven by the SAME `tab` the API sends (submitterTab) — so an owner
// sees an identical board on web and app, host or supplier.
const STATUS = {
  active: { label: 'Published', bg: '#16A34A' },
  approved: { label: 'Published', bg: '#16A34A' },
  pending: { label: 'Pending review', bg: '#D97706' },
  changes: { label: 'Objections', bg: '#DC2626' },
  draft: { label: 'Draft', bg: '#6B7280' },
  paused: { label: 'Paused', bg: '#D97706' },
};
const badgeFor = (l) => (l.isPublished ? { label: 'Published', bg: '#16A34A' } : (STATUS[l.status] || STATUS.draft));

const TABS = [
  { key: 'in_queue', label: 'Under Review' },
  { key: 'live', label: 'Published' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'delisted', label: 'Delisted' },
];

// Fallback for an older API build that sends no `tab`.
const deriveTab = (l) => {
  const stage = l.review?.stage || null;
  if (stage === 'delisted') return 'delisted';
  if (l.isPublished || stage === 'live') return 'live';
  if (['rejected', 'qc_rejected'].includes(stage) || (l.reviewStatus === 'archived' && stage !== 'delisted')) return 'rejected';
  return 'in_queue';
};
const tabOf = (l) => {
  const t = l.tab || deriveTab(l);
  return t === 'under_progress' ? 'in_queue' : t;
};
/*
  Free-form editing is for a plain draft ONLY. Once it has been submitted the
  website routes every change through the objection-resolution flow, so Edit
  must disappear there — showing it (as this screen used to) let an owner think
  they could still edit a listing that is locked under review.
*/
const isPlainDraft = (l) => l.reviewStatus === 'draft' && l.status === 'draft' && !l.review?.stage;
const canEditOf = (l) => (typeof l.canEdit === 'boolean' ? l.canEdit : isPlainDraft(l));
const canDeleteOf = (l) => (typeof l.canDelete === 'boolean' ? l.canDelete : isPlainDraft(l));

export default function MyListingsScreen() {
  const insets = useSafeAreaInsets();
  const { push } = useNav();
  const { listings, removeListing } = useHost();
  const [tab, setTab] = useState('in_queue');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(emptyFilters);

  const categories = useMemo(() => [...new Set(listings.map((l) => l.category).filter(Boolean))].sort(), [listings]);
  // Every filter except the status tab, so the tab counts match the list.
  const base = useMemo(() => listings.filter((l) => passesFilters({
    date: l.createdAt, amount: l.price, category: l.category, rating: l.rating,
    search: [l.title, l.city, l.price, l.category],
  }, filters, query)), [listings, filters, query]);
  const countFor = (t) => base.filter((l) => tabOf(l) === t.key).length;
  const shown = base.filter((l) => tabOf(l) === tab);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>My Listings</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.9} onPress={() => push('createListing')}>
          <Image source={ICONS.plus} style={styles.addIcon} />
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ListFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search by name, location or price…"
        filters={filters}
        onChange={setFilters}
        categories={categories}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, on && styles.tabActive]} activeOpacity={0.85}>
              <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.tabBadge, on && styles.tabBadgeActive]}><Text style={[styles.tabBadgeText, on && styles.tabBadgeTextActive]}>{countFor(t)}</Text></View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={shown}
        style={{ flex: 1 }}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ padding: space.lg, paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>{query.trim() ? `No listings match "${query.trim()}".` : `Nothing in ${TABS.find((t) => t.key === tab)?.label}.`}</Text>}
        renderItem={({ item }) => {
          const st = badgeFor(item);
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
                {item.status === 'changes' && (
                  <TouchableOpacity style={styles.resolveBtn} activeOpacity={0.9}
                    onPress={() => push('resolveObjections', { id: item.id, mode: 'host' })}>
                    <Image source={ICONS.edit} style={styles.resolveIcon} />
                    <Text style={styles.resolveText}>Resolve objections</Text>
                  </TouchableOpacity>
                )}
                {/* Identical rules to the web portal: edit only while it's a
                    plain draft, bookings only once it's actually live. */}
                <View style={styles.actions}>
                  {canEditOf(item) ? (
                    <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => push('createListing', { listing: item })}>
                      <Image source={ICONS.edit} style={styles.btnIcon} />
                      <Text style={styles.btnText}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => push('hostListingDetail', { id: item.id, listing: item })}>
                      <Image source={ICONS.eye} style={styles.btnIcon} />
                      <Text style={styles.btnText}>View</Text>
                    </TouchableOpacity>
                  )}
                  {item.isPublished && (
                    <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => push('listingBookings', { listing: item })}>
                      <Image source={ICONS.ticket} style={styles.btnIcon} />
                      <Text style={styles.btnText}>Bookings</Text>
                    </TouchableOpacity>
                  )}
                  {canDeleteOf(item) && (
                    <TouchableOpacity style={styles.trashBtn} activeOpacity={0.85}
                      onPress={() => Alert.alert('Delete listing', `Remove "${item.title}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeListing(item.id) }])}>
                      <Image source={ICONS.trash} style={styles.trashIcon} />
                    </TouchableOpacity>
                  )}
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
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#DC2626', height: 42, borderRadius: radius.md, marginTop: 12 },
  resolveIcon: { width: 16, height: 16, tintColor: '#fff' },
  resolveText: { color: '#fff', fontWeight: '900', fontSize: font.body },
  addText: { color: '#101010', fontWeight: '900', fontSize: font.small },


  // Keeps the horizontal tab strip from stretching vertically.
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabs: { gap: 8, paddingHorizontal: space.lg, paddingTop: 12 },
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
