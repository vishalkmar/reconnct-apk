import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';
import { ICONS } from '../icons';

const TRAVELLER_ITEMS = [
  { key: 'home', label: 'Home', icon: ICONS.navHome },
  { key: 'search', label: 'Search', icon: ICONS.navSearch },
  { key: 'experiences', label: 'Experiences', icon: ICONS.navExp },
  { key: 'inbox', label: 'Inbox', icon: ICONS.navInbox, dot: true },
  { key: 'profile', label: 'Profile', icon: ICONS.navProfile },
];
const HOST_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: ICONS.chart },
  { key: 'listings', label: 'Listings', icon: ICONS.compass },
  { key: 'inbox', label: 'Inbox', icon: ICONS.navInbox, dot: true },
  { key: 'profile', label: 'Profile', icon: ICONS.navProfile },
];

/**
 * Floating, frosted bottom navigation with standard (SVG-style) icons. The
 * active tab gets a soft rounded pill and a darker icon/label. The tab set
 * swaps when the app is in host mode.
 */
export default function BottomNav({ current, onChange, mode = 'traveller' }) {
  const insets = useSafeAreaInsets();
  const items = mode === 'host' ? HOST_ITEMS : TRAVELLER_ITEMS;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: (insets.bottom || 8) + 6 }]}>
      <View style={styles.bar}>
        {items.map((it) => {
          const active = current === it.key;
          return (
            <TouchableOpacity key={it.key} style={[styles.item, active && styles.itemActive]} onPress={() => onChange(it.key)} activeOpacity={0.7}>
              <View>
                <Image source={it.icon} style={[styles.icon, { tintColor: '#1A1A2E' }]} />
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 32, paddingVertical: 8, paddingHorizontal: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 22 },
  itemActive: { backgroundColor: '#ECEDEF' },
  icon: { width: 22, height: 22 },
  dot: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  label: { fontSize: font.tiny, color: '#1A1A2E', marginTop: 4 },
  labelActive: { color: '#1A1A2E', fontWeight: '700' },
});
