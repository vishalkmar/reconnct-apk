import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font } from '../theme';

const ITEMS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'search', label: 'Search', icon: '🔍' },
  { key: 'experiences', label: 'Experiences', icon: '✈️' },
  { key: 'inbox', label: 'Inbox', icon: '💬' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav({ current, onChange }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom || 10 }]}>
      <View style={styles.bar}>
        {ITEMS.map((it) => {
          const active = current === it.key;
          return (
            <TouchableOpacity key={it.key} style={styles.item} onPress={() => onChange(it.key)} activeOpacity={0.7}>
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Text style={styles.icon}>{it.icon}</Text>
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  bar: { flexDirection: 'row', paddingTop: 8, paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center' },
  iconWrap: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: radius.pill },
  iconWrapActive: { backgroundColor: colors.brandSoft },
  icon: { fontSize: 18 },
  label: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 3 },
  labelActive: { color: colors.ink, fontWeight: '700' },
});
