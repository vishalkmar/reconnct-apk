import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, font, shadow } from '../theme';
import { resolveImage, DUMMY_IMAGE } from '../api/client';
import { formatMoney } from '../utils/format';
import { ICONS } from '../icons';

/**
 * Horizontal experience list-item (image left, details right) used on the
 * Search screen list. Clean info only: title, rating, location, price; with the
 * duration as a small note top-right.
 */
export default function ExperienceRow({ item, onPress }) {
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.row}>
      <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.rating}>
          <Text style={styles.star}>★ </Text>{Number(item.rating).toFixed(1)}
          {item.reviewsCount ? <Text style={styles.muted}>  ({item.reviewsCount})</Text> : null}
        </Text>
        {!!item.city && (
          <View style={styles.locRow}>
            <Image source={ICONS.locGray} style={styles.locIcon} />
            <Text style={styles.location} numberOfLines={1}>{item.city}</Text>
          </View>
        )}
        <Text style={styles.price}>{item.fromPrice ? formatMoney(item.fromPrice, item.currency) : 'Contact'}</Text>
      </View>
      {!!item.durationLabel && (
        <View style={styles.duration}>
          <Image source={ICONS.clock} style={styles.durIcon} />
          <Text style={styles.durText}>{item.durationLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 10, marginBottom: 12, ...shadow.card },
  img: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: '#DCE0E6' },
  body: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { fontSize: font.body, fontWeight: '700', color: colors.ink, lineHeight: 19 },
  rating: { fontSize: font.small, color: colors.ink, fontWeight: '700', marginTop: 4 },
  star: { color: colors.star },
  muted: { color: colors.inkMuted, fontWeight: '400' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locIcon: { width: 12, height: 12 },
  location: { fontSize: font.small, color: colors.inkMuted, flex: 1 },
  price: { fontSize: font.h3, fontWeight: '800', color: colors.price, marginTop: 4 },
  duration: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 3 },
  durIcon: { width: 12, height: 12, tintColor: colors.inkMuted },
  durText: { fontSize: font.tiny, color: colors.inkMuted, fontWeight: '600' },
});
