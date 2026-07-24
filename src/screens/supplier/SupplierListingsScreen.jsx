import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, Alert, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useSupplier } from '../../store/SupplierContext';
import { api, resolveImage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';
import { loadUnseen } from '../../utils/reviewSeen';
import ListFilterBar from '../../components/ListFilterBar';
import { emptyFilters, passesFilters } from '../../utils/listFilters';

// Same badge wording as the web portal.
const STATUS = {
  active: { label: 'Published', bg: '#16A34A' },
  approved: { label: 'Published', bg: '#16A34A' },
  pending: { label: 'Pending review', bg: '#D97706' },
  changes: { label: 'Objections', bg: '#DC2626' },
  draft: { label: 'Draft', bg: '#6B7280' },
  paused: { label: 'Paused', bg: '#D97706' },
};
/*
  Whether this listing REALLY has objections waiting on the owner.

  Deliberately NOT `status === 'changes'`: that comes from data.hostStatus,
  a legacy mirror the backend itself documents as "not always cleared when a
  round ends" — a resubmitted listing kept 'changes' all the way to QCOPS. That
  left a dead "Resolve objections" button that opened an empty screen. The
  review round's own objection list is the truth.
*/
const openObjections = (l) => ((l.review && l.review.objections) || []).length;
const hasOpenObjections = (l) => openObjections(l) > 0;


// Center Ops passed content review (round 1) and handed it to QCOPS for the
// on-site check. Green, because for the owner this is a WIN — the old amber
// "Pending review" made an approved listing look like it was still waiting.
const QC_STAGES = ['qc_assigned', 'qc_acknowledged', 'qc_onsite', 'qc_feedback'];
const QC_PASSED = 'qc_passed';
const copsApproved = (l) => {
  const stage = (l.review && l.review.stage) || null;
  return QC_STAGES.includes(stage) || stage === QC_PASSED;
};

const badgeFor = (l) => {
  if (l.isPublished) return { label: 'Published', bg: '#16A34A' };
  if (hasOpenObjections(l)) return STATUS.changes;
  if (copsApproved(l)) {
    return (l.review && l.review.stage) === QC_PASSED
      ? { label: 'Quality check passed', bg: '#16A34A' }
      : { label: 'Round 1 approved · QCOPS visit', bg: '#16A34A' };
  }
  // status may still say 'changes' after a resubmit — fall back to review.
  if (l.status === 'changes') return STATUS.pending;
  return STATUS[l.status] || STATUS.draft;
};
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
  const [filters, setFilters] = useState(emptyFilters);
  // Listings whose review moved on since the owner last opened them.
  const [unseen, setUnseen] = useState(() => new Set());
  const [refreshing, setRefreshing] = useState(false);
  /*
    Listings are otherwise fetched ONCE at login, so a listing that went live
    (or picked up an objection) server-side kept showing its old tab and badge
    until the app was reinstalled. Refresh whenever this screen is shown, and
    let the owner pull to force it.
  */
  useEffect(() => { if (reload) reload(); }, [reload]);
  const onRefresh = async () => {
    setRefreshing(true);
    try { if (reload) await reload(); } finally { setRefreshing(false); }
  };
  useEffect(() => { loadUnseen(listings).then(setUnseen).catch(() => {}); }, [listings]);

  // A supplier can self-add listings only once they already have a live one
  // (the first is onboarded by their account manager / BD).
  const hasLive = listings.some((l) => l.isPublished || tabOf(l) === 'live');
  const onAdd = () => {
    if (!hasLive) return Alert.alert('Almost there', 'You can add your own listings once your first experience is live on the platform. Your account manager onboards the first one.');
    push('supplierCreateListing');
  };
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
        <TouchableOpacity style={[styles.addBtn, !hasLive && { opacity: 0.5 }]} activeOpacity={0.9} onPress={onAdd}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListEmptyComponent={<Text style={styles.empty}>{query.trim() ? `No listings match "${query.trim()}".` : `Nothing in ${TABS.find((t) => t.key === tab)?.label}.`}</Text>}
        renderItem={({ item }) => {
          const st = badgeFor(item);
          const img = resolveImage(item.image);
          return (
            <View style={styles.card}>
              <View style={styles.imgWrap}>
                {img ? <Image source={{ uri: img }} style={styles.img} /> : <View style={[styles.img, styles.imgPh]} />}
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}><Text style={styles.statusText}>{st.label}</Text></View>
                {unseen.has(item.id) && (
                  <View style={styles.newDot}><Text style={styles.newDotText}>NEW</Text></View>
                )}
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

                {/* Center Ops raised objections — the ONLY way to change a
                    listing once it's in review, exactly like the website. */}
                {hasOpenObjections(item) && (
                  <TouchableOpacity style={styles.resolveBtn} activeOpacity={0.9}
                    onPress={() => push('resolveObjections', { id: item.id, mode: 'supplier' })}>
                    <Image source={ICONS.edit} style={styles.resolveIcon} />
                    <Text style={styles.resolveText}>Resolve objections</Text>
                  </TouchableOpacity>
                )}

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


  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#DC2626', height: 44, borderRadius: radius.md, marginTop: 10 },
  resolveIcon: { width: 16, height: 16, tintColor: '#fff' },
  resolveText: { color: '#fff', fontWeight: '900', fontSize: font.body },

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
  // "Review moved on since you last looked" — cleared when they open View.
  newDot: { position: 'absolute', top: 10, right: 10, backgroundColor: '#DC2626', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  newDotText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
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
