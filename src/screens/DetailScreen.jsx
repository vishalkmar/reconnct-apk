import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../theme';
import { api, resolveImage, DUMMY_IMAGE } from '../api/client';
import { formatMoney, initials } from '../utils/format';
import { useNav } from '../navigation/NavContext';
import { useWishlist } from '../store/WishlistContext';

const { width: SCREEN_W } = Dimensions.get('window');
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Only the dates that are actually bookable: within the schedule's date range
// AND on an allowed weekday. Months with no availability never appear.
function buildAvailableDates(schedule, max = 45) {
  const allowed = (schedule.availableDays || []).map((d) => d.slice(0, 3));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = schedule.startDate ? new Date(schedule.startDate) : today;
  const end = schedule.endDate ? new Date(schedule.endDate) : new Date(today.getTime() + 90 * 86400000);
  const from = start > today ? start : today;
  const out = [];
  const d = new Date(from);
  while (d <= end && out.length < max) {
    const dow = DOW[d.getDay()];
    if (allowed.length === 0 || allowed.includes(dow)) {
      out.push({ key: d.toISOString().slice(0, 10), dow, day: d.getDate(), month: d.toLocaleString('en-US', { month: 'short' }) });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function priceBreakdown(item, adults, children) {
  const adultPrice = item.fromPrice || 0;
  const band = (item.childBands || []).find((b) => b.charge && b.price > 0);
  const childPrice = band ? band.price : 0;
  const subtotal = adults * adultPrice + children * childPrice;

  const disc = item.discount || null;
  let discountAmt = 0;
  if (disc && subtotal > 0) {
    discountAmt = disc.type === 'percentage' ? (subtotal * Number(disc.value)) / 100 : Number(disc.value) || 0;
  }
  const net = Math.max(0, subtotal - discountAmt);
  const gstAmt = (net * (item.gstRate || 0)) / 100;
  const afterGst = net + gstAmt;

  const cf = item.convenienceFee || null;
  let convAmt = 0;
  if (cf && cf.type !== 'free') {
    convAmt = cf.type === 'percentage' ? (afterGst * Number(cf.value)) / 100 : Number(cf.value) || 0;
  }
  const total = afterGst + convAmt;
  return { adultPrice, childPrice, subtotal, discountAmt, gstAmt, convAmt, total, childBand: band };
}

export default function DetailScreen({ idOrSlug }) {
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  const { isWished, toggle } = useWishlist();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [dateKey, setDateKey] = useState(null);
  const [slot, setSlot] = useState(null);
  const [monthSel, setMonthSel] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getExperience(idOrSlug)
      .then((d) => { if (alive) { setItem(d.item); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [idOrSlug]);

  if (loading) return <View style={styles.fill}><ActivityIndicator color={colors.brand} /></View>;
  if (error || !item) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>{error || 'Not found'}</Text>
        <TouchableOpacity onPress={pop}><Text style={styles.retry}>Go back</Text></TouchableOpacity>
      </View>
    );
  }

  const images = [item.mainImage, ...(item.gallery || [])].map(resolveImage).filter(Boolean);
  if (!images.length) images.push(DUMMY_IMAGE);
  const inclusions = (item.inclusions || []).map((x) => (typeof x === 'string' ? x : (x.title || x.text || ''))).filter(Boolean);
  const reviews = item.reviews || [];
  const faqs = item.faqs || [];
  const schedule = item.schedule || {};
  const dates = buildAvailableDates(schedule);
  const slots = schedule.timeSlots || [];
  const months = [...new Set(dates.map((d) => d.month))];
  const wished = isWished('experience', item.id);
  const b = priceBreakdown(item, adults, children);

  const book = () => {
    if (!dateKey) return Alert.alert('Select a date', 'Please choose an available date to continue.');
    if (slots.length && !slot) return Alert.alert('Select a time', 'Please choose a time slot.');
    Alert.alert(
      'Booking summary',
      `${item.name}\n\nDate: ${dateKey}${slot ? `  ·  ${slot}` : ''}\nGuests: ${adults} adult${adults > 1 ? 's' : ''}${children ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}\n\nTotal: ${formatMoney(b.total, item.currency)}\n\n(Payment via Cashfree comes in the next phase.)`,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gallery */}
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}>
            {images.map((uri, i) => <Image key={i} source={{ uri }} style={styles.hero} resizeMode="cover" />)}
          </ScrollView>
          <View style={[styles.topBar, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.circleBtn} onPress={pop}><Text style={styles.circleIcon}>‹</Text></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={styles.circleBtn}><Text style={styles.circleIcon}>↗</Text></View>
              <TouchableOpacity style={styles.circleBtn} onPress={() => toggle('experience', item.id, { ...item, type: 'experience' })}>
                <Text style={[styles.circleIcon, wished && { color: colors.heart }]}>{wished ? '♥' : '♡'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {images.length > 1 && (
            <View style={styles.dots}>{images.map((_, i) => <View key={i} style={[styles.dotSm, i === page && styles.dotSmActive]} />)}</View>
          )}
        </View>

        <View style={styles.body}>
          {!!(item.category && item.category.name) && <Text style={styles.cat}>{item.category.name}</Text>}
          <Text style={styles.title}>{item.name}</Text>
          {!!(item.city || item.location) && <Text style={styles.loc}>📍 {[item.location, item.city].filter(Boolean).join(', ')}</Text>}
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}><Text style={styles.star}>★ </Text>{Number(item.rating).toFixed(1)}{item.reviewsCount ? ` (${item.reviewsCount})` : ''}</Text>
            {!!item.durationLabel && <Text style={styles.metaDot}>·</Text>}
            {!!item.durationLabel && <Text style={styles.metaItem}>⏱ {item.durationLabel}</Text>}
            {!!item.capacity && <Text style={styles.metaDot}>·</Text>}
            {!!item.capacity && <Text style={styles.metaItem}>👥 Up to {item.capacity}</Text>}
          </View>

          {/* Host */}
          {!!item.supplier && (
            <View style={styles.host}>
              {resolveImage(item.supplier.image)
                ? <Image source={{ uri: resolveImage(item.supplier.image) }} style={styles.avatar} />
                : <View style={[styles.avatar, styles.avatarText]}><Text style={styles.avatarInit}>{initials(item.supplier.name)}</Text></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.hostLabel}>Hosted by</Text>
                <Text style={styles.hostName}>{item.supplier.name}</Text>
              </View>
              <View style={styles.verified}><Text style={styles.verifiedText}>✓ Verified</Text></View>
            </View>
          )}

          {!!item.about && (<><Text style={styles.section}>About this experience</Text><Text style={styles.para}>{item.about}</Text></>)}

          {/* ── Availability: pick month → date → time slot ── */}
          <Text style={styles.section}>Check availability</Text>
          {dates.length === 0 ? (
            <Text style={styles.hint}>No open dates right now — please check back soon.</Text>
          ) : (() => {
            const activeMonth = monthSel || months[0];
            const monthDates = dates.filter((d) => d.month === activeMonth);
            return (
              <>
                <Text style={styles.hint}>Pick a month, date{slots.length ? ' and time' : ''} that suits you.</Text>
                {months.length > 1 && (
                  <View style={styles.monthRow}>
                    {months.map((m) => (
                      <TouchableOpacity key={m} onPress={() => { setMonthSel(m); setDateKey(null); setSlot(null); }}
                        style={[styles.monthChip, activeMonth === m && styles.monthChipActive]}>
                        <Text style={[styles.monthText, activeMonth === m && styles.monthTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                  {monthDates.map((d) => {
                    const active = dateKey === d.key;
                    return (
                      <TouchableOpacity key={d.key} onPress={() => { setDateKey(d.key); setSlot(null); }}
                        style={[styles.dateCell, active && styles.dateCellActive]}>
                        <Text style={[styles.dateDow, active && styles.dateActiveText]}>{d.dow}</Text>
                        <Text style={[styles.dateNum, active && styles.dateActiveText]}>{d.day}</Text>
                        <Text style={[styles.dateMon, active && styles.dateActiveText]}>{d.month}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {dateKey && slots.length > 0 && (
                  <>
                    <Text style={styles.slotsLabel}>Available time slots</Text>
                    <View style={styles.slotRow}>
                      {slots.map((t) => (
                        <TouchableOpacity key={t} onPress={() => setSlot(t)} style={[styles.slotChip, slot === t && styles.slotChipActive]}>
                          <Text style={[styles.slotText, slot === t && styles.slotTextActive]}>⏰ {t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            );
          })()}
          {!!schedule.notice && <Text style={styles.notice}>ℹ️ {schedule.notice}</Text>}

          {/* ── Guests + live price ── */}
          <Text style={styles.section}>Guests & price</Text>
          <View style={styles.guestCard}>
            <Stepper label="Adults" sub={formatMoney(b.adultPrice, item.currency) + ' each'} value={adults} setValue={setAdults} min={1} />
            {b.childBand && (
              <Stepper label={`Children (${b.childBand.startAge}–${b.childBand.endAge} yrs)`} sub={formatMoney(b.childPrice, item.currency) + ' each'} value={children} setValue={setChildren} min={0} />
            )}
          </View>

          <View style={styles.breakdown}>
            <Row label={`Subtotal (${adults + children} guest${adults + children > 1 ? 's' : ''})`} value={formatMoney(b.subtotal, item.currency)} />
            {b.discountAmt > 0 && <Row label={`Discount${item.discount && item.discount.type === 'percentage' ? ` (${item.discount.value}%)` : ''}`} value={'− ' + formatMoney(b.discountAmt, item.currency)} green />}
            {b.gstAmt > 0 && <Row label={`GST (${item.gstRate}%)`} value={'+ ' + formatMoney(b.gstAmt, item.currency)} />}
            {b.convAmt > 0 && <Row label={`Convenience fee${item.convenienceFee && item.convenienceFee.type === 'percentage' ? ` (${item.convenienceFee.value}%)` : ''}`} value={'+ ' + formatMoney(b.convAmt, item.currency)} />}
            <View style={styles.divider} />
            <Row label="Total payable" value={formatMoney(b.total, item.currency)} bold />
          </View>

          {/* Included */}
          {inclusions.length > 0 && (<>
            <Text style={styles.section}>What’s included</Text>
            <View style={styles.incGrid}>
              {inclusions.map((inc, i) => (<View key={i} style={styles.incItem}><Text style={styles.incCheck}>✓</Text><Text style={styles.incText}>{inc}</Text></View>))}
            </View>
          </>)}

          {/* FAQs */}
          {faqs.length > 0 && (<>
            <Text style={styles.section}>FAQs</Text>
            {faqs.map((f, i) => (<View key={i} style={styles.faq}><Text style={styles.faqQ}>{f.question}</Text>{!!f.answer && <Text style={styles.faqA}>{f.answer}</Text>}</View>))}
          </>)}

          {/* Reviews */}
          {reviews.length > 0 && (<>
            <Text style={styles.section}>Reviews</Text>
            {reviews.map((r, i) => (
              <View key={i} style={styles.review}>
                <View style={styles.reviewHead}>
                  <View style={[styles.avatar, styles.avatarText, { width: 36, height: 36 }]}><Text style={styles.avatarInit}>{initials(r.name || 'U')}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{r.name || 'Guest'}</Text>
                    <Text style={styles.stars}>{'★'.repeat(Math.round(r.rating || 5))}</Text>
                  </View>
                  {!!r.date && <Text style={styles.reviewDate}>{r.date}</Text>}
                </View>
                {!!(r.text || r.comment) && <Text style={styles.reviewText}>{r.text || r.comment}</Text>}
              </View>
            ))}
          </>)}
        </View>
      </ScrollView>

      {/* Sticky book bar with the LIVE total */}
      <View style={[styles.bookBar, { paddingBottom: insets.bottom + 10 }]}>
        <View>
          <Text style={styles.fromLabel}>{adults + children} guest{adults + children > 1 ? 's' : ''}{dateKey ? ` · ${dateKey.slice(5)}` : ''}</Text>
          <Text style={styles.fromPrice}>{formatMoney(b.total, item.currency)}</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} activeOpacity={0.9} onPress={book}><Text style={styles.bookText}>Book Now</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Stepper({ label, sub, value, setValue, min = 0, max = 30 }) {
  return (
    <View style={styles.stepperRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepperLabel}>{label}</Text>
        {!!sub && <Text style={styles.stepperSub}>{sub}</Text>}
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => setValue(Math.max(min, value - 1))}><Text style={styles.stepSign}>−</Text></TouchableOpacity>
        <Text style={styles.stepVal}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => setValue(Math.min(max, value + 1))}><Text style={styles.stepSign}>＋</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value, bold, green }) {
  return (
    <View style={styles.brRow}>
      <Text style={[styles.brLabel, bold && styles.brBold]}>{label}</Text>
      <Text style={[styles.brVal, bold && styles.brBold, green && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.inkMuted }, retry: { color: colors.brand, fontWeight: '700' },
  hero: { width: SCREEN_W, height: 300, backgroundColor: '#DCE0E6' },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  circleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  circleIcon: { fontSize: 20, color: colors.ink, marginTop: -2 },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dotSm: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotSmActive: { backgroundColor: '#fff', width: 18 },
  body: { padding: space.xl, marginTop: -18, backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  cat: { color: colors.brand, fontWeight: '800', fontSize: font.small, textTransform: 'uppercase' },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.ink, marginTop: 6 },
  loc: { color: colors.inkMuted, marginTop: 6, fontSize: font.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  metaItem: { fontSize: font.small, color: colors.ink, fontWeight: '600' },
  metaDot: { color: colors.inkFaint }, star: { color: colors.star },
  host: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 18 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontWeight: '800' },
  hostLabel: { fontSize: font.tiny, color: colors.inkMuted }, hostName: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  verified: { backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  verifiedText: { color: colors.brandText, fontWeight: '700', fontSize: font.tiny },
  section: { fontSize: font.h3, fontWeight: '800', color: colors.ink, marginTop: 22, marginBottom: 8 },
  hint: { fontSize: font.small, color: colors.inkMuted, marginBottom: 4 },
  para: { fontSize: font.body, color: colors.inkMuted, lineHeight: 21 },

  dateCell: { width: 58, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface },
  dateCellActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  dateCellOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt },
  dateDow: { fontSize: font.tiny, color: colors.inkMuted, fontWeight: '700' },
  dateNum: { fontSize: font.h2, color: colors.ink, fontWeight: '800', marginVertical: 2 },
  dateMon: { fontSize: font.tiny, color: colors.inkMuted },
  dateActiveText: { color: '#fff' }, dateOffText: { color: colors.inkFaint },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 4 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  monthChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  monthText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  monthTextActive: { color: '#fff' },
  slotsLabel: { fontSize: font.small, fontWeight: '700', color: colors.ink, marginTop: 12 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  slotChip: { borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill },
  slotChipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  slotText: { color: colors.ink, fontWeight: '600', fontSize: font.small },
  slotTextActive: { color: colors.brandText },
  notice: { fontSize: font.small, color: colors.inkMuted, marginTop: 10 },

  guestCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  stepperLabel: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  stepperSub: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 18, color: colors.ink, fontWeight: '800' },
  stepVal: { fontSize: font.h3, fontWeight: '800', color: colors.ink, minWidth: 22, textAlign: 'center' },

  breakdown: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginTop: 12 },
  brRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  brLabel: { fontSize: font.body, color: colors.inkMuted },
  brVal: { fontSize: font.body, color: colors.ink, fontWeight: '600' },
  brBold: { fontWeight: '900', color: colors.ink, fontSize: font.h3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  incGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  incItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingRight: 8 },
  incCheck: { color: colors.success, fontWeight: '900' }, incText: { fontSize: font.small, color: colors.ink, flex: 1 },
  faq: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  faqQ: { fontSize: font.body, fontWeight: '700', color: colors.ink }, faqA: { fontSize: font.small, color: colors.inkMuted, marginTop: 4, lineHeight: 19 },
  review: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginBottom: 10 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewName: { fontWeight: '700', color: colors.ink, fontSize: font.small },
  stars: { color: colors.star, fontSize: font.tiny, marginTop: 1 }, reviewDate: { color: colors.inkFaint, fontSize: font.tiny },
  reviewText: { color: colors.inkMuted, fontSize: font.small, marginTop: 8, lineHeight: 19 },
  bookBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, paddingHorizontal: space.xl, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, ...shadow.card },
  fromLabel: { fontSize: font.tiny, color: colors.inkMuted },
  fromPrice: { fontSize: font.h2, fontWeight: '900', color: colors.price },
  bookBtn: { backgroundColor: colors.brand, paddingHorizontal: 40, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bookText: { color: '#fff', fontWeight: '800', fontSize: font.h3 },
});
