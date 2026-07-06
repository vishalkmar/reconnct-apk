import React, { useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Dimensions, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');

// Stock travel photos stand in for the Figma illustrations (no exact source
// art available). Swap the `image` urls for real assets whenever they're ready.
const SLIDES = [
  { image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=80', title: 'Lorem ipsum dolor sit amet', subtitle: 'Lorem ipsum dolor sit amet' },
  { image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80', title: 'Lorem ipsum dolor sit amet', subtitle: 'Lorem ipsum dolor sit amet' },
  { image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=900&q=80', title: 'Lorem ipsum dolor sit amet', subtitle: 'Lorem ipsum dolor sit amet' },
];

/**
 * Skippable 3-slide intro carousel shown between the splash and the login
 * screen. Skip (top-right) exits straight to login from any slide — so
 * skipping on slide 1 means slides 2-3 never show, skipping on slide 2 means
 * slide 3 never shows. The last slide's circular button turns brand-amber and
 * finishes onto login too.
 */
export default function IntroScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) { onDone(); return; }
    listRef.current && listRef.current.scrollToIndex({ index: index + 1, animated: true });
  };

  const onMomentumEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIndex(i);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <TouchableOpacity style={[styles.skip, { top: insets.top + 14 }]} onPress={onDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_W }]}>
            <Image source={{ uri: item.image }} style={styles.illustration} resizeMode="cover" />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnLast]}
          onPress={next}
          activeOpacity={0.9}
        >
          <Text style={styles.nextIcon}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  skip: { position: 'absolute', right: 20, zIndex: 5 },
  skipText: { color: colors.inkMuted, fontWeight: '700', fontSize: font.body },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  illustration: { width: '100%', height: 260, borderRadius: radius.lg, backgroundColor: colors.brandSoft },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, marginTop: 28, textAlign: 'center' },
  subtitle: { fontSize: font.body, color: colors.inkMuted, marginTop: 8, textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 10 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 20, backgroundColor: colors.brand },
  nextBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  nextBtnLast: { backgroundColor: colors.brand },
  nextIcon: { color: '#fff', fontSize: 26, fontWeight: '800', marginLeft: 2 },
});
