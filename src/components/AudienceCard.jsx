import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, font, shadow } from '../theme';
import { ICONS } from '../icons';

/**
 * Overlay-style "Reconnect" card (full-bleed image + text overlay) — the second
 * card pattern in the Explore grid. Tapping opens the Experiences page filtered
 * by that audience. A smooth bottom gradient (PNG) keeps text legible without a
 * hard band; the chip + title are centred, Explore sits bottom-left.
 */
export default function AudienceCard({ data, onPress, style }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, style]}>
      <Image source={{ uri: data.image }} style={styles.bg} resizeMode="cover" />
      <Image source={ICONS.cardGradient} style={styles.gradient} resizeMode="stretch" />

      <View style={styles.top}>
        <View style={styles.pill}><Text style={styles.pillText}>💛 Reconnect</Text></View>
        <View style={styles.heart}><Text style={styles.heartIcon}>♡</Text></View>
      </View>

      <View style={styles.content}>
        <View style={styles.chip}><Text style={styles.chipText}>{data.chip}</Text></View>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{data.subtitle}</Text>
        <Text style={styles.explore}>Explore  →</Text>
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

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden', height: 250, backgroundColor: '#2b3040', ...shadow.card },
  bg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '78%' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 10, zIndex: 2 },
  pill: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { color: '#fff', fontSize: font.tiny, fontWeight: '700' },
  heart: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  heartIcon: { color: colors.ink, fontSize: 14 },
  content: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: 12, alignItems: 'center', zIndex: 2 },
  chip: { backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, marginBottom: 8 },
  chipText: { color: colors.heart, fontSize: font.tiny, fontWeight: '800' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', fontStyle: 'italic', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.92)', fontSize: font.small, marginTop: 2, textAlign: 'center' },
  explore: { color: '#fff', fontWeight: '800', fontSize: font.small, marginTop: 10, alignSelf: 'flex-start' },
});
