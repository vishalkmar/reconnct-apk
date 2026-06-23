import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { colors, radius, font } from '../theme';
import { api, resolveImage, DUMMY_IMAGE } from '../api/client';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 16;
const CARD_W = SCREEN_W - H_PAD * 2;
const AUTO_MS = 3500;

/**
 * Auto-sliding offer/advert carousel (admin-managed via "Offer Banners").
 * Each slide is a plain image or an image with title/subtitle/CTA overlay.
 */
// Shown if the backend offer-banners endpoint isn't reachable yet, so Home
// never loses its advert strip.
const FALLBACK = [
  { id: 'f1', type: 'image_text', image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1000&q=80', title: 'EARLY BIRD SPECIAL', subtitle: 'Unlock exclusive adventures! Book now', ctaText: 'BOOK NOW' },
  { id: 'f2', type: 'image_text', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&q=80', title: 'WEEKEND ESCAPES', subtitle: 'Up to 20% off coastal getaways', ctaText: 'EXPLORE' },
];

export default function OfferBannerCarousel() {
  const [banners, setBanners] = useState(FALLBACK);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.offerBanners()
      .then((d) => { if (alive && d.banners && d.banners.length) setBanners(d.banners); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Auto-advance.
  useEffect(() => {
    if (banners.length < 2) return undefined;
    const t = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % banners.length;
        listRef.current && listRef.current.scrollToOffset({ offset: next * CARD_W, animated: true });
        return next;
      });
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <View style={{ marginTop: 16 }}>
      <FlatList
        ref={listRef}
        data={banners}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(b, i) => String(b.id || i)}
        snapToInterval={CARD_W}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: H_PAD }}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / CARD_W))}
        renderItem={({ item }) => <Slide banner={item} />}
      />
      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}
        </View>
      )}
    </View>
  );
}

function Slide({ banner }) {
  const img = resolveImage(banner.image) || DUMMY_IMAGE;
  const withText = banner.type === 'image_text';
  return (
    <View style={styles.slide}>
      <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
      {withText && (
        <>
          <View style={styles.scrim} />
          <View style={styles.content}>
            {!!banner.title && <Text style={styles.title}>{banner.title}</Text>}
            {!!banner.subtitle && <Text style={styles.subtitle}>{banner.subtitle}</Text>}
            {!!banner.ctaText && (
              <TouchableOpacity style={styles.cta} activeOpacity={0.9}>
                <Text style={styles.ctaText}>{banner.ctaText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { width: CARD_W, height: 150, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  img: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.34)' },
  content: { flex: 1, padding: 18, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.95)', fontSize: font.small, marginTop: 4 },
  cta: { backgroundColor: colors.brand, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, marginTop: 12 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: font.tiny },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.brand, width: 18 },
});
