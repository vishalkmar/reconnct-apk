import React from 'react';
import { View, Text, Image, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { resolveImage, DUMMY_IMAGE } from '../../api/client';
import { ICONS } from '../../icons';
import { CategoryBadge, PriceLine, LocationLine } from './parts';

/**
 * Overlay deal card (design image 5): the photo fills the whole card; a dark
 * gradient at the bottom carries the amber pill (top-left) and the price /
 * location / title overlaid in white.
 */
export default function OverlayDealCard({ item, onPress, width = 270, height = 290, style }) {
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;
  const category = (item.category && item.category.name) || 'Cultural';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, { width, height }, style]}>
      <Image source={{ uri: img }} style={styles.photo} resizeMode="cover" />
      <Image source={ICONS.overlayGrad} style={styles.grad} resizeMode="stretch" />
      <CategoryBadge label={category} style={styles.badge} />
      <View style={styles.body}>
        <PriceLine item={item} light size={17} />
        <LocationLine city={item.city} light />
        <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#141425' },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  grad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '100%' },
  badge: { position: 'absolute', top: 10, left: 10 },
  body: { position: 'absolute', left: 12, right: 12, bottom: 14 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 17, marginTop: 3 },
});
