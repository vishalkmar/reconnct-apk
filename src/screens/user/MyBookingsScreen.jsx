import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, ImageBackground, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Svg, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, radius, font, space, shadow } from '../../theme';
import { api, resolveImage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import { useBookings } from '../../store/BookingsContext';
import { useNav } from '../../navigation/NavContext';
import { ICONS } from '../../icons';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import RatingModal from '../../components/RatingModal';

// category → the pill shown on the card image (top-right).
const PILL = {
  upcoming: { label: 'Upcoming', bg: colors.brand, fg: '#101010' },
  completed: { label: 'Completed', bg: '#16A34A', fg: '#fff' },
  cancelled: { label: 'Cancelled', bg: '#DC2626', fg: '#fff' },
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// A booking is Upcoming until its date passes. Once the date has passed, it's
// Completed only if a payment actually went through for it; explicitly
// cancelled/refunded bookings are always Cancelled regardless of date.
function categorize(b) {
  if (!b) return 'upcoming';
  if (b.status === 'cancelled' || b.status === 'refunded') return 'cancelled';
  if (b.status === 'completed') return 'completed';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endIso = b.scheduledEndAt || b.scheduledFor || b.date;
  const end = endIso ? new Date(endIso) : null;
  if (end && end < today) {
    const paid = !!(b.payment && b.payment.paidAt) || b.status === 'confirmed';
    if (paid) return 'completed';
  }
  return 'upcoming';
}
const inGroup = (b, key) => key === 'all' || categorize(b) === key;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function prettyDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 10);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function MyBookingsScreen() {
  const { token } = useAuth();
  const { bookings: localBookings, hideBooking, isHidden } = useBookings();
  const { navigateTab, push } = useNav();
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [rateBooking, setRateBooking] = useState(null);

  useEffect(() => {
    let alive = true;
    api.myBookings(token)
      .then((d) => { if (alive) setFetched(d.bookings || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  // In-app confirmed bookings first, then any server bookings — minus any the
  // user has deleted (cancelled bookings only) from their visible list.
  const items = [...localBookings, ...fetched].filter((b) => !isHidden(b.bookingCode));
  const counts = TABS.reduce((acc, t) => { acc[t.key] = items.filter((b) => inGroup(b, t.key)).length; return acc; }, {});
  const shown = items.filter((b) => inGroup(b, tab));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="My Bookings" />
      <Text style={styles.sub}>Track your upcoming trips, completed visits and cancellations — all in one place.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.8}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.badge, active && styles.badgeActive]}><Text style={[styles.badgeText, active && styles.badgeTextActive]}>{counts[t.key] || 0}</Text></View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(b) => String(b.id || b.bookingCode)}
          contentContainerStyle={{ padding: space.lg, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <BookingCard
              b={item}
              onOpen={(bk) => push('bookingDetail', { code: bk.bookingCode })}
              onCancel={(bk) => push('bookingDetail', { code: bk.bookingCode, startCancel: true })}
              onRate={(bk) => setRateBooking(bk)}
              onDelete={(bk) => Alert.alert(
                'Remove booking',
                'This will remove it from your bookings list on this device.',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => hideBooking(bk.bookingCode) }],
              )}
            />
          )}
          ListEmptyComponent={
            <EmptyState emoji="🎟️" title="No bookings yet"
              sub="Your booked experiences will appear here."
              cta="Explore experiences" onCta={() => navigateTab('experiences')} />
          }
        />
      )}
      <RatingModal
        visible={!!rateBooking}
        variant="manual"
        booking={rateBooking ? { bookingCode: rateBooking.bookingCode, itemName: (rateBooking.item || {}).name || (rateBooking.item || {}).title, itemImage: (rateBooking.item || {}).image || (rateBooking.item || {}).mainImage } : null}
        onClose={() => setRateBooking(null)}
        onSubmitted={() => {
          setFetched((list) => list.map((b) => (b.bookingCode === rateBooking.bookingCode ? { ...b, review: { rating: 1 } } : b)));
        }}
      />
    </View>
  );
}

function BookingCard({ b, onOpen, onCancel, onRate, onDelete }) {
  const snap = b.item || {};
  const img = resolveImage(snap.image || snap.mainImage);
  const category = categorize(b);
  const pill = PILL[category];
  const city = snap.city || (snap.location && snap.location.city) || snap.location || '';
  const date = prettyDate(b.scheduledFor || b.date);
  const guests = b.guests || (b.guest && b.guest.count) || (b.pricing && b.pricing.guests) || 1;
  const total = b.pricing && b.pricing.total;

  return (
    <View style={styles.card}>
      <ImageBackground
        source={img ? { uri: img } : undefined}
        style={styles.hero}
        imageStyle={styles.heroImg}
      >
        {!img && <View style={[styles.heroImg, styles.heroPh]} />}
        <Svg style={styles.heroShade} width="100%" height="100%">
          <Defs>
            <LinearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#080C18" stopOpacity="0" />
              <Stop offset="1" stopColor="#080C18" stopOpacity="0.65" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroFade)" />
        </Svg>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.fg }]}>{pill.label}</Text>
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.heroTitle} numberOfLines={1}>{snap.name || snap.title || 'Experience'}</Text>
          {!!city && (
            <View style={styles.heroLocRow}>
              <Image source={ICONS.locWhite} style={styles.heroLocIcon} />
              <Text style={styles.heroLoc} numberOfLines={1}>{city}</Text>
            </View>
          )}
        </View>
      </ImageBackground>

      <View style={styles.foot}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Image source={ICONS.calendar} style={styles.metaIcon} />
            <Text style={styles.metaText}>{date || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Image source={ICONS.people} style={styles.metaIcon} />
            <Text style={styles.metaText}>{guests} {guests === 1 ? 'guest' : 'guests'}</Text>
          </View>
          {!!total && <Text style={styles.price}>{formatMoney(total, b.currency)}</Text>}
        </View>
        {!!b.bookingCode && <Text style={styles.code}>{`#${b.bookingCode}`}</Text>}

        <View style={styles.btnRow}>
          {category === 'upcoming' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              activeOpacity={0.85}
              disabled={!b.bookingCode}
              onPress={() => onCancel && onCancel(b)}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {category === 'cancelled' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              activeOpacity={0.85}
              onPress={() => onDelete && onDelete(b)}
            >
              <Image source={ICONS.trash} style={[styles.btnIcon, { tintColor: '#D4183D' }]} />
              <Text style={[styles.btnGhostText, { color: '#D4183D' }]}>Delete</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            activeOpacity={0.9}
            onPress={() => onOpen && onOpen(b)}
          >
            <Image source={ICONS.ticket} style={styles.btnIcon} />
            <Text style={styles.btnPrimaryText}>View Ticket</Text>
          </TouchableOpacity>
          {category === 'completed' && !b.review && (
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              activeOpacity={0.85}
              onPress={() => onRate && onRate(b)}
            >
              <Text style={styles.btnGhostText}>Rate Experience</Text>
            </TouchableOpacity>
          )}
          {category === 'completed' && !!b.review && (
            <View style={[styles.btn, styles.btnRated]}>
              <Text style={styles.btnRatedText}>{'★'.repeat(b.review.rating || 0)} Rated</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkMuted, fontSize: font.small, paddingHorizontal: space.lg, paddingTop: 12 },
  // flexGrow:0 stops the horizontal tab strip from stretching to fill the
  // column's vertical space (which pushed the list down, leaving a top gap).
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabs: { paddingHorizontal: space.lg, paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#fff' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: font.tiny, fontWeight: '800', color: colors.inkMuted },
  badgeTextActive: { color: '#fff' },

  // Card
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 16, overflow: 'hidden', ...shadow.card },
  hero: { height: 150, justifyContent: 'flex-end' },
  heroImg: { resizeMode: 'cover' },
  heroPh: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#DCE0E6' },
  heroShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  pill: { position: 'absolute', top: 12, right: 12, height: 24, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 11, fontWeight: '900' },
  heroBody: { padding: 14 },
  heroTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  heroLocIcon: { width: 11, height: 11, marginRight: 4, opacity: 0.92 },
  heroLoc: { color: 'rgba(255,255,255,0.92)', fontSize: 12, flex: 1 },

  // Footer
  foot: { padding: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  metaIcon: { width: 15, height: 15, marginRight: 6, tintColor: colors.inkMuted },
  metaText: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  price: { marginLeft: 'auto', fontSize: 16, fontWeight: '900', color: colors.brandDark },
  code: { fontSize: 12, color: colors.inkFaint, marginTop: 8, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  btn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  btnGhostText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  btnRated: { backgroundColor: colors.brandSoft, flex: 1 },
  btnRatedText: { color: colors.brandText, fontWeight: '800', fontSize: 13, textAlign: 'center' },
  btnPrimary: { backgroundColor: colors.brand },
  btnPrimaryText: { color: '#101010', fontWeight: '900', fontSize: 14 },
  btnIcon: { width: 16, height: 16, marginRight: 7, tintColor: '#101010' },
});
