import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, font, shadow } from '../theme';
import { resolveImage, DUMMY_IMAGE } from '../api/client';
import { formatMoney } from '../utils/format';

/**
 * Dark "deal" card (Last Minute Deals / Connect With… rails). Image on top with
 * a category badge, then a struck original price + discounted price, location
 * and title — all on a dark surface. Fixed width for horizontal rails.
 */
const W = 200;

export default function DealCard({ item, onPress, style }) {
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;
  const price = item.fromPrice || 0;
  const strike = price ? Math.round((price * 1.48) / 50) * 50 : 0; // shown crossed-out

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, style]}>
      <View style={styles.imgWrap}>
        <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
        {!!(item.category && item.category.name) && (
          <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>{item.category.name}</Text></View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.priceRow}>
          {!!strike && <Text style={styles.strike}>{formatMoney(strike, item.currency)}</Text>}
          <Text style={styles.price}>{price ? formatMoney(price, item.currency) : 'Contact'}</Text>
          {!!price && <Text style={styles.unit}>/{item.priceUnit || 'person'}</Text>}
        </View>
        {!!item.city && <Text style={styles.loc} numberOfLines={1}>📍 {item.city}</Text>}
        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: W, backgroundColor: '#1b2236', borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 130, backgroundColor: '#2a3146' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, maxWidth: '75%' },
  badgeText: { color: '#fff', fontSize: font.tiny, fontWeight: '700' },
  body: { padding: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  strike: { color: '#F7A6A6', fontSize: font.small, textDecorationLine: 'line-through', marginBottom: 1 },
  price: { color: '#fff', fontSize: font.h3, fontWeight: '900' },
  unit: { color: 'rgba(255,255,255,0.6)', fontSize: font.tiny, marginBottom: 2 },
  loc: { color: 'rgba(255,255,255,0.7)', fontSize: font.small, marginTop: 6 },
  title: { color: '#fff', fontSize: font.body, fontWeight: '700', marginTop: 4, lineHeight: 19 },
});
