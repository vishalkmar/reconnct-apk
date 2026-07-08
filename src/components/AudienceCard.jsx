import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { radius, font, shadow } from '../theme';
import { ICONS } from '../icons';

/**
 * Audience tile for the Explore/Reconnect grid — a full-bleed photo with a
 * dark bottom gradient, the audience title, its tagline, and an "Explore"
 * link. No badge/heart/chip overlay on the image itself.
 */
export default function AudienceCard({ data, onPress, style }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, style]}>
      <Image source={{ uri: data.image }} style={styles.bg} resizeMode="cover" />
      <Image source={ICONS.scrimGrad} style={styles.gradient} resizeMode="stretch" />

      <View style={styles.content}>
        <Text style={styles.title}>{data.title}</Text>
        {!!data.subtitle && <Text style={styles.subtitle}>{data.subtitle}</Text>}
        <Text style={styles.explore}>Explore ›</Text>
      </View>
    </TouchableOpacity>
  );
}

// The four audience themes shown on Home (slug must match a taxonomy audience).
const U = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=80`;
export const AUDIENCE_CARDS = [
  { slug: 'partner', title: 'Partner', chip: '❤ Just the two of you', subtitle: 'Romantic escapes', image: U('1503104834685-7205e8607eb9') },
  { slug: 'family', title: 'Family', chip: '👨‍👩‍👧 For the whole family', subtitle: 'Memories that last', image: U('1542359649-31e03cd4d909') },
  { slug: 'friends', title: 'Friends', chip: '🧑‍🤝‍🧑 With your crew', subtitle: 'Adventures, laughs', image: U('1529156069898-49953e39b3ac') },
  { slug: 'kids-and-teens', title: 'With Kids', chip: '☀ Fun for little ones', subtitle: 'Safe, joyful', image: U('1476234251651-f353703a034d') },
];

// Theme (image + subtitle) for every taxonomy audience, used on the Reconnect
// screen. Falls back to the audience's own name + a default image.
const AUDIENCE_THEME = {
  self: { subtitle: 'Me-time & growth', image: U('1517836357463-d25dfeac3438') },
  yourself: { subtitle: 'Me-time & growth', image: U('1517836357463-d25dfeac3438') },
  partner: { subtitle: 'Romantic escapes', image: U('1503104834685-7205e8607eb9') },
  family: { subtitle: 'Memories that last', image: U('1542359649-31e03cd4d909') },
  friends: { subtitle: 'Adventures, laughs', image: U('1529156069898-49953e39b3ac') },
  'kids-and-teens': { subtitle: 'Safe, joyful fun', image: U('1476234251651-f353703a034d') },
  'community-and-new-connections': { subtitle: 'Meet new people', image: U('1528659882437-b89a74bc157f') },
  'elders-and-active-seniors': { subtitle: 'Cherished moments', image: U('1530789253388-582c481c54b0') },
  'corporate-and-teams': { subtitle: 'Build together', image: U('1488646953014-85cb44e25828') },
};
export const themeForAudience = (a) => {
  const t = AUDIENCE_THEME[a.slug] || {};
  return {
    slug: a.slug,
    title: a.name,
    subtitle: t.subtitle || 'Curated experiences',
    image: t.image || U('1469854523086-cc02fe5d8800'),
  };
};

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden', height: 250, backgroundColor: '#2b3040', ...shadow.card },
  bg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, width: '100%', height: '100%' },
  content: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, alignItems: 'flex-start', zIndex: 2 },
  title: { color: '#fff', fontSize: 17, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: font.small, marginTop: 2 },
  explore: { color: '#fff', fontSize: font.small, fontWeight: '800', marginTop: 8 },
});
