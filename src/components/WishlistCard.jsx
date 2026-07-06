import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../theme';
import { resolveImage, DUMMY_IMAGE } from '../api/client';
import { formatMoney } from '../utils/format';
import { useWishlist } from '../store/WishlistContext';
import { shareExperience } from '../utils/share';
import { ICONS } from '../icons';

/**
 * Wishlist row card — horizontal layout (112x100 image + details), matching
 * the Figma spec exactly: title, location, rating, price with duration to its
 * right, then a Delete | Share action ribbon along the bottom.
 */
export default function WishlistCard({ item, onPress }) {
  const { toggle } = useWishlist();
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;

  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.row}>
        <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          {!!item.city && (
            <View style={styles.locRow}>
              <Image source={ICONS.locGray} style={styles.locIcon} />
              <Text style={styles.locText} numberOfLines={1}>{item.city}</Text>
            </View>
          )}
          <View style={styles.ratingRow}>
            <Image source={ICONS.star} style={styles.starIcon} />
            <Text style={styles.ratingText}>{Number(item.rating || 0).toFixed(1)}</Text>
            {!!item.reviewsCount && <Text style={styles.reviewsText}> ({item.reviewsCount})</Text>}
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{item.fromPrice ? formatMoney(item.fromPrice, item.currency) : 'Contact'}</Text>
            {!!item.durationLabel && (
              <View style={styles.durationChip}>
                <Image source={ICONS.clock} style={styles.clockIcon} />
                <Text style={styles.durationText}>{item.durationLabel}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => toggle('experience', item.id, { ...item, type: 'experience' })}>
          <Image source={ICONS.trash} style={styles.deleteIcon} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
        <View style={styles.vDivider} />
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => shareExperience(item)}>
          <Image source={ICONS.share} style={styles.shareIcon} />
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 12, ...shadow.card },
  row: { flexDirection: 'row', padding: 12, gap: 12 },
  img: { width: 112, height: 100, borderRadius: radius.md, backgroundColor: '#DCE0E6' },
  details: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '800', color: colors.ink },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  locIcon: { width: 10, height: 10 },
  locText: { fontSize: 10, lineHeight: 15, color: '#888899', flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  starIcon: { width: 11, height: 11, marginRight: 3 },
  ratingText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  reviewsText: { fontSize: 11, color: '#888899' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  price: { fontSize: 14, fontWeight: '700', lineHeight: 20, color: '#F9B402' },
  durationChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  clockIcon: { width: 9, height: 9, tintColor: '#888899' },
  durationText: { fontSize: 10, lineHeight: 15, color: '#888899' },

  divider: { height: 1, backgroundColor: colors.border },
  actions: { flexDirection: 'row', alignItems: 'center', height: 38, paddingHorizontal: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  vDivider: { width: 1, height: '100%', backgroundColor: colors.border },
  deleteIcon: { width: 14, height: 14, tintColor: '#D4183D' },
  deleteText: { fontSize: 13, fontWeight: '700', color: '#D4183D' },
  shareIcon: { width: 14, height: 14, tintColor: colors.ink },
  shareText: { fontSize: 13, fontWeight: '700', color: colors.ink },
});
