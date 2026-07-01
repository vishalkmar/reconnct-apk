import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { resolveImage, DUMMY_IMAGE } from '../../api/client';
import { ICONS } from '../../icons';
import { CategoryBadge, PriceLine, LocationLine } from './parts';

/**
 * "Trending Nearby" — Figma inspect spec:
 *   container : 330 wide, radius 16, padding 15, gap 20, white surface
 *   header    : "Trending Nearby" + "N Events" + chevron (right)
 *   row card  : horizontal, 300 × 120, border 1px, radius 8, gap 10
 *               image 120 × 120 (radius 8, amber pill) + price / location / title
 *   text      : dark #1A1A2E, strike #D4183D
 * Rendered inside a horizontal carousel so the next card peeks on the side.
 */

function TrendingRow({ item, onPress }) {
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;
  const category = (item.category && item.category.name) || 'Cultural';
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.row}>
      <View style={styles.imgWrap}>
        <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
        <CategoryBadge label={category} style={styles.badge} />
      </View>
      <View style={styles.body}>
        <PriceLine item={item} size={16} strikeColor="#D4183D" stacked />
        <LocationLine city={item.city} />
        <Text style={styles.rowTitle} numberOfLines={2}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TrendingNearbyCard({ group, count, onPressItem, onSeeAll }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.8} onPress={onSeeAll} style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Trending Nearby</Text>
          <Text style={styles.sub}>{count} Events</Text>
        </View>
        <Image source={ICONS.arrowRight} style={styles.arrow} />
      </TouchableOpacity>
      <View style={styles.list}>
        {group.map((it, i) => (
          <TrendingRow key={it.id || i} item={it} onPress={() => onPressItem(it)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 330,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#0B1020',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  title: { color: '#1A1A2E', fontSize: 17, fontWeight: '800' },
  sub: { color: '#7A7E8C', fontSize: 12, marginTop: 2, fontWeight: '600' },
  arrow: { width: 22, height: 22, tintColor: '#1A1A2E', resizeMode: 'contain' },

  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imgWrap: { width: 120, height: '100%' },
  img: { width: '100%', height: '100%', backgroundColor: '#DCE0E6' },
  badge: { position: 'absolute', top: 8, left: 8 },
  body: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, justifyContent: 'center' },
  rowTitle: { color: '#1A1A2E', fontSize: 14, fontWeight: '700', lineHeight: 18, marginTop: 3 },
});
