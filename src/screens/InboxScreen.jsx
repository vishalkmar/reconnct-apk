import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <Text style={styles.emoji}>💬</Text>
      <Text style={styles.title}>Inbox</Text>
      <Text style={styles.sub}>Your booking updates and messages will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 56 },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.ink, marginTop: 12 },
  sub: { fontSize: font.body, color: colors.inkMuted, textAlign: 'center', marginTop: 8 },
});
