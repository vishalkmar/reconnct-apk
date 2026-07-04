import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { api, resolveImage, DUMMY_IMAGE } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import { ICONS } from '../../icons';
import ScreenHeader from '../../components/ScreenHeader';

const TYPE_LABEL = {
  package: 'Retreat', room: 'Hotel Room', event: 'Event',
  addon: 'Add-on Activity', experience: 'Experience', event_activity: 'Activity',
};
const STATUS_BADGE = {
  pending_payment: { label: 'Pending payment', bg: '#FEF3C7', fg: '#92400E' },
  confirmed: { label: 'Confirmed', bg: '#DCFCE7', fg: '#166534' },
  completed: { label: 'Completed', bg: '#DBEAFE', fg: '#1D4ED8' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', fg: '#B91C1C' },
  refunded: { label: 'Refunded', bg: '#E5E7EB', fg: '#374151' },
};
const REFUND_BADGE = {
  none: { label: 'No refund', bg: '#F1F5F9', fg: '#475569' },
  pending: { label: 'Refund pending', bg: '#FEF3C7', fg: '#92400E' },
  processing: { label: 'Refund processing', bg: '#DBEAFE', fg: '#1E40AF' },
  completed: { label: 'Refund completed', bg: '#DCFCE7', fg: '#166534' },
  failed: { label: 'Refund failed', bg: '#FEE2E2', fg: '#B91C1C' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}, ${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
};
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  let h = d.getHours(); const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${h}:${mm} ${ap}`;
};

const isPast = (b) => {
  const endIso = b.scheduledEndAt || b.scheduledFor;
  if (!endIso) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(endIso) < today;
};

export default function BookingDetailScreen({ code, startCancel }) {
  const { token } = useAuth();
  const { pop } = useNav();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel flow: null | 'reason' | 'confirm' | 'done'
  const [cancelStep, setCancelStep] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const d = await api.booking(token, code);
      setBooking(d.booking || null);
    } catch (e) {
      setError(e.message || 'Could not load booking');
    } finally {
      setLoading(false);
    }
  }, [token, code]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (startCancel && booking && !cancelStep) setCancelStep('reason'); /* eslint-disable-next-line */ }, [startCancel, booking]);

  const REASONS = (quote && quote.reasons) || [
    { code: 'plan_change', label: 'My plan has changed' },
    { code: 'found_better', label: 'Found a better option' },
    { code: 'price_high', label: 'The price feels too high' },
    { code: 'payment_issue', label: 'I had a payment issue' },
    { code: 'emergency', label: 'Personal emergency / illness' },
    { code: 'travel_restrict', label: 'Travel restrictions / weather' },
    { code: 'wrong_dates', label: 'Wrong dates booked by mistake' },
    { code: 'other', label: 'Other (please specify)' },
  ];

  const proceedToConfirm = async () => {
    if (!reasonCode) return Alert.alert('Pick a reason', 'Please choose why you are cancelling.');
    if (reasonCode === 'other' && !reasonText.trim()) return Alert.alert('Add a reason', 'Please tell us a bit about your reason.');
    setQuoteLoading(true);
    try {
      const q = await api.cancelQuote(token, code);
      setQuote(q);
      setCancelStep('confirm');
    } catch (e) {
      Alert.alert('Refund quote', e.message || 'Could not load refund quote');
    } finally {
      setQuoteLoading(false);
    }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      const res = await api.cancelBooking(token, code, { reasonCode, reason: reasonText.trim() || undefined });
      setCancelResult(res);
      if (res.booking) setBooking(res.booking);
      setCancelStep('done');
    } catch (e) {
      Alert.alert('Cancellation', e.message || 'Could not cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Booking" />
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </View>
    );
  }
  if (error || !booking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Booking" />
        <View style={{ padding: 30, alignItems: 'center' }}>
          <Text style={{ color: colors.inkMuted, textAlign: 'center' }}>{error || 'Booking not found'}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 12 }}><Text style={{ color: colors.brand, fontWeight: '800' }}>Tap to retry</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const item = booking.item || {};
  const pricing = booking.pricing || {};
  const pay = booking.payment || {};
  const guest = booking.guest || {};
  const status = booking.status;
  const badge = STATUS_BADGE[status] || { label: status, bg: '#F1F5F9', fg: '#475569' };
  const img = resolveImage(item.image || item.mainImage);
  const canCancel = (status === 'pending_payment' || status === 'confirmed') && !isPast(booking);
  const payLabel = pay.paidAt ? 'Paid' : status === 'cancelled' ? 'Cancelled' : 'Pending';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Booking voucher" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header ribbon */}
        <View style={styles.ribbon}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ribbonLabel}>BOOKING VOUCHER</Text>
            <Text style={styles.ribbonCode}>{booking.bookingCode}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}><Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text></View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ribbonLabel}>{status === 'pending_payment' ? 'AMOUNT DUE' : 'TOTAL'}</Text>
            <Text style={styles.ribbonTotal}>{formatMoney(pricing.total, booking.currency)}</Text>
            {!!pay.paidAt && <Text style={styles.ribbonPaidAt}>{fmtDateTime(pay.paidAt)}</Text>}
          </View>
        </View>

        {/* Item snapshot */}
        <View style={styles.card}>
          <View style={styles.itemRow}>
            <Image source={{ uri: img || DUMMY_IMAGE }} style={styles.itemImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemType}>{(TYPE_LABEL[item.type] || 'Booking').toUpperCase()}</Text>
              <Text style={styles.itemName}>{item.name || 'Experience'}</Text>
              {!!(item.location || item.city) && (
                <View style={styles.locRow}>
                  <Image source={ICONS.locGray} style={styles.locIcon} />
                  <Text style={styles.locText} numberOfLines={1}>{item.location || item.city}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Details grid */}
        <View style={styles.card}>
          <View style={styles.grid}>
            <GridCell label="When" value={booking.scheduledFor ? (booking.scheduledEndAt ? `${fmtDate(booking.scheduledFor)} → ${fmtDate(booking.scheduledEndAt)}` : fmtDate(booking.scheduledFor)) : '—'} />
            <GridCell label="Guests" value={String(guest.count || 1)} />
            <GridCell label={item.type === 'room' ? 'Nights' : 'Duration'} value={String(booking.units || 1)} />
            <GridCell label="Payment" value={payLabel} />
          </View>
        </View>

        {/* Lead traveller */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>LEAD TRAVELLER</Text>
          <KV k="Name" v={guest.name} />
          <KV k="Email" v={guest.email} />
          <KV k="Phone" v={guest.phone} last />
          {!!booking.specialRequests && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>SPECIAL REQUESTS</Text>
              <Text style={styles.reqText}>{booking.specialRequests}</Text>
            </>
          )}
        </View>

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PAYMENT</Text>
          <KV k="Order id" v={pay.orderId || '—'} mono />
          <KV k="Payment id" v={pay.paymentId || '—'} mono />
          <KV k="Method" v={pay.method || '—'} />
          <KV k="Paid at" v={pay.paidAt ? fmtDateTime(pay.paidAt) : '—'} last />
        </View>

        {/* Price breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PRICE BREAKDOWN</Text>
          <Row k={`${formatMoney(pricing.unitPrice, booking.currency)} × ${booking.units || guest.count || 1}`} v={formatMoney(pricing.subtotal, booking.currency)} />
          {pricing.gst > 0 && <Row k="GST" v={formatMoney(pricing.gst, booking.currency)} />}
          {pricing.tcs > 0 && <Row k="TCS" v={formatMoney(pricing.tcs, booking.currency)} />}
          {pricing.walletDiscount > 0 && <Row k="Wallet credit" v={`− ${formatMoney(pricing.walletDiscount, booking.currency)}`} green />}
          {pricing.couponDiscount > 0 && <Row k={`Coupon ${pricing.couponCode || ''}`.trim()} v={`− ${formatMoney(pricing.couponDiscount, booking.currency)}`} green />}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{status === 'pending_payment' ? 'Total payable' : 'Total paid'}</Text>
            <Text style={styles.totalVal}>{formatMoney(pricing.total, booking.currency)}</Text>
          </View>
        </View>

        {/* Cancelled banner */}
        {(status === 'cancelled' || status === 'refunded') && booking.cancelledAt && (
          <View style={styles.cancelBanner}>
            <Text style={styles.cancelBannerTitle}>Booking cancelled on {fmtDateTime(booking.cancelledAt)}</Text>
            {booking.refundStatus && booking.refundStatus !== 'none' && (
              <View style={[styles.badge, { backgroundColor: (REFUND_BADGE[booking.refundStatus] || {}).bg || '#F1F5F9', alignSelf: 'flex-start', marginTop: 6 }]}>
                <Text style={[styles.badgeText, { color: (REFUND_BADGE[booking.refundStatus] || {}).fg || '#475569' }]}>{(REFUND_BADGE[booking.refundStatus] || {}).label || booking.refundStatus}</Text>
              </View>
            )}
            {!!booking.cancellationReason && <Text style={styles.cancelBannerText}>Reason: {booking.cancellationReason}</Text>}
            {booking.refundAmount > 0 && <Text style={styles.cancelBannerText}>Refund: {formatMoney(booking.refundAmount, booking.currency)}{booking.refundStatus === 'processing' ? ' · usually 5–7 business days' : ''}</Text>}
          </View>
        )}

        {/* Cancel action */}
        {canCancel && !cancelStep && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setCancelStep('reason')} activeOpacity={0.9}>
            <Text style={styles.cancelBtnText}>Cancel booking</Text>
          </TouchableOpacity>
        )}

        {/* ── Cancel flow ── */}
        {cancelStep && (
          <View style={styles.card}>
            <View style={styles.stepRow}>
              <StepPill n={1} label="Why?" active={cancelStep === 'reason'} done={cancelStep !== 'reason'} />
              <View style={styles.stepLine} />
              <StepPill n={2} label="Refund" active={cancelStep === 'confirm'} done={cancelStep === 'done'} />
              <View style={styles.stepLine} />
              <StepPill n={3} label="Done" active={cancelStep === 'done'} done={false} />
            </View>

            {cancelStep === 'reason' && (
              <>
                <Text style={styles.cancelQ}>Why are you cancelling?</Text>
                {REASONS.map((opt) => {
                  const on = reasonCode === opt.code;
                  return (
                    <TouchableOpacity key={opt.code} style={[styles.reasonRow, on && styles.reasonRowOn]} onPress={() => setReasonCode(opt.code)} activeOpacity={0.8}>
                      <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                      <Text style={styles.reasonLabel}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
                {!!reasonCode && (
                  <TextInput
                    style={styles.reasonInput}
                    placeholder={reasonCode === 'other' ? 'Tell us more (required)' : 'Add any extra context (optional)'}
                    placeholderTextColor={colors.inkFaint}
                    value={reasonText}
                    onChangeText={setReasonText}
                    multiline
                    maxLength={250}
                  />
                )}
                <View style={styles.flowBtns}>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => setCancelStep(null)}><Text style={styles.ghostBtnText}>Keep booking</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, (!reasonCode || quoteLoading) && { opacity: 0.5 }]} disabled={!reasonCode || quoteLoading} onPress={proceedToConfirm}>
                    {quoteLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>See refund details</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {cancelStep === 'confirm' && quote && (
              <RefundPreview quote={quote} currency={booking.currency} cancelling={cancelling}
                onBack={() => setCancelStep('reason')} onConfirm={confirmCancel} />
            )}

            {cancelStep === 'done' && cancelResult && (
              <CancelResult result={cancelResult} currency={booking.currency} onClose={() => pop()} />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function GridCell({ label, value }) {
  return (
    <View style={styles.gridCell}>
      <Text style={styles.gridLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.gridValue}>{value || '—'}</Text>
    </View>
  );
}
function KV({ k, v, mono, last }) {
  return (
    <View style={[styles.kv, !last && styles.kvBorder]}>
      <Text style={styles.kvK}>{k}</Text>
      <Text style={[styles.kvV, mono && styles.mono]} numberOfLines={1}>{v || '—'}</Text>
    </View>
  );
}
function Row({ k, v, green }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceK}>{k}</Text>
      <Text style={[styles.priceV, green && { color: colors.success }]}>{v}</Text>
    </View>
  );
}
function StepPill({ n, label, active, done }) {
  return (
    <View style={[styles.stepPill, active ? styles.stepPillActive : done ? styles.stepPillDone : styles.stepPillIdle]}>
      <Text style={[styles.stepPillText, (active || done) && { color: active ? '#fff' : '#166534' }]}>{done ? '✓' : n} {label}</Text>
    </View>
  );
}

function RefundPreview({ quote, currency, cancelling, onBack, onConfirm }) {
  const refund = quote.refund || {};
  const pct = refund.refundPercent || 0;
  const tone = pct >= 100 ? '#16A34A' : pct > 0 ? '#D97706' : '#DC2626';
  return (
    <>
      <View style={[styles.refundHead, { borderColor: tone + '55', backgroundColor: tone + '11' }]}>
        <Text style={styles.refundHeadLabel}>YOU'LL GET BACK</Text>
        <Text style={[styles.refundAmount, { color: colors.ink }]}>{formatMoney(refund.refundAmount, currency)}
          <Text style={styles.refundPct}>  ({pct}% of {formatMoney(quote.totalPaid, currency)})</Text>
        </Text>
        {!!(refund.tier && refund.tier.label) && <Text style={styles.refundTier}>{refund.tier.label}</Text>}
      </View>

      <View style={styles.refundTable}>
        <Row k="Total paid" v={formatMoney(quote.totalPaid, currency)} />
        {refund.hoursToCheckIn != null && <Row k="Hours until start" v={`${refund.hoursToCheckIn}h`} />}
        <Row k="Refund tier" v={`${pct}% refund`} />
        {refund.nonRefundableAmount > 0 && <Row k="Non-refundable" v={formatMoney(refund.nonRefundableAmount, currency)} />}
        {quote.walletPortion > 0 && <Row k="Wallet portion (instant)" v={formatMoney(quote.walletPortion, currency)} green />}
      </View>

      {quote.policy && quote.policy.isRefundable === false && (
        <Text style={styles.policyNote}>This item is marked non-refundable by the host — no money will be returned.</Text>
      )}
      {!!refund.processingNote && pct > 0 && (
        <Text style={[styles.policyNote, { color: '#1E40AF', backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' }]}>{refund.processingNote}</Text>
      )}

      <View style={styles.flowBtns}>
        <TouchableOpacity style={styles.ghostBtn} disabled={cancelling} onPress={onBack}><Text style={styles.ghostBtnText}>Back</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.dangerBtn, cancelling && { opacity: 0.6 }]} disabled={cancelling} onPress={onConfirm}>
          {cancelling ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.dangerBtnText}>Cancel & refund {formatMoney(refund.refundAmount, currency)}</Text>}
        </TouchableOpacity>
      </View>
    </>
  );
}

function CancelResult({ result, currency, onClose }) {
  const refund = result.refund || {};
  const exec = refund.result || {};
  const pct = refund.refundPercent || 0;
  const failed = exec.refundStatus === 'failed';
  const none = exec.refundStatus === 'none' || pct === 0;
  const tone = failed ? '#DC2626' : none ? '#475569' : '#16A34A';
  return (
    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
      <View style={[styles.resultIcon, { backgroundColor: tone + '22' }]}><Text style={{ color: tone, fontSize: 26, fontWeight: '900' }}>{failed ? '!' : none ? 'i' : '✓'}</Text></View>
      <Text style={styles.resultTitle}>{failed ? 'Refund could not be initiated' : none ? 'Booking cancelled' : 'Refund on the way'}</Text>
      <Text style={styles.resultSub}>
        {failed ? 'Our team has been notified and will follow up by email shortly.'
          : none ? 'No refund applies under the current policy. You will receive a confirmation email.'
            : `${formatMoney(refund.refundAmount, currency)} is being processed back to your original payment method. Allow 5–7 business days.`}
      </Text>
      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16, alignSelf: 'stretch' }]} onPress={onClose}>
        <Text style={styles.primaryBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: { flexDirection: 'row', backgroundColor: colors.brand, margin: space.lg, marginBottom: 8, borderRadius: radius.lg, padding: 18, gap: 12 },
  ribbonLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  ribbonCode: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
  ribbonTotal: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 2 },
  ribbonPaidAt: { color: 'rgba(255,255,255,0.85)', fontSize: 10, marginTop: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginTop: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: space.lg, marginTop: 12, padding: 16, ...shadow.card },
  itemRow: { flexDirection: 'row', gap: 12 },
  itemImg: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: '#DCE0E6' },
  itemType: { fontSize: 10, fontWeight: '900', color: colors.brandText, letterSpacing: 0.5 },
  itemName: { fontSize: font.h3, fontWeight: '900', color: colors.ink, marginTop: 3 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  locIcon: { width: 12, height: 12 },
  locText: { fontSize: font.small, color: colors.inkMuted, flex: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: '50%', paddingVertical: 8 },
  gridLabel: { fontSize: 10, color: colors.inkMuted, fontWeight: '700', letterSpacing: 0.4 },
  gridValue: { fontSize: font.body, color: colors.ink, fontWeight: '700', marginTop: 3 },

  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.inkMuted, letterSpacing: 0.6, marginBottom: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  kvBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  kvK: { fontSize: font.small, color: colors.inkMuted },
  kvV: { fontSize: font.small, color: colors.ink, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: font.tiny },
  reqText: { fontSize: font.small, color: colors.ink, lineHeight: 19 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  priceK: { fontSize: font.small, color: colors.inkMuted, flex: 1 },
  priceV: { fontSize: font.small, color: colors.ink, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10 },
  totalLabel: { fontSize: font.body, fontWeight: '900', color: colors.ink },
  totalVal: { fontSize: font.body, fontWeight: '900', color: colors.brand },

  cancelBanner: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radius.lg, marginHorizontal: space.lg, marginTop: 12, padding: 14 },
  cancelBannerTitle: { fontSize: font.small, fontWeight: '900', color: '#B91C1C' },
  cancelBannerText: { fontSize: font.small, color: '#991B1B', marginTop: 4 },

  cancelBtn: { marginHorizontal: space.lg, marginTop: 14, borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { color: '#DC2626', fontWeight: '900', fontSize: font.body },

  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepLine: { flex: 1, height: 1, backgroundColor: colors.border, marginHorizontal: 4 },
  stepPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  stepPillActive: { backgroundColor: colors.brand },
  stepPillDone: { backgroundColor: '#DCFCE7' },
  stepPillIdle: { backgroundColor: colors.chipBg },
  stepPillText: { fontSize: 11, fontWeight: '800', color: colors.inkMuted },

  cancelQ: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  reasonRowOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  reasonLabel: { fontSize: font.body, color: colors.ink, flex: 1 },
  reasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, minHeight: 70, textAlignVertical: 'top', color: colors.ink, fontSize: font.small, marginTop: 4 },

  flowBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  ghostBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: colors.ink, fontWeight: '800', fontSize: font.small },
  primaryBtn: { flex: 1.4, backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: font.small },
  dangerBtn: { flex: 1.6, backgroundColor: '#DC2626', borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  dangerBtnText: { color: '#fff', fontWeight: '800', fontSize: font.small },

  refundHead: { borderWidth: 1, borderRadius: radius.md, padding: 14, marginBottom: 12 },
  refundHeadLabel: { fontSize: 10, fontWeight: '900', color: colors.inkMuted, letterSpacing: 0.6 },
  refundAmount: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  refundPct: { fontSize: font.small, fontWeight: '700', color: colors.inkMuted },
  refundTier: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 3 },
  refundTable: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12 },
  policyNote: { fontSize: font.tiny, color: '#991B1B', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: radius.md, padding: 10, marginTop: 10, lineHeight: 16 },

  resultIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  resultTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  resultSub: { fontSize: font.small, color: colors.inkMuted, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 10 },
});
