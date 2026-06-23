import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';

export default function EmptyState({ emoji = '✨', title, sub, cta, onCta }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
      {!!cta && (
        <TouchableOpacity style={styles.btn} onPress={onCta} activeOpacity={0.9}>
          <Text style={styles.btnText}>{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emoji: { fontSize: 52 },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.ink, marginTop: 14, textAlign: 'center' },
  sub: { fontSize: font.body, color: colors.inkMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 20, backgroundColor: colors.brand, paddingHorizontal: 26, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: font.body },
});
