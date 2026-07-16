import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { api, resolveImage, DUMMY_IMAGE } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useSupplierAuth } from '../../store/SupplierAuthContext';
import ScreenHeader from '../../components/ScreenHeader';

const PILL = {
  upcoming: { label: 'Upcoming', bg: colors.brandSoft, fg: colors.brandDark },
  completed: { label: 'Completed', bg: '#DCFCE7', fg: '#166534' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', fg: '#DC2626' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  let h = d.getHours(); const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${h}:${mm} ${ap}`;
};

// Read-only booking detail for a HOST viewing one booking on their own
// listing — who booked, when, and the base amount (no GST/convenience fee,
// which are platform-side, not the host's payout).
export default function SupplierBookingDetailScreen({ id }) {
  const { token } = useSupplierAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.supplierBooking(token, id)
      .then((d) => { if (alive) setBooking(d.booking || null); })
      .catch((e) => { if (alive) setError(e.message || 'Could not load booking'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, id]);

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
        <Text style={{ textAlign: 'center', marginTop: 30, color: colors.inkMuted }}>{error || 'Booking not found'}</Text>
      </View>
    );
  }

  const pill = PILL[booking.status] || PILL.upcoming;
  const img = resolveImage(booking.item && booking.item.image);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Booking" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.ribbon}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ribbonLabel}>BOOKING</Text>
            <Text style={styles.ribbonCode}>{booking.bookingCode}</Text>
            <View style={[styles.badge, { backgroundColor: pill.bg }]}><Text style={[styles.badgeText, { color: pill.fg }]}>{pill.label}</Text></View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ribbonLabel}>BASE AMOUNT</Text>
            <Text style={styles.ribbonTotal}>{formatMoney(booking.baseAmount, booking.currency)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.itemRow}>
            <Image source={{ uri: img || DUMMY_IMAGE }} style={styles.itemImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{booking.item && booking.item.name}</Text>
              {!!(booking.item && (booking.item.city || booking.item.location)) && (
                <Text style={styles.itemLoc}>{booking.item.city || booking.item.location}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.grid}>
            <GridCell label="When" value={fmtDate(booking.scheduledFor)} />
            <GridCell label="Guests" value={String(booking.guest.count || 1)} />
            <GridCell label="Units" value={String(booking.units || 1)} />
            <GridCell label="Paid at" value={booking.paidAt ? fmtDateTime(booking.paidAt) : '—'} />
          </View>
          {!!booking.specialRequests && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.sectionTitle}>SPECIAL REQUESTS</Text>
              <Text style={styles.reqText}>{booking.specialRequests}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>WHO BOOKED</Text>
          <KV k="Name" v={booking.guest.name} />
          <KV k="Email" v={booking.guest.email} />
          <KV k="Phone" v={booking.guest.phone} last />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PAYMENT</Text>
          <KV k="Payment reference" v={booking.paymentId || '—'} mono />
          <KV k="Method" v={booking.paymentMethod || '—'} last />
          <View style={styles.baseNote}>
            <Text style={styles.baseNoteText}>Base amount excludes GST and the platform convenience fee — this is your payout basis, not the guest's total.</Text>
          </View>
        </View>
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

const styles = StyleSheet.create({
  ribbon: { flexDirection: 'row', backgroundColor: colors.brand, margin: space.lg, marginBottom: 8, borderRadius: radius.lg, padding: 18, gap: 12 },
  ribbonLabel: { color: 'rgba(16,16,16,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  ribbonCode: { color: '#101010', fontSize: 20, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
  ribbonTotal: { color: '#101010', fontSize: 22, fontWeight: '900', marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginTop: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: space.lg, marginTop: 12, padding: 16, ...shadow.card },
  itemRow: { flexDirection: 'row', gap: 12 },
  itemImg: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: '#DCE0E6' },
  itemName: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  itemLoc: { fontSize: font.small, color: colors.inkMuted, marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: '50%', paddingVertical: 8 },
  gridLabel: { fontSize: 10, color: colors.inkMuted, fontWeight: '700', letterSpacing: 0.4 },
  gridValue: { fontSize: font.body, color: colors.ink, fontWeight: '700', marginTop: 3 },

  sectionTitle: { fontSize: 11, fontWeight: '900', color: colors.inkMuted, letterSpacing: 0.6, marginBottom: 6 },
  reqText: { fontSize: font.small, color: colors.ink, lineHeight: 19 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  kvBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  kvK: { fontSize: font.small, color: colors.inkMuted },
  kvV: { fontSize: font.small, color: colors.ink, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: font.tiny },

  baseNote: { marginTop: 10, backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: 10 },
  baseNoteText: { fontSize: font.tiny, color: colors.brandText, lineHeight: 16 },
});
