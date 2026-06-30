import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { resolveImage, DUMMY_IMAGE } from '../../api/client';
import { CategoryBadge, PriceLine, LocationLine } from './parts';

/**
 * Clean deal card — no chrome (no border / no box): a 160×160 square photo with
 * the amber pill, then strike price → price → location → title in dark #1A1A2E
 * text directly on the light app background.
 */
export default function CleanDealCard({ item, onPress, width = 160, style }) {
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;
  const category = (item.category && item.category.name) || 'Cultural';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[{ width }, style]}>
      <View style={styles.imgWrap}>
        <Image source={{ uri: img }} style={styles.photo} resizeMode="cover" />
        <CategoryBadge label={category} style={styles.badge} />
      </View>
      <View style={styles.body}>
        <PriceLine item={item} size={17} strikeColor="#D4183D" />
        <LocationLine city={item.city} />
        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imgWrap: { aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#DCE0E6' },
  photo: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 10, left: 10 },
  body: { paddingTop: 10 },
  title: { color: '#1A1A2E', fontSize: 14, fontWeight: '800', lineHeight: 17, marginTop: 3 },
});
