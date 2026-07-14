import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Share, Linking, Clipboard, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../../theme';
import { api, resolveImage, DUMMY_IMAGE } from '../../api/client';
import { API_BASE } from '../../config';
import { formatMoney } from '../../utils/format';
import { DOW, MONTHS_FULL } from '../../utils/booking';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import { ICONS } from '../../icons';
import PaymentWebView from '../../components/PaymentWebView';

// Same payment-status bucket as PaymentDetailScreen — kept identical so the
// two screens never disagree about what "Completed"/"Failed"/"Pending" means
// for the same booking.
const paymentStatus = (b) => {
  if (b.status === 'refunded') return 'refunded';
  if (b.status === 'confirmed' || b.status === 'completed') return 'completed';
  if (b.status === 'pending_payment') return b.payment?.failedAt ? 'failed' : 'pending';
  return 'pending';
};

const STATUS_META = {
  completed: { band: '#009966', subtitle: 'Your booking is confirmed.' },
  failed: { band: '#F44336', subtitle: 'Payment failed — retry to confirm your booking.' },
  pending: { band: '#FFB900', subtitle: 'Payment pending — complete to confirm your booking.' },
  refunded: { band: '#64748B', subtitle: 'This booking was refunded.' },
};

const fmtFullDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  let h = d.getHours(); const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()} · ${h}:${mm} ${ap}`;
};
const fmtDateOnly = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
};

export default function BookingFullDetailScreen({ code }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { pop, push } = useNav();
  const [booking, setBooking] = useState(null);
  const [host, setHost] = useState(null);
  const [expMeta, setExpMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [payLink, setPayLink] = useState(null);
  const [showPayWeb, setShowPayWeb] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const d = await api.booking(token, code);
      setBooking(d.booking || null);
      const itemId = d.booking && d.booking.itemId;
      if (d.booking && d.booking.item?.type === 'experience' && itemId) {
        api.getExperience(itemId)
          .then((ed) => {
            setHost((ed && ed.item && ed.item.supplier) || null);
            setExpMeta(ed && ed.item ? { rating: ed.item.rating, reviewsCount: ed.item.reviewsCount } : null);
          })
          .catch(() => {});
      }
    } catch (e) {
      setError(e.message || 'Could not load booking');
    } finally {
      setLoading(false);
    }
  }, [token, code]);

  useEffect(() => { load(); }, [load]);

  const downloadVoucher = () => {
    const url = `${API_BASE}/bookings/me/${encodeURIComponent(code)}/voucher.pdf?token=${encodeURIComponent(token)}`;
    Linking.openURL(url).catch(() => Alert.alert('Voucher', 'Could not open the voucher. Please try again.'));
  };

  const onShare = () => {
    if (!booking) return;
    Share.share({
      message: `Booking ${booking.bookingCode} — ${booking.item?.name || 'your booking'} (${formatMoney(booking.pricing?.total, booking.currency)}).`,
    }).catch(() => {});
  };

  const copyCode = () => {
    if (!booking) return;
    Clipboard.setString(booking.bookingCode);
    Alert.alert('Copied', 'Booking code copied to clipboard.');
  };

  // Resume payment on an already-created pending booking — reuses/creates the
  // same Cashfree hosted link the original checkout would have (no need to
  // recreate the booking).
  const startPayAgain = async () => {
    if (!booking) return;
    setPaying(true);
    try {
      const res = await api.bookingLink(token, booking.bookingCode);
      if (res && res.linkUrl) { setPayLink(res.linkUrl); setShowPayWeb(true); }
      else Alert.alert('Payment', 'Could not start the payment. Please try again.');
    } catch (e) {
      Alert.alert('Payment', e.message || 'Could not start the payment.');
    } finally {
      setPaying(false);
    }
  };

  const onPayReturn = async () => {
    setShowPayWeb(false);
    try {
      const res = await api.bookingLinkStatus(token, booking.bookingCode);
      if (res && res.paid) load();
    } catch { /* ignore — user can still see the current status on reload */ }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : error || !booking ? (
        <View style={{ flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.inkMuted, textAlign: 'center' }}>{error || 'Booking not found'}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.brand, fontWeight: '800' }}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <BodyContent
          insets={insets}
          booking={booking}
          host={host}
          expMeta={expMeta}
          onBack={() => pop()}
          onCopy={copyCode}
          onShare={onShare}
          onVoucher={downloadVoucher}
          onModify={() => push('bookingDetail', { code: booking.bookingCode, startCancel: true })}
          onSupport={() => push('support', { queue: 'user' })}
          onPayAgain={startPayAgain}
          paying={paying}
        />
      )}

      <PaymentWebView visible={showPayWeb} url={payLink} onClose={onPayReturn} onReturn={onPayReturn} />
    </View>
  );
}

function BodyContent({ insets, booking, host, expMeta, onBack, onCopy, onShare, onVoucher, onModify, onSupport, onPayAgain, paying }) {
  const st = paymentStatus(booking);
  const meta = STATUS_META[st];
  const paid = st === 'completed' || st === 'refunded';
  const item = booking.item || {};
  const pricing = booking.pricing || {};
  const guest = booking.guest || {};
  const img = resolveImage(item.image || item.mainImage);
  const rating = expMeta && Number(expMeta.rating) > 0 ? expMeta.rating : null;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.band, { backgroundColor: meta.band, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} style={styles.bandBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.bandBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.bandTitle}>Booking Details</Text>
        <Text style={styles.bandSubtitle}>{meta.subtitle}</Text>
        <TouchableOpacity style={styles.refPill} onPress={onCopy} activeOpacity={0.85}>
          <Text style={styles.refLabel}>Ref</Text>
          <Text style={styles.refCode}>{booking.bookingCode}</Text>
          <Text style={styles.copyIcon}>⧉</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        {paid && <ActionBtn icon={ICONS.ticket} label="Voucher" onPress={onVoucher} />}
        <ActionBtn icon={ICONS.edit} label="Modify" onPress={onModify} />
        <ActionBtn icon={ICONS.navInbox} label="Support" onPress={onSupport} />
        <ActionBtn icon={ICONS.share} label="Share" onPress={onShare} />
      </View>

      <View style={styles.px}>
        {/* Item */}
        <View style={styles.card}>
          <View style={styles.itemRow}>
            <Image source={{ uri: img || DUMMY_IMAGE }} style={styles.itemImg} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemName} numberOfLines={2}>{item.name || 'Booking'}</Text>
              {!!(item.location || item.city) && (
                <View style={styles.locRow}>
                  <Image source={ICONS.locGray} style={styles.locIcon} />
                  <Text style={styles.locText} numberOfLines={1}>{item.location || item.city}</Text>
                </View>
              )}
              {!!rating && (
                <View style={styles.ratingRow}>
                  <Image source={ICONS.star} style={styles.starIcon} />
                  <Text style={styles.ratingText}>{Number(rating).toFixed(1)}{expMeta.reviewsCount ? ` (${expMeta.reviewsCount})` : ''}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Primary customer */}
        <SectionCard title="Primary Customer">
          <KV k="Name" v={guest.name} />
          <KV k="Mobile" v={guest.phone} />
          <KV k="Email" v={guest.email} last />
        </SectionCard>

        {/* Trip */}
        <SectionCard title="Your Trip">
          <KV k="Date & Time" v={booking.scheduledAt ? fmtFullDateTime(booking.scheduledAt) : fmtDateOnly(booking.scheduledFor)} />
          <KV k="Guests" v={String(guest.count || 1)} />
          <KV k="Duration" v={`${booking.units || 1} ${item.type === 'room' ? 'night(s)' : 'day(s)'}`} last />
        </SectionCard>

        {/* Meeting point — same location/image as the experience itself */}
        {!!(item.location || item.city) && (
          <SectionCard title="Meeting Point">
            <View style={styles.meetingRow}>
              <Image source={{ uri: img || DUMMY_IMAGE }} style={styles.meetingImg} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.meetingLoc}>{item.location || item.city}</Text>
              </View>
            </View>
          </SectionCard>
        )}

        {/* Host */}
        {!!host && (
          <SectionCard title="Your Host">
            <View style={styles.hostRow}>
              <Image source={{ uri: resolveImage(host.image) || DUMMY_IMAGE }} style={styles.hostAvatar} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.hostName}>{host.name}</Text>
                <Text style={styles.hostSub}>Your host for this experience</Text>
              </View>
              {!!host.phone && (
                <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${host.phone}`).catch(() => {})}>
                  <Text style={styles.callIcon}>📞</Text>
                </TouchableOpacity>
              )}
            </View>
          </SectionCard>
        )}

        {/* Payment summary */}
        <SectionCard title="Payment Summary">
          <Row k={`${formatMoney(pricing.unitPrice, booking.currency)} × ${guest.count || 1}`} v={formatMoney(pricing.subtotal, booking.currency)} />
          {pricing.gst > 0 && <Row k="GST" v={formatMoney(pricing.gst, booking.currency)} />}
          {pricing.tcs > 0 && <Row k="TCS" v={formatMoney(pricing.tcs, booking.currency)} />}
          {pricing.walletDiscount > 0 && <Row k="Wallet credit" v={`− ${formatMoney(pricing.walletDiscount, booking.currency)}`} green />}
          {pricing.couponDiscount > 0 && <Row k={`Coupon ${pricing.couponCode || ''}`.trim()} v={`− ${formatMoney(pricing.couponDiscount, booking.currency)}`} green />}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{paid ? 'Total paid' : 'Total payable'}</Text>
            <Text style={styles.totalVal}>{formatMoney(pricing.total, booking.currency)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.band + '1A' }]}>
            <Text style={[styles.statusBadgeText, { color: meta.band }]}>
              {st === 'completed' ? 'Payment successfully processed'
                : st === 'refunded' ? 'Payment refunded'
                  : st === 'failed' ? 'Payment failed'
                    : 'Payment pending'}
            </Text>
          </View>
        </SectionCard>
      </View>

      {/* Bottom CTA */}
      {paid ? (
        <TouchableOpacity style={styles.cta} activeOpacity={0.9} onPress={onVoucher}>
          <Image source={ICONS.ticket} style={styles.ctaIcon} />
          <Text style={styles.ctaText}>Download e-Voucher</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.cta, styles.ctaPay]} activeOpacity={0.9} onPress={onPayAgain} disabled={paying}>
          {paying ? <ActivityIndicator color="#101010" /> : (
            <>
              <Image source={ICONS.card} style={[styles.ctaIcon, { tintColor: '#101010' }]} />
              <Text style={[styles.ctaText, { color: '#101010' }]}>Complete Payment</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function ActionBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.actionCircle}><Image source={icon} style={styles.actionIcon} /></View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}
function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}
function KV({ k, v, last }) {
  return (
    <View style={[styles.kv, !last && styles.kvBorder]}>
      <Text style={styles.kvK}>{k}</Text>
      <Text style={styles.kvV} numberOfLines={1}>{v || '—'}</Text>
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

const styles = StyleSheet.create({
  band: { paddingBottom: 22, paddingHorizontal: space.lg, alignItems: 'center' },
  bandBack: { position: 'absolute', left: 8, top: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bandBackIcon: { fontSize: 28, color: '#fff', marginTop: -4 },
  bandTitle: { color: '#fff', fontSize: font.h2, fontWeight: '900', marginTop: 6 },
  bandSubtitle: { color: 'rgba(255,255,255,0.92)', fontSize: font.small, marginTop: 4, textAlign: 'center' },
  refPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, marginTop: 14 },
  refLabel: { color: 'rgba(255,255,255,0.85)', fontSize: font.tiny, fontWeight: '700' },
  refCode: { color: '#fff', fontSize: font.small, fontWeight: '900', letterSpacing: 0.5 },
  copyIcon: { color: '#fff', fontSize: 14 },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.surface, paddingVertical: 16, marginTop: -1, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { width: 20, height: 20, tintColor: colors.brandText },
  actionLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.inkMuted },

  px: { paddingHorizontal: space.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: 12, padding: 16, ...shadow.card },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  itemName: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locIcon: { width: 11, height: 11 },
  locText: { fontSize: font.tiny, color: colors.inkMuted, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  starIcon: { width: 12, height: 12, tintColor: '#FFB900' },
  ratingText: { fontSize: font.tiny, color: colors.inkMuted, fontWeight: '700' },

  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.inkMuted, letterSpacing: 0.6, marginBottom: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  kvBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  kvK: { fontSize: font.small, color: colors.inkMuted },
  kvV: { fontSize: font.small, color: '#1A1A2E', fontWeight: '700', flexShrink: 1, textAlign: 'right' },

  meetingRow: { flexDirection: 'row', alignItems: 'center' },
  meetingImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  meetingLoc: { fontSize: font.small, color: '#1A1A2E', fontWeight: '700' },

  hostRow: { flexDirection: 'row', alignItems: 'center' },
  hostAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt },
  hostName: { fontSize: font.body, fontWeight: '800', color: '#1A1A2E' },
  hostSub: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  callBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  callIcon: { fontSize: 16 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  priceK: { fontSize: font.small, color: colors.inkMuted, flex: 1 },
  priceV: { fontSize: font.small, color: '#1A1A2E', fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10 },
  totalLabel: { fontSize: font.body, fontWeight: '900', color: '#1A1A2E' },
  totalVal: { fontSize: font.body, fontWeight: '900', color: colors.brandDark },
  statusBadge: { borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  statusBadgeText: { fontSize: font.small, fontWeight: '800' },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#101010', borderRadius: radius.lg, marginHorizontal: space.lg, marginTop: 20, paddingVertical: 16 },
  ctaPay: { backgroundColor: colors.brand },
  ctaIcon: { width: 18, height: 18, tintColor: colors.brand },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: font.body },
});
