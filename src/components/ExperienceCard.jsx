import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, font, shadow } from '../theme';
import { resolveImage, DUMMY_IMAGE } from '../api/client';
import { formatMoney } from '../utils/format';
import { useWishlist } from '../store/WishlistContext';
import { ICONS } from '../icons';

/**
 * Experience card (image-top, details-below). Used in the Explore grid,
 * carousels, Featured row, the Experiences list and Wishlist.
 */
export default function ExperienceCard({ item, onPress, variant = 'grid', style }) {
  const { isWished, toggle } = useWishlist();
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;
  const wished = isWished('experience', item.id);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, style]}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
        {!!(item.category && item.category.name) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>{item.category.name}</Text>
          </View>
        )}
        {/* Heart — its own hit target so tapping it never opens the card. */}
        <TouchableOpacity
          style={styles.heart}
          onPress={() => toggle('experience', item.id, { ...item, type: 'experience' })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={[styles.heartIcon, wished && styles.heartOn]}>{wished ? '♥' : '♡'}</Text>
        </TouchableOpacity>
        {item.distanceKm != null && (
          <View style={styles.distance}>
            <Image source={ICONS.locMuted} style={styles.distIcon} />
            <Text style={styles.distanceText}>{item.distanceKm} km</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>

        {!!item.city && (
          <View style={styles.locRow}>
            <Image source={ICONS.locGray} style={styles.locIcon} />
            <Text style={styles.location} numberOfLines={1}>{item.city}</Text>
          </View>
        )}

        <View style={styles.footRow}>
          <Text style={styles.rating}>
            <Text style={styles.star}>★ </Text>
            {Number(item.rating).toFixed(1)}
            {item.reviewsCount ? <Text style={styles.muted}>  ({item.reviewsCount})</Text> : null}
          </Text>
          <Text style={styles.price}>
            {item.fromPrice ? formatMoney(item.fromPrice, item.currency) : 'Contact'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 130, backgroundColor: '#DCE0E6' },
  badge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm,
    maxWidth: '64%',
  },
  badgeText: { color: '#fff', fontSize: font.tiny, fontWeight: '600' },
  heart: {
    position: 'absolute', top: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    ...shadow.card,
  },
  heartIcon: { color: colors.inkMuted, fontSize: 18, marginTop: -1 },
  heartOn: { color: colors.heart },
  distance: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm,
  },
  distIcon: { width: 11, height: 11, tintColor: colors.inkMuted },
  distanceText: { fontSize: font.tiny, color: colors.ink, fontWeight: '700' },
  body: { padding: 10 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.ink, lineHeight: 18 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  locIcon: { width: 12, height: 12 },
  location: { fontSize: font.small, color: colors.inkMuted, flex: 1 },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  rating: { fontSize: font.small, color: colors.ink, fontWeight: '700' },
  star: { color: colors.star },
  muted: { color: colors.inkMuted, fontWeight: '400' },
  price: { fontSize: font.h3, fontWeight: '800', color: colors.price },
});
