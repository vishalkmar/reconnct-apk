import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { colors, radius, font, space, shadow } from '../../theme';
import { api, resolveImage, DUMMY_IMAGE } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import { ICONS } from '../../icons';
import { PAYMENT_CHECK_SVG, PAYMENT_FAILED_SVG, PAYMENT_PENDING_SVG } from '../../components/paymentStatusIcons';

// Same PAYMENT status derivation as TransactionsScreen — kept identical so a
// row and the detail screen it opens never disagree. `status` on the booking
// itself never becomes "failed"/"refunded-only"; this is purely a display
// bucket for the payment side of the booking.
const paymentStatus = (b) => {
  if (b.status === 'refunded') return 'refunded';
  if (b.status === 'confirmed' || b.status === 'completed') return 'completed';
  if (b.status === 'pending_payment') return b.payment?.failedAt ? 'failed' : 'pending';
  return 'pending';
};

// `color` is the status LABEL's text colour (Figma dev-mode: #009966 for
// Completed) — deliberately a different, darker shade than the icon's own
// fill (#02BC7D on the check asset itself); the two are not the same colour.
const STATUS_META = {
  completed: {
    svg: PAYMENT_CHECK_SVG,
    label: 'Completed',
    color: '#009966',
    desc: "Payment should now reflect in the receiver's bank account.",
  },
  failed: {
    svg: PAYMENT_FAILED_SVG,
    label: 'Failed',
    color: '#F44336',
    desc: "Payment couldn't be completed.",
  },
  pending: {
    svg: PAYMENT_PENDING_SVG,
    label: 'Pending',
    color: colors.brandDark,
    desc: "We're waiting for Cashfree to confirm this payment.",
  },
  refunded: {
    svg: PAYMENT_CHECK_SVG,
    label: 'Refunded',
    color: '#E11D48',
    desc: 'This amount was refunded to your original payment method.',
  },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  let h = d.getHours(); const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${d.getDate()}${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} at ${h}:${mm} ${ap}`;
};
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']; const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function PaymentDetailScreen({ code }) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { pop, push } = useNav();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const d = await api.booking(token, code);
      setBooking(d.booking || null);
    } catch (e) {
      setError(e.message || 'Could not load payment details');
    } finally {
      setLoading(false);
    }
  }, [token, code]);

  useEffect(() => { load(); }, [load]);

  const onShare = () => {
    if (!booking) return;
    const st = STATUS_META[paymentStatus(booking)];
    Share.share({
      message: `${st.label} — ${formatMoney(booking.pricing?.total, booking.currency)} for ${booking.item?.name || 'your booking'} (${booking.bookingCode}).`,
    }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => pop()} style={styles.headerBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Details</Text>
        <TouchableOpacity onPress={onShare} style={styles.headerBtn}>
          <Image source={ICONS.share} style={styles.shareIcon} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      ) : error || !booking ? (
        <View style={{ padding: 30, alignItems: 'center' }}>
          <Text style={{ color: colors.inkMuted, textAlign: 'center' }}>{error || 'Payment not found'}</Text>
          <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.brand, fontWeight: '800' }}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PaymentDetailBody
          booking={booking}
          onSupport={() => push('support', { queue: 'user' })}
          onFullDetails={() => push('bookingFullDetail', { code: booking.bookingCode })}
        />
      )}
    </View>
  );
}

function PaymentDetailBody({ booking, onSupport, onFullDetails }) {
  const st = paymentStatus(booking);
  const meta = STATUS_META[st];
  const item = booking.item || {};
  const img = resolveImage(item.image || item.mainImage);
  const dateIso = st === 'failed' ? (booking.payment?.failedAt || booking.updatedAt)
    : st === 'refunded' ? (booking.refundedAt || booking.updatedAt)
      : st === 'completed' ? (booking.payment?.paidAt || booking.updatedAt)
        : booking.createdAt;
  const txnId = booking.payment?.paymentId || booking.payment?.orderId || booking.bookingCode;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.amount}>
          {formatMoney(booking.pricing?.total, booking.currency)}
        </Text>

        <View style={styles.statusBlock}>
          <SvgXml xml={meta.svg} width={52} height={52} />
          <View style={styles.statusText}>
            <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
            <Text style={styles.statusDesc}>{meta.desc}</Text>
            {!!dateIso && <Text style={styles.statusDate}>{fmtDateTime(dateIso)}</Text>}
          </View>
        </View>

        <TouchableOpacity style={styles.itemRow} activeOpacity={0.8} onPress={onFullDetails}>
          <Image source={{ uri: img || DUMMY_IMAGE }} style={styles.itemImg} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name || 'Booking'}</Text>
            {!!(item.location || item.city) && (
              <View style={styles.locRow}>
                <Image source={ICONS.locGray} style={styles.locIcon} />
                <Text style={styles.locText} numberOfLines={1}>{item.location || item.city}</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Transaction ID</Text>
        <Text style={styles.infoValue}>{txnId}</Text>
      </View>

      <TouchableOpacity style={styles.infoCard} activeOpacity={0.8} onPress={onSupport}>
        <Text style={styles.infoLabel}>Need Help?</Text>
        <Text style={styles.helpLink}>Contact Us Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingBottom: 10, paddingHorizontal: 8,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 30, color: colors.ink, marginTop: -4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: font.h2, fontWeight: '800', color: colors.ink },
  shareIcon: { width: 18, height: 18, tintColor: colors.ink },

  // Figma spec: Fill(358) x Hug(356), radius 16, padding top30/right20/
  // bottom30/left20, gap 40 between the amount / status / item blocks.
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingTop: 30, paddingRight: 20, paddingBottom: 30, paddingLeft: 20, ...shadow.card },
  // Bold 62px in Figma; every reference render (Completed AND Failed alike)
  // shows this amount muted-gray + struck-through — the icon/label below is
  // what actually conveys success vs failure, this is just "the amount that
  // was charged/attempted".
  amount: { fontSize: 44, fontWeight: '700', color: '#888899', textAlign: 'center', textDecorationLine: 'line-through' },

  // Figma "Frame 78" spec: icon top-aligned with the label line (not
  // centered against the whole 3-line block); text column Width Fill(248),
  // Height Hug(64), Gap 5 between label/description/date.
  statusBlock: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 40 },
  statusText: { flex: 1, marginLeft: 14 },
  statusLabel: { fontSize: font.body, fontWeight: '900' },
  statusDesc: { fontSize: font.small, color: colors.inkMuted, marginTop: 5, lineHeight: 18 },
  statusDate: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 5 },

  // Text sits at the TOP of the row (image is taller than the 2-line name +
  // location), not vertically centered against the image.
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  itemChevron: { fontSize: 22, color: colors.inkFaint, marginLeft: 6, alignSelf: 'center' },
  // Figma spec: image 120 x 90, radius 14.
  itemImg: { width: 120, height: 90, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  // Roboto Medium (weight 500), bumped to 16px per feedback.
  itemName: { fontSize: 16, fontWeight: '500', color: '#1A1A2E' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locIcon: { width: 11, height: 11 },
  locText: { fontSize: font.tiny, color: colors.inkMuted, flex: 1 },

  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginTop: 12, ...shadow.card },
  infoLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: font.body, fontWeight: '700', color: '#1A1A2E', marginTop: 4, fontFamily: 'monospace' },
  helpLink: { fontSize: font.body, fontWeight: '800', color: colors.brand, marginTop: 4 },
});
