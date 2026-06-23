import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font } from '../theme';

const ITEMS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'search', label: 'Search', icon: '🔍' },
  { key: 'experiences', label: 'Experiences', icon: '✈️' },
  { key: 'inbox', label: 'Inbox', icon: '💬', dot: true },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

/**
 * Floating, frosted bottom navigation. It sits above the content (absolute) so
 * screens scroll underneath it; the active tab gets a soft rounded pill.
 */
export default function BottomNav({ current, onChange }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: (insets.bottom || 8) + 6 }]}>
      <View style={styles.bar}>
        {ITEMS.map((it) => {
          const active = current === it.key;
          return (
            <TouchableOpacity key={it.key} style={[styles.item, active && styles.itemActive]} onPress={() => onChange(it.key)} activeOpacity={0.7}>
              <View>
                <Text style={styles.icon}>{it.icon}</Text>
                {it.dot && <View style={styles.dot} />}
              </View>
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12 },
  bar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 32, paddingVertical: 8, paddingHorizontal: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 22 },
  itemActive: { backgroundColor: colors.brandSoft },
  icon: { fontSize: 18, textAlign: 'center' },
  dot: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  label: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 3 },
  labelActive: { color: colors.ink, fontWeight: '700' },
});
