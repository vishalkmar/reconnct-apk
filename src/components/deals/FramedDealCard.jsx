import React from 'react';
import { View, Text, Image, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { resolveImage, DUMMY_IMAGE } from '../../api/client';
import { ICONS } from '../../icons';
import { CategoryBadge, PriceLine, LocationLine } from './parts';

/**
 * Framed deal card — built to the Figma inspect spec:
 *   card  : 170 × 290, radius 16, border 1px, padding T10 R10 B20 L10, gap 10
 *   bg    : linear gradient #305BA4 → #141425 (vertical)
 *   image : 150 × 162, radius 8
 *   badge : #F9B402 (amber), strike price #D4183D, price/title white
 * width / imageH stay props so the focus + partner rails can resize the card
 * while keeping the same proportions (image width = card width − 20 padding).
 */
export default function FramedDealCard({ item, onPress, width = 170, imageH = 162, height, muted, style }) {
  const img = resolveImage(item.mainImage) || DUMMY_IMAGE;
  const category = (item.category && item.category.name) || 'Cultural';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, { width }, height ? { height } : null, muted && styles.muted, style]}
    >
      <ImageBackground source={ICONS.dealCardGrad} style={[styles.fill, height ? styles.fillFixed : null]} imageStyle={styles.fillImg} resizeMode="stretch">
        <View style={[styles.imgWrap, { height: imageH }]}>
          <Image source={{ uri: img }} style={styles.photo} resizeMode="cover" />
          <CategoryBadge label={category} style={styles.badge} />
        </View>
        <View style={styles.body}>
          <PriceLine item={item} light size={16} />
          <LocationLine city={item.city} light />
          <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141425',
  },
  fill: { paddingTop: 10, paddingHorizontal: 10, paddingBottom: 20 },
  fillFixed: { flex: 1, paddingBottom: 10, justifyContent: 'space-between' },
  fillImg: { borderRadius: 16 },
  imgWrap: { borderRadius: 8, overflow: 'hidden' },
  photo: { width: '100%', height: '100%', backgroundColor: '#DCE0E6' },
  badge: { position: 'absolute', top: 8, left: 8 },
  body: { marginTop: 10 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 17, marginTop: 3 },
  muted: { opacity: 0.45 },
});
