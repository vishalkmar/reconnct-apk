import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../theme';
import { api, resolveImage, DUMMY_IMAGE } from '../api/client';
import { formatMoney, initials } from '../utils/format';
import { useNav } from '../navigation/NavContext';
import { useWishlist } from '../store/WishlistContext';
import { shareExperience } from '../utils/share';
import { ICONS } from '../icons';

const { width: SCREEN_W } = Dimensions.get('window');

// Some admin-entered content has stray HTML / pasted markup — clean it so the
// detail page stays tidy regardless of what was saved.
const stripHtml = (s) => String(s || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&amp;|&#39;|&quot;/g, (m) => ({ '&nbsp;': ' ', '&amp;': '&', '&#39;': "'", '&quot;': '"' }[m]))
  .replace(/\s+/g, ' ')
  .trim();

export default function DetailScreen({ idOrSlug }) {
  const insets = useSafeAreaInsets();
  const { pop, requireAuth, requireAuthAction } = useNav();
  const { isWished, toggle } = useWishlist();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

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
  // Keep inclusions short & clean — long pasted paragraphs aren't real
  // "included" items, so drop anything that's clearly a block of prose.
  const inclusions = (item.inclusions || [])
    .map((x) => stripHtml(typeof x === 'string' ? x : (x.title || x.text || '')))
    .filter((t) => t && t.length <= 60);
  const reviews = item.reviews || [];
  const faqs = item.faqs || [];
  const wished = isWished('experience', item.id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Gallery */}
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}>
            {images.map((uri, i) => <Image key={i} source={{ uri }} style={styles.hero} resizeMode="cover" />)}
          </ScrollView>
          <View style={[styles.topBar, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.circleBtn} onPress={pop}><Text style={styles.backIcon}>‹</Text></TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.circleBtn} onPress={() => shareExperience(item)}><Image source={ICONS.share} style={styles.circleImg} /></TouchableOpacity>
              <TouchableOpacity style={styles.circleBtn} onPress={() => requireAuthAction(() => toggle('experience', item.id, { ...item, type: 'experience' }))}>
                <Image source={wished ? ICONS.heartFill : ICONS.heart} style={[styles.circleImg, wished && { tintColor: colors.heart }]} />
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
          {!!(item.city || item.location) && (
            <View style={styles.locRow}>
              <Image source={ICONS.locGray} style={styles.locIcon} />
              <Text style={styles.loc}>{[item.location, item.city].filter(Boolean).join(', ')}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><Text style={styles.star}>★ </Text><Text style={styles.metaText}>{Number(item.rating).toFixed(1)}{item.reviewsCount ? ` (${item.reviewsCount})` : ''}</Text></View>
            {!!item.durationLabel && <View style={styles.metaItem}><Image source={ICONS.clock} style={styles.metaIcon} /><Text style={styles.metaText}>{item.durationLabel}</Text></View>}
            {!!item.capacity && <View style={styles.metaItem}><Image source={ICONS.people} style={styles.metaIcon} /><Text style={styles.metaText}>Up to {item.capacity}</Text></View>}
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

          {/* Included */}
          {inclusions.length > 0 && (<>
            <Text style={styles.section}>What’s included</Text>
            <View style={styles.incGrid}>
              {inclusions.map((inc, i) => (
                <View key={i} style={styles.incItem}>
                  <Image source={ICONS.check} style={styles.incCheck} />
                  <Text style={styles.incText} numberOfLines={2}>{inc}</Text>
                </View>
              ))}
            </View>
          </>)}

          {/* FAQs */}
          {faqs.length > 0 && (<>
            <Text style={styles.section}>FAQs</Text>
            {faqs.map((f, i) => { const q = stripHtml(f.question); const a = stripHtml(f.answer); return (<View key={i} style={styles.faq}>{!!q && <Text style={styles.faqQ}>{q}</Text>}{!!a && <Text style={styles.faqA}>{a}</Text>}</View>); })}
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

      {/* Sticky bar → opens the booking flow */}
      <View style={[styles.bookBar, { paddingBottom: insets.bottom + 10 }]}>
        <View>
          <Text style={styles.fromLabel}>from</Text>
          <Text style={styles.fromPrice}>
            {item.fromPrice ? formatMoney(item.fromPrice, item.currency) : 'Contact'}
            {item.fromPrice ? <Text style={styles.fromUnit}>/{item.priceUnit}</Text> : null}
          </Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} activeOpacity={0.9} onPress={() => requireAuth('booking', { item })}>
          <Text style={styles.bookText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: colors.inkMuted }, retry: { color: colors.brand, fontWeight: '700' },
  hero: { width: SCREEN_W, height: 300, backgroundColor: '#DCE0E6' },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.card },
  backIcon: { fontSize: 24, color: colors.ink, marginTop: -2 },
  circleImg: { width: 20, height: 20, tintColor: colors.ink },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dotSm: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotSmActive: { backgroundColor: '#fff', width: 18 },
  body: { padding: space.xl, backgroundColor: colors.surface },
  cat: { color: colors.brand, fontWeight: '800', fontSize: font.small, textTransform: 'uppercase' },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.ink, marginTop: 6 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  locIcon: { width: 15, height: 15 },
  loc: { color: colors.inkMuted, fontSize: font.body },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { width: 15, height: 15, tintColor: colors.inkMuted },
  metaText: { fontSize: font.small, color: colors.ink, fontWeight: '600' },
  star: { color: colors.star, fontSize: font.body },

  host: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 18 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontWeight: '800' },
  hostLabel: { fontSize: font.tiny, color: colors.inkMuted }, hostName: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  verified: { backgroundColor: colors.brand, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill },
  verifiedText: { color: '#fff', fontWeight: '800', fontSize: font.tiny },
  section: { fontSize: font.h3, fontWeight: '800', color: colors.ink, marginTop: 22, marginBottom: 8 },
  para: { fontSize: font.body, color: colors.inkMuted, lineHeight: 21 },

  incGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  incItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingRight: 8 },
  incCheck: { width: 16, height: 16, tintColor: colors.brand },
  incText: { fontSize: font.small, color: colors.ink, flex: 1 },
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
  fromUnit: { fontSize: font.small, color: colors.inkMuted, fontWeight: '600' },
  bookBtn: { backgroundColor: colors.brand, paddingHorizontal: 40, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bookText: { color: '#fff', fontWeight: '800', fontSize: font.h3 },
});
