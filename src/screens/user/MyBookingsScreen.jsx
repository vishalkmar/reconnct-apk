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
  ongoing: { label: 'Ongoing', bg: '#DCFCE7', fg: '#16A34A' },
  completed: { label: 'Completed', bg: '#16A34A', fg: '#fff' },
  cancelled: { label: 'Cancelled', bg: '#DC2626', fg: '#fff' },
  // Only ever visible under the "All" tab (pending_payment has no tab of its
  // own here — see categorize() below).
  pending: { label: 'Payment pending', bg: '#FFB900', fg: '#101010' },
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const DEFAULT_DURATION_MIN = 120; // 2h floor when an experience has no duration

// A booking is Upcoming until it STARTS, Ongoing while it's actually running,
// and Completed only once it has ENDED — the exact rule the backend uses
// (utils/bookingLifecycle), so this list, the review popup and the web portal
// never disagree. End = scheduledEndAt if set, else start + duration; the old
// code compared against the START, so a 10–11am slot wrongly read as completed
// at 10:00. Cancelled/refunded are always Cancelled regardless of date.
//
// pending_payment never lands in a dated tab — that's the Transactions tab's
// job now. It still shows under "All".
const IST_OFFSET_MIN = 5 * 60 + 30;
// The booked slot's end from "Preferred time: 1:57 PM – 2:00 PM" — the truest
// completion moment, matching the backend (utils/bookingLifecycle). Combines
// the end time with the booking date (IST) into a real UTC instant.
function slotEnd(b) {
  const m = String(b.specialRequests || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const ymd = String(b.scheduledFor || b.scheduledAt || b.date || '').slice(0, 10);
  const [y, mo, d] = ymd.split('-').map(Number);
  if (!y || !mo || !d) return null;
  let hh = parseInt(m[4], 10) % 12;
  if (/PM/i.test(m[6])) hh += 12;
  return Date.UTC(y, mo - 1, d, hh, parseInt(m[5], 10) || 0) - IST_OFFSET_MIN * 60000;
}
function bookingEnd(b) {
  if (b.scheduledEndAt) return new Date(b.scheduledEndAt).getTime();
  const se = slotEnd(b);
  if (se) return se;
  const startIso = b.scheduledAt || b.scheduledFor || b.date;
  if (!startIso) return null;
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return null;
  const mins = Number(b.item?.durationMinutes) || DEFAULT_DURATION_MIN;
  return start + mins * 60000;
}
function categorize(b) {
  if (!b) return 'upcoming';
  if (b.status === 'cancelled' || b.status === 'refunded') return 'cancelled';
  if (b.status === 'completed') return 'completed';
  if (b.status === 'pending_payment') return 'pending';
  const startIso = b.scheduledAt || b.scheduledFor || b.date;
  const start = startIso ? new Date(startIso).getTime() : null;
  const now = Date.now();
  if (start && now < start) return 'upcoming';
  const end = bookingEnd(b);
  if (end && now < end) return 'ongoing';
  if (end) return 'completed';
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

export default function MyBookingsScreen({ reviewCode }) {
  const { token } = useAuth();
  const { bookings: localBookings, hideBooking, isHidden } = useBookings();
  const { navigateTab, push } = useNav();
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [rateBooking, setRateBooking] = useState(null);
  const [autoRated, setAutoRated] = useState(false);
  const [, setTick] = useState(0); // ticks so upcoming→ongoing→completed flips live

  useEffect(() => {
    let alive = true;
    api.myBookings(token)
      .then((d) => { if (alive) setFetched(d.bookings || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  // Category is a clock event (start/end passing), not a server event — so
  // re-render every 30s to move a booking through its lifecycle without a
  // manual refresh.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Arrived from the post-experience push — open that booking's rating sheet
  // as soon as the list has loaded. Once only, so closing it doesn't reopen.
  useEffect(() => {
    if (!reviewCode || autoRated || loading) return;
    const match = fetched.find((b) => b.bookingCode === reviewCode);
    if (match) { setRateBooking(match); setAutoRated(true); }
  }, [reviewCode, autoRated, loading, fetched]);

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
              onOpen={(bk) => push('bookingFullDetail', { code: bk.bookingCode })}
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
        booking={rateBooking ? {
          bookingCode: rateBooking.bookingCode,
          itemName: (rateBooking.item || {}).name || (rateBooking.item || {}).title,
          itemImage: (rateBooking.item || {}).image || (rateBooking.item || {}).mainImage,
          itemLocation: (rateBooking.item || {}).location || (rateBooking.item || {}).city,
          scheduledFor: rateBooking.scheduledAt || rateBooking.scheduledFor,
        } : null}
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
