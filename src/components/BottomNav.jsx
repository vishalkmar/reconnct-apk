import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../theme';
import { ICONS } from '../icons';

// Chain-link glyph (Reconnect tab) — drawn as SVG since it isn't one of the
// generated PNG icons; same stroke treatment as the other nav icons.
function LinkIcon({ size = 22, color = '#1A1A2E' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const TRAVELLER_ITEMS = [
  { key: 'home', label: 'Home', icon: ICONS.navHome },
  { key: 'search', label: 'Search', icon: ICONS.navSearch },
  { key: 'reconnect', label: 'Reconnect', svgIcon: LinkIcon },
  { key: 'experiences', label: 'Experiences', icon: ICONS.navExp },
  { key: 'profile', label: 'Profile', icon: ICONS.navProfile },
];
// Host and Supplier now carry the SAME tabs — support chat was dropped from
// the host panel, so neither owner portal has an Inbox.
const HOST_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: ICONS.chart },
  { key: 'listings', label: 'Listings', icon: ICONS.compass },
  { key: 'profile', label: 'Profile', icon: ICONS.navProfile },
];
const SUPPLIER_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: ICONS.chart },
  { key: 'listings', label: 'Listings', icon: ICONS.compass },
  { key: 'profile', label: 'Profile', icon: ICONS.navProfile },
];

/**
 * Floating, frosted bottom navigation with standard (SVG-style) icons. The
 * active tab gets a soft rounded pill, a darker/bold label, and a small
 * notch-and-dot indicator poking above it. The tab set swaps in host mode.
 */
export default function BottomNav({ current, onChange, mode = 'traveller' }) {
  const insets = useSafeAreaInsets();
  const items = mode === 'host' ? HOST_ITEMS : mode === 'supplier' ? SUPPLIER_ITEMS : TRAVELLER_ITEMS;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: (insets.bottom || 8) + 6 }]}>
      <View style={styles.bar}>
        {items.map((it) => {
          const active = current === it.key;
          const Icon = it.svgIcon;
          return (
            <TouchableOpacity key={it.key} style={[styles.item, active && styles.itemActive]} onPress={() => onChange(it.key)} activeOpacity={0.7}>
              {active && (
                <View style={styles.notchWrap} pointerEvents="none">
                  <View style={styles.notchCutout} />
                </View>
              )}
              {active && <View style={styles.notchDot} pointerEvents="none" />}
              <View>
                {Icon ? <Icon size={22} color="#1A1A2E" /> : <Image source={it.icon} style={[styles.icon, { tintColor: '#1A1A2E' }]} />}
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
  // Glass-morphism: translucent frosted white + a bright top-edge hairline so
  // it reads as glass even without a true native blur behind it.
  bar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 32, paddingVertical: 8, paddingHorizontal: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 12,
    overflow: 'visible',
  },
  item: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 22 },
  itemActive: { backgroundColor: 'rgba(236,237,239,0.85)' },
  icon: { width: 22, height: 22 },
  dot: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  label: { fontSize: font.tiny, color: '#1A1A2E', marginTop: 4 },
  labelActive: { color: '#1A1A2E', fontWeight: '700' },

  // Notch + dot poking above the active tab — a circle the page-background
  // colour "bites into" the pill's top edge, with a small amber dot floating
  // above it. Bottom edge of the circle must stay clear of the icon below it
  // (icon starts at paddingVertical:6 from the item's top) — sized/positioned
  // so it dips only slightly into the bar for the bite, mostly floating above.
  notchWrap: { position: 'absolute', top: -32, alignSelf: 'center', width: 30, height: 30, alignItems: 'center', zIndex: 1 },
  notchCutout: { position: 'absolute', top: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg },
  notchDot: {
    position: 'absolute', top: -24, alignSelf: 'center', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand,
    shadowColor: colors.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 5, elevation: 8, zIndex: 2,
  },
});
