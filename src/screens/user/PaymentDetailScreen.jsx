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

const STATUS_META = {
  completed: {
    svg: PAYMENT_CHECK_SVG,
    label: 'Completed',
    color: '#02BC7D',
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
        <PaymentDetailBody booking={booking} onSupport={() => push('support', { queue: 'user' })} />
      )}
    </View>
  );
}

function PaymentDetailBody({ booking, onSupport }) {
  const st = paymentStatus(booking);
  const meta = STATUS_META[st];
  const item = booking.item || {};
  const img = resolveImage(item.image || item.mainImage);
  const failed = st === 'failed';
  const dateIso = st === 'failed' ? (booking.payment?.failedAt || booking.updatedAt)
    : st === 'refunded' ? (booking.refundedAt || booking.updatedAt)
      : st === 'completed' ? (booking.payment?.paidAt || booking.updatedAt)
        : booking.createdAt;
  const txnId = booking.payment?.paymentId || booking.payment?.orderId || booking.bookingCode;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={[styles.amount, failed && styles.amountStrike]}>
          {formatMoney(booking.pricing?.total, booking.currency)}
        </Text>

        <View style={styles.statusBlock}>
          <SvgXml xml={meta.svg} width={44} height={44} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
            <Text style={styles.statusDesc}>{meta.desc}</Text>
            {!!dateIso && <Text style={styles.statusDate}>{fmtDateTime(dateIso)}</Text>}
          </View>
        </View>

        <View style={styles.itemRow}>
          <Image source={{ uri: img || DUMMY_IMAGE }} style={styles.itemImg} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name || 'Booking'}</Text>
            {!!(item.location || item.city) && (
              <View style={styles.locRow}>
                <Image source={ICONS.locGray} style={styles.locIcon} />
                <Text style={styles.locText} numberOfLines={1}>{item.location || item.city}</Text>
              </View>
            )}
          </View>
        </View>
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

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, paddingVertical: 26, ...shadow.card },
  amount: { fontSize: 34, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  amountStrike: { textDecorationLine: 'line-through', color: colors.inkMuted },

  statusBlock: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 24 },
  statusLabel: { fontSize: font.body, fontWeight: '900' },
  statusDesc: { fontSize: font.small, color: colors.inkMuted, marginTop: 3, lineHeight: 18 },
  statusDate: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 6 },

  itemRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
  itemImg: { width: 64, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  itemName: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locIcon: { width: 11, height: 11 },
  locText: { fontSize: font.tiny, color: colors.inkMuted, flex: 1 },

  infoCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginTop: 12, ...shadow.card },
  infoLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: font.body, fontWeight: '700', color: colors.ink, marginTop: 4, fontFamily: 'monospace' },
  helpLink: { fontSize: font.body, fontWeight: '800', color: colors.brandDark, marginTop: 4 },
});
