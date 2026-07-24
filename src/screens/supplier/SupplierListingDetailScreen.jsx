import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { colors, radius, font, space } from '../../theme';
import { useSupplierAuth } from '../../store/SupplierAuthContext';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import { api, resolveImage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { ICONS } from '../../icons';
import ScreenHeader from '../../components/ScreenHeader';
import { markReviewSeen } from '../../utils/reviewSeen';

// Admin-entered text can carry stray HTML — strip it so the page stays tidy.
const stripHtml = (s) => String(s || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&amp;|&#39;|&quot;/g, (m) => ({ '&nbsp;': ' ', '&amp;': '&', '&#39;': "'", '&quot;': '"' }[m]))
  .replace(/\s+/g, ' ')
  .trim();

const STATUS = {
  active: { label: 'Published', bg: '#16A34A' },
  approved: { label: 'Published', bg: '#16A34A' },
  pending: { label: 'Pending review', bg: '#D97706' },
  changes: { label: 'Objections', bg: '#DC2626' },
  draft: { label: 'Draft', bg: '#6B7280' },
};
// See the listings screens: data.hostStatus ('changes') is a legacy mirror
// that survives a resubmit, so trust the round's own objection list instead.
const openObjections = (l) => ((l && l.review && l.review.objections) || []).length;
const badgeFor = (l) => {
  if (l.isPublished) return { label: 'Published', bg: '#16A34A' };
  if (openObjections(l) > 0) return STATUS.changes;
  {
    // COPS passed round 1 → QCOPS on-site check. Green: this is progress.
    const stage = (l.review && l.review.stage) || null;
    if (['qc_assigned', 'qc_acknowledged', 'qc_onsite', 'qc_feedback'].includes(stage)) {
      return { label: 'Round 1 approved · QCOPS visit', bg: '#16A34A' };
    }
    if (stage === 'qc_passed') return { label: 'Quality check passed', bg: '#16A34A' };
  }
  if (l.status === 'changes') return STATUS.pending;
  return STATUS[l.status] || STATUS.draft;
};

/*
  A supplier's OWN listing detail — reachable from the "View" action on any
  listing, live or not. Uses the owner endpoint (/supplier/listings/:id), so
  it works for under-review listings too; the public DetailScreen only serves
  PUBLISHED experiences and 404s on anything still in the pipeline (that was
  the "not found" the app used to show).

  Mirrors the website's HostListingViewPage — same source, same sections.
*/
// `mode` picks supplier vs host identity/endpoint so one read-only detail
// screen serves both portals.
export default function SupplierListingDetailScreen({ id, listing: passed, mode = 'supplier' }) {
  const supplierAuth = useSupplierAuth();
  const userAuth = useAuth();
  const token = mode === 'host' ? userAuth.token : supplierAuth.token;
  const { push } = useNav();
  const [listing, setListing] = useState(passed || null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openPolicy, setOpenPolicy] = useState(null);
  const listingId = id || (passed && passed.id);

  useEffect(() => {
    let alive = true;
    if (!listingId) { setLoading(false); return undefined; }
    (mode === 'host' ? api.hostListing : api.supplierListing)(token, listingId)
      .then((d) => {
        if (!alive || !d) return;
        if (d.listing) {
          setListing(d.listing);
          // Opening this screen is what "seeing" the review activity means.
          markReviewSeen(listingId, d.listing);
        }
        if (d.form) setForm(d.form);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, listingId, mode]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Listing" />
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </View>
    );
  }
  if (!form && !listing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Listing" />
        <Text style={styles.empty}>Listing not found.</Text>
      </View>
    );
  }

  const f = form || {};
  const badge = badgeFor(listing || {});
  // Real, resolvable photos only — the gallery can carry empty strings/nulls
  // that otherwise render as blank grey tiles (or an empty "Photos" section).
  // Include the cover image and de-dupe so it isn't shown twice.
  const photos = [...new Set(
    [(listing && listing.image), ...(f.photos || [])]
      .map((p) => resolveImage(p))
      .filter(Boolean),
  )];
  const inclusions = (f.inclusions || []).map((x) => stripHtml(typeof x === 'string' ? x : (x.title || x.text || ''))).filter(Boolean);
  const facilities = (f.facilities || []).map((x) => (typeof x === 'string' ? x : x.name)).filter(Boolean);
  const nearby = (f.nearbyPlaces || []).filter((n) => n.name);
  const faqs = (f.faqs || []).filter((q) => q.question);
  const policies = [
    { key: 'terms', label: 'Terms & Conditions', text: stripHtml(f.termsConditions) },
    { key: 'privacy', label: 'Privacy Policy', text: stripHtml(f.privacyPolicy) },
    { key: 'refund', label: 'Refund & Cancellation Policy', text: stripHtml(f.refundCancellationPolicy) },
  ].filter((p) => p.text);
  const cover = photos[0] || null; // already resolved
  const price = f.adultPrice || (listing && listing.price);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Listing" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={[styles.cover, styles.coverPh]} />}

        <View style={styles.head}>
          <View style={[styles.statusPill, { backgroundColor: badge.bg }]}><Text style={styles.statusText}>{badge.label}</Text></View>
          <Text style={styles.title}>{f.name || (listing && listing.title)}</Text>
          <View style={styles.metaRow}>
            {(f.city || f.location) ? (
              <View style={styles.metaItem}><Image source={ICONS.locGray} style={styles.metaIcon} /><Text style={styles.metaText}>{[f.location, f.city].filter(Boolean).join(', ')}</Text></View>
            ) : null}
            {!!f.durationLabel && <View style={styles.metaItem}><Image source={ICONS.clock} style={styles.metaIcon} /><Text style={styles.metaText}>{f.durationLabel}</Text></View>}
          </View>
          <Text style={styles.price}>{formatMoney(price)}<Text style={styles.priceUnit}> / {(listing && listing.priceUnit) || 'person'}</Text></Text>

          {listing && listing.isPublished && (
            <TouchableOpacity style={styles.bookingsBtn} activeOpacity={0.85} onPress={() => push(mode === 'host' ? 'listingBookings' : 'supplierListingBookings', { listing })}>
              <Image source={ICONS.ticket} style={styles.bookingsIcon} />
              <Text style={styles.bookingsText}>See bookings</Text>
            </TouchableOpacity>
          )}

          {openObjections(listing) > 0 && (
            <TouchableOpacity style={styles.resolveBtn} activeOpacity={0.9} onPress={() => push('resolveObjections', { id: listingId, mode })}>
              <Image source={ICONS.edit} style={styles.resolveIcon} />
              <Text style={styles.resolveText}>Resolve objections</Text>
            </TouchableOpacity>
          )}
        </View>

        <ReviewHistory listing={listing} />

        <Section title="Basic details">
          <Row label="Name" value={f.name} />
          {!!(listing && listing.category) && <Row label="Category" value={listing.category} />}
          {!!f.location && <Row label="Location" value={f.location} />}
          {!!f.city && <Row label="City" value={f.city} />}
          {!!f.nearbyLocation && <Row label="Nearby" value={f.nearbyLocation} />}
          {!!f.mode && <Row label="Mode" value={f.mode[0].toUpperCase() + f.mode.slice(1)} />}
        </Section>

        {!!stripHtml(f.about) && (
          <Section title="About"><Text style={styles.para}>{stripHtml(f.about)}</Text></Section>
        )}

        {photos.length > 0 && (
          <Section title="Photos">
            <View style={styles.photoGrid}>
              {photos.map((p, i) => <Image key={i} source={{ uri: p }} style={styles.photo} />)}
            </View>
          </Section>
        )}

        {inclusions.length > 0 && (
          <Section title="What's included">
            {inclusions.map((inc, i) => (
              <View key={i} style={styles.bulletRow}><Image source={ICONS.check} style={styles.bulletIcon} /><Text style={styles.bulletText}>{inc}</Text></View>
            ))}
          </Section>
        )}

        {facilities.length > 0 && (
          <Section title="Facilities">
            <View style={styles.chipWrap}>
              {facilities.map((fac, i) => <View key={i} style={styles.chip}><Text style={styles.chipText}>{fac}</Text></View>)}
            </View>
          </Section>
        )}

        {/* Availability & slots deliberately omitted from this read-only view —
            a many-slot schedule turns into an unreadable wall of times here.
            The owner manages slots in the edit wizard instead. */}

        {nearby.length > 0 && (
          <Section title="Nearby places">
            {nearby.map((n, i) => {
              const dist = n.distance ?? n.distanceKm;
              const unit = n.unit === 'hr' ? 'hrs away' : n.unit === 'min' ? 'min away' : 'km';
              return <View key={i} style={styles.bulletRow}><Image source={ICONS.locGray} style={styles.bulletIcon} /><Text style={styles.bulletText}>{n.name}{dist != null && dist !== '' ? ` · ${dist} ${unit}` : ''}</Text></View>;
            })}
          </Section>
        )}

        {faqs.length > 0 && (
          <Section title="FAQs">
            {faqs.map((q, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <Text style={styles.faqQ}>{stripHtml(q.question)}</Text>
                {!!stripHtml(q.answer) && <Text style={styles.faqA}>{stripHtml(q.answer)}</Text>}
              </View>
            ))}
          </Section>
        )}

        {policies.length > 0 && (
          <Section title="Policies & terms">
            <View style={styles.policyCard}>
              {policies.map((p, i) => {
                const open = openPolicy === p.key;
                return (
                  <View key={p.key} style={[styles.policyRow, i === policies.length - 1 && { borderBottomWidth: 0 }]}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setOpenPolicy(open ? null : p.key)} style={styles.policyHead}>
                      <Text style={styles.policyTitle}>{p.label}</Text>
                      <View style={styles.policyToggle}><Text style={styles.policyToggleTxt}>{open ? '–' : '+'}</Text></View>
                    </TouchableOpacity>
                    {open && <Text style={styles.policyBody}>{p.text}</Text>}
                  </View>
                );
              })}
            </View>
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

const STAGE_LABEL = {
  submitted: 'Submitted — waiting for Center Ops',
  in_review: 'Center Ops content review',
  changes: 'Changes requested',
  resubmitted: 'Re-submitted — waiting for Center Ops',
  qc_assigned: 'Round 1 approved — QCOPS visit assigned',
  qc_acknowledged: 'QCOPS scheduled their visit',
  qc_onsite: 'QCOPS is on site',
  qc_feedback: 'QCOPS submitted their report',
  qc_passed: 'Quality check passed',
  under_progress: 'Changes requested after the on-site check',
  published: 'Live on the platform',
  rejected: 'Not approved',
  qc_rejected: 'Not approved after the on-site check',
  delisted: 'Delisted',
};

/*
  The full review trail for this listing — where it stands, how many sections
  Center Ops has approved, every objection raised and the whole back-and-forth
  on each. This is the "see the history" surface: the card only ever shows the
  current state, so everything that already happened lives here.
*/
function ReviewHistory({ listing }) {
  const r = (listing && listing.review) || null;
  if (!r) return null;
  const objections = r.objections || [];
  const thread = r.thread || {};
  const threadKeys = Object.keys(thread).filter((k) => (thread[k] || []).length);
  const total = r.total || 0;
  const stageLabel = STAGE_LABEL[r.stage] || (listing.isPublished ? 'Live on the platform' : 'In review');
  if (!total && !objections.length && !threadKeys.length) return null;

  return (
    <Section title="Review history">
      <View style={styles.histStage}><Text style={styles.histStageText}>{stageLabel}</Text></View>
      {r.round > 0 && <Text style={styles.histRound}>Review round {r.round}</Text>}

      {total > 0 && (
        <View style={styles.histCounts}>
          <Count value={r.approved || 0} label="Approved" tint="#16A34A" />
          <Count value={r.objection || 0} label="Objections" tint="#DC2626" />
          <Count value={r.pending || 0} label="Pending" tint={colors.inkMuted} />
        </View>
      )}

      {!!r.suggestion && (
        <View style={styles.histSuggest}>
          <Text style={styles.histSuggestText}>
            <Text style={styles.histSuggestLabel}>Center Ops suggestion: </Text>{r.suggestion}
          </Text>
        </View>
      )}

      {objections.map((o) => (
        <View key={o.key} style={styles.histObj}>
          <Text style={styles.histObjTitle}>{o.label}</Text>
          <Text style={styles.histObjText}>{o.objection}</Text>
        </View>
      ))}

      {threadKeys.map((k) => (
        <View key={k} style={styles.histThread}>
          <Text style={styles.histThreadHead}>{k.toUpperCase()}</Text>
          {(thread[k] || []).map((m, i) => (
            <View key={i} style={styles.histMsg}>
              <Text style={styles.histWho}>{m.by || m.role || (m.fromOwner ? 'You' : 'Center Ops')}</Text>
              <Text style={styles.histText}>{m.text || m.message || m.note || ''}</Text>
            </View>
          ))}
        </View>
      ))}
    </Section>
  );
}

const Count = ({ value, label, tint }) => (
  <View style={styles.countCell}>
    <Text style={[styles.countValue, { color: tint }]}>{value}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);
const Row = ({ label, value }) => (value ? (
  <View style={styles.kv}>
    <Text style={styles.kvLabel}>{label}</Text>
    <Text style={styles.kvValue}>{value}</Text>
  </View>
) : null);

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 60 },
  histStage: { alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  histStageText: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  histRound: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 6 },
  histCounts: { flexDirection: 'row', gap: 10, marginTop: 12 },
  countCell: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  countValue: { fontSize: font.h3, fontWeight: '900' },
  countLabel: { fontSize: 10, color: colors.inkMuted, marginTop: 2 },
  histSuggest: { backgroundColor: '#FFFBEB', borderRadius: radius.md, padding: 12, marginTop: 12 },
  histSuggestText: { fontSize: font.small, color: '#78350F', lineHeight: 19 },
  histSuggestLabel: { fontWeight: '900', color: '#B45309' },
  histObj: { backgroundColor: '#FEF2F2', borderRadius: radius.md, padding: 12, marginTop: 10 },
  histObjTitle: { fontSize: font.small, fontWeight: '900', color: '#991B1B' },
  histObjText: { fontSize: font.small, color: '#991B1B', marginTop: 4, lineHeight: 19 },
  histThread: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 10 },
  histThreadHead: { fontSize: 10, fontWeight: '900', color: colors.inkMuted, letterSpacing: 0.4, marginBottom: 8 },
  histMsg: { marginBottom: 8 },
  histWho: { fontSize: font.tiny, fontWeight: '900', color: colors.ink },
  histText: { fontSize: font.small, color: colors.inkMuted, marginTop: 2, lineHeight: 18 },
  cover: { width: '100%', height: 210, backgroundColor: '#DCE0E6' },
  coverPh: {},
  head: { backgroundColor: colors.surface, padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: 8 },
  statusText: { color: '#fff', fontWeight: '800', fontSize: font.tiny },
  title: { fontSize: font.h2, fontWeight: '900', color: colors.ink },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaIcon: { width: 13, height: 13, tintColor: colors.inkMuted },
  metaText: { fontSize: font.small, color: colors.inkMuted },
  price: { marginTop: 10, fontSize: font.h3, fontWeight: '900', color: colors.price },
  priceUnit: { fontSize: font.small, fontWeight: '600', color: colors.inkMuted },
  bookingsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.brand, height: 46, borderRadius: radius.md, marginTop: 14 },
  bookingsIcon: { width: 17, height: 17, tintColor: '#101010' },
  bookingsText: { fontWeight: '900', color: '#101010', fontSize: font.body },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#DC2626', height: 46, borderRadius: radius.md, marginTop: 12 },
  resolveIcon: { width: 17, height: 17, tintColor: '#fff' },
  resolveText: { fontWeight: '900', color: '#fff', fontSize: font.body },

  section: { backgroundColor: colors.surface, padding: space.lg, marginTop: 10 },
  sectionTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink, marginBottom: 10 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  kvLabel: { fontSize: font.small, color: colors.inkMuted },
  kvValue: { fontSize: font.small, color: colors.ink, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  para: { fontSize: font.body, color: colors.ink, lineHeight: 21 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: '31.5%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: '#DCE0E6' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 },
  bulletIcon: { width: 15, height: 15, tintColor: colors.brand, marginTop: 2 },
  bulletText: { flex: 1, fontSize: font.body, color: colors.ink, lineHeight: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: font.small, color: colors.ink },
  faqQ: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  faqA: { fontSize: font.small, color: colors.inkMuted, marginTop: 3, lineHeight: 19 },
  policyCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' },
  policyRow: { borderBottomWidth: 1, borderBottomColor: colors.border },
  policyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  policyTitle: { flex: 1, fontSize: font.body, fontWeight: '700', color: colors.ink, paddingRight: 10 },
  policyToggle: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  policyToggleTxt: { fontSize: 17, fontWeight: '900', color: colors.brandText, lineHeight: 19 },
  policyBody: { fontSize: font.small, color: colors.inkMuted, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 13, marginTop: -2 },
});
