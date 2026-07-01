import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, font, shadow } from '../theme';
import { resolveImage, DUMMY_IMAGE } from '../api/client';
import { formatMoney } from '../utils/format';
import { ICONS } from '../icons';

/**
 * Horizontal experience list-item (image flush-left, details right). Order:
 * title → city → rating → price (bottom-left) with duration (bottom-right).
 */
export default function ExperienceRow({ item, onPress }) {
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.row}>
      <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
        {!!item.city && (
          <View style={styles.locRow}>
            <Image source={ICONS.locGray} style={styles.locIcon} />
            <Text style={styles.location} numberOfLines={1}>{item.city}</Text>
          </View>
        )}
        <Text style={styles.rating}>
          <Text style={styles.star}>★ </Text>{Number(item.rating).toFixed(1)}
          {item.reviewsCount ? <Text style={styles.muted}>  ({item.reviewsCount})</Text> : null}
        </Text>
        <View style={styles.foot}>
          <Text style={styles.price}>{item.fromPrice ? formatMoney(item.fromPrice, item.currency) : 'Contact'}</Text>
          {!!item.durationLabel && (
            <View style={styles.duration}>
              <Image source={ICONS.clock} style={styles.durIcon} />
              <Text style={styles.durText}>{item.durationLabel}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 12, overflow: 'hidden', ...shadow.card },
  img: { width: 112, alignSelf: 'stretch', backgroundColor: '#DCE0E6' },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  title: { fontSize: font.body, fontWeight: '700', color: '#1A1A2E', lineHeight: 19 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  locIcon: { width: 12, height: 12 },
  location: { fontSize: font.small, color: colors.inkMuted, flex: 1 },
  rating: { fontSize: font.small, color: colors.ink, fontWeight: '700', marginTop: 5 },
  star: { color: colors.star },
  muted: { color: colors.inkMuted, fontWeight: '400' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  price: { fontSize: font.h3, fontWeight: '800', color: colors.price },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durIcon: { width: 12, height: 12, tintColor: colors.inkMuted },
  durText: { fontSize: font.tiny, color: colors.inkMuted, fontWeight: '600' },
});
