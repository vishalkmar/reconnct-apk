import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useSupplier } from '../../store/SupplierContext';
import { api, resolveImage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';

// Same badge wording as the web portal.
const STATUS = {
  active: { label: 'Published', bg: '#16A34A' },
  approved: { label: 'Published', bg: '#16A34A' },
  pending: { label: 'Pending review', bg: '#D97706' },
  changes: { label: 'Objections', bg: '#DC2626' },
  draft: { label: 'Draft', bg: '#6B7280' },
  paused: { label: 'Paused', bg: '#D97706' },
};
const badgeFor = (l) => (l.isPublished
  ? { label: 'Published', bg: '#16A34A' }
  : (STATUS[l.status] || STATUS.draft));
/*
  The SAME four lanes the web Supplier Portal shows, driven by the SAME `tab`
  the API sends (submitterTab) — so a supplier sees an identical board whether
  they sign in on the app or the website.
*/
const TABS = [
  { key: 'in_queue', label: 'Under Review' },
  { key: 'live', label: 'Published' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'delisted', label: 'Delisted' },
];

// Mirrors the web's fallback: an older API build sends no `tab`, and treating
// that as "under review" would file LIVE listings under review.
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
// Free-form editing is for a plain draft only; once submitted, the website
// routes every change through the objection-resolution flow.
const isPlainDraft = (l) => l.reviewStatus === 'draft' && l.status === 'draft' && !l.review?.stage;
const canEditOf = (l) => (typeof l.canEdit === 'boolean' ? l.canEdit : isPlainDraft(l));
const canDeleteOf = (l) => (typeof l.canDelete === 'boolean' ? l.canDelete : isPlainDraft(l));

/*
  QCOPS asked for changes after the on-site check and the platform accepted on
  this supplier's behalf — so they're the ones who have to do the work. A tick
  isn't enough: the website requires a written commitment, which is shown back
  on the submitter's card, so the note is mandatory here too.
*/
function UpChangesBlock({ listing, onDone }) {
  const { token } = useSupplier();
  const up = listing.upChanges;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!note.trim()) return Alert.alert('A note is required', 'Please write how you’ll address the requested changes.');
    setBusy(true);
    try {
      await api.supplierAckChanges(token, listing.id, note.trim());
      setOpen(false); setNote('');
      onDone && onDone();
      Alert.alert('Sent', 'Your acknowledgement has been shared.');
    } catch (e) {
      Alert.alert('Could not send', e?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.upBox}>
      <Text style={styles.upHead}>{(up.changeType || '').toUpperCase()} CHANGES REQUESTED</Text>
      <Text style={styles.upBody}>{up.changeDetails || '—'}</Text>
      {!!up.deadline && <Text style={styles.upDeadline}>Agreed deadline: {up.deadline}</Text>}

      {up.ack ? (
        <View style={styles.upAck}><Text style={styles.upAckText}>
          <Text style={styles.upAckLabel}>You acknowledged: </Text>{up.ack.note}
        </Text></View>
      ) : up.needsAck && (open ? (
        <View style={{ marginTop: 8 }}>
          <TextInput
            style={styles.upInput}
            placeholder="How will you address this?"
            placeholderTextColor={colors.inkFaint}
            value={note}
            onChangeText={setNote}
            multiline
          />
          <View style={styles.upBtnRow}>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.upCancel}><Text style={styles.upCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={send} disabled={busy} style={[styles.upSend, busy && { opacity: 0.6 }]} activeOpacity={0.85}>
              <Text style={styles.upSendText}>{busy ? 'Sending…' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.upAckBtn} activeOpacity={0.85}>
          <Text style={styles.upAckBtnText}>Acknowledge</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SupplierListingsScreen() {
  const insets = useSafeAreaInsets();
  const { push } = useNav();
  const { listings, removeListing, reload } = useSupplier();
  const [tab, setTab] = useState('in_queue');
  const [query, setQuery] = useState('');

  // A supplier can self-add listings only once they already have a live one
  // (the first is onboarded by their account manager / BD).
  const hasLive = listings.some((l) => l.isPublished || tabOf(l) === 'live');
  const onAdd = () => {
    if (!hasLive) return Alert.alert('Almost there', 'You can add your own listings once your first experience is live on the platform. Your account manager onboards the first one.');
    push('supplierCreateListing');
  };
  const countFor = (t) => listings.filter((l) => tabOf(l) === t.key).length;
  const byTab = listings.filter((l) => tabOf(l) === tab);
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
        <TouchableOpacity style={[styles.addBtn, !hasLive && { opacity: 0.5 }]} activeOpacity={0.9} onPress={onAdd}>
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
                {/* Post-QC changes this supplier has to confirm in writing —
                    the same block (and the same endpoint) as the website. */}
                {item.upChanges && <UpChangesBlock listing={item} onDone={reload} />}

                {/* Identical rules to the web portal: edit only while it's a
                    plain draft, bookings only once it's actually live. */}
                <View style={styles.actions}>
                  {canEditOf(item) ? (
                    <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => push('supplierCreateListing', { listing: item })}>
                      <Image source={ICONS.edit} style={styles.btnIcon} />
                      <Text style={styles.btnText}>Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => push('supplierListingDetail', { id: item.id, listing: item })}>
                      <Image source={ICONS.eye} style={styles.btnIcon} />
                      <Text style={styles.btnText}>View</Text>
                    </TouchableOpacity>
                  )}
                  {item.isPublished && (
                    <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => push('supplierListingBookings', { listing: item })}>
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
  addText: { color: '#101010', fontWeight: '900', fontSize: font.small },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, marginHorizontal: space.lg, marginTop: 12, paddingHorizontal: 14, height: 42 },
  searchIcon: { width: 15, height: 15, tintColor: colors.inkFaint },
  searchInput: { flex: 1, fontSize: font.small, color: colors.ink, paddingVertical: 0 },
  searchClear: { color: colors.inkFaint, fontSize: 13, fontWeight: '700' },

  upBox: { backgroundColor: '#FFFBEB', borderRadius: radius.md, padding: 10, marginTop: 10 },
  upHead: { fontSize: 10, fontWeight: '900', color: '#B45309', letterSpacing: 0.4 },
  upBody: { fontSize: font.small, color: '#78350F', marginTop: 4, lineHeight: 18 },
  upDeadline: { fontSize: 11, color: '#B45309', marginTop: 4 },
  upAck: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: 8, marginTop: 8 },
  upAckText: { fontSize: font.small, color: '#065F46', lineHeight: 18 },
  upAckLabel: { fontWeight: '800' },
  upAckBtn: { alignSelf: 'flex-start', backgroundColor: colors.success, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, marginTop: 8 },
  upAckBtnText: { color: colors.white, fontWeight: '800', fontSize: font.small },
  upInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 10, paddingVertical: 8, minHeight: 64, textAlignVertical: 'top', color: colors.ink, fontSize: font.small,
  },
  upBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  upCancel: { paddingHorizontal: 12, paddingVertical: 7 },
  upCancelText: { color: colors.inkMuted, fontWeight: '700', fontSize: font.small },
  upSend: { backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.pill },
  upSendText: { color: colors.white, fontWeight: '800', fontSize: font.small },

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
