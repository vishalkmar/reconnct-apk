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
        {/* Heart — its own hit target so tapping it never opens the card. */}
        <TouchableOpacity
          style={styles.heart}
          onPress={() => toggle('experience', item.id, { ...item, type: 'experience' })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Image
            source={wished ? ICONS.heartFill : ICONS.heart}
            style={[styles.heartIcon, { tintColor: wished ? colors.heart : colors.inkMuted }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
        {/* Category badge sits at the bottom-left of the image. */}
        {!!(item.category && item.category.name) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>{item.category.name}</Text>
          </View>
        )}
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
          <View style={styles.ratingRow}>
            <Image source={ICONS.star} style={styles.starIcon} />
            <Text style={styles.rating}>{Number(item.rating).toFixed(1)}</Text>
            {item.reviewsCount ? <Text style={styles.muted}> ({item.reviewsCount})</Text> : null}
          </View>
          <Text style={styles.price}>
            {item.fromPrice ? formatMoney(item.fromPrice, item.currency) : 'Contact'}
          </Text>
        </View>

        {(!!item.durationLabel || !!item.capacity) && (
          <View style={styles.metaRow}>
            {!!item.durationLabel && (
              <View style={styles.metaItem}>
                <Image source={ICONS.clock} style={styles.metaIcon} />
                <Text style={styles.metaText}>{item.durationLabel}</Text>
              </View>
            )}
            {!!item.capacity && (
              <View style={styles.metaItem}>
                <Image source={ICONS.people} style={styles.metaIcon} />
                <Text style={styles.metaText}>Up to {item.capacity}</Text>
              </View>
            )}
          </View>
        )}
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
  image: { width: '100%', height: 140, backgroundColor: '#DCE0E6' },
  badge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm,
    maxWidth: '70%',
  },
  badgeText: { color: '#fff', fontSize: font.tiny, fontWeight: '600' },
  heart: {
    position: 'absolute', top: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    ...shadow.card,
  },
  heartIcon: { width: 16, height: 16 },
  distance: {
    position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm,
  },
  distIcon: { width: 11, height: 11, tintColor: colors.inkMuted },
  distanceText: { fontSize: font.tiny, color: colors.ink, fontWeight: '700' },
  body: { padding: 10 },
  title: { fontSize: font.body, fontWeight: '700', color: '#1A1A2E', lineHeight: 18 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  locIcon: { width: 11, height: 11 },
  location: { fontSize: font.small, color: '#888899', flex: 1 },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  starIcon: { width: 12, height: 12, tintColor: colors.star, marginRight: 3 },
  rating: { fontSize: font.small, color: '#1A1A2E', fontWeight: '700' },
  muted: { color: '#888899', fontWeight: '400', fontSize: font.small },
  price: { fontSize: font.h3, fontWeight: '800', color: colors.price },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { width: 11, height: 11, tintColor: '#888899' },
  metaText: { fontSize: font.tiny, color: '#888899', fontWeight: '600' },
});
