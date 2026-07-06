import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../theme';
import { api } from '../api/client';
import { useLocation } from '../store/LocationContext';
import {
  SEARCH_SVG, LOCATE_SVG, OTHER_CITIES_SVG, cityMonumentSvg, POPULAR_CITIES,
} from './cityIcons';

/**
 * "Choose Location" bottom sheet — slides up from the bottom (like the filter
 * sheet) when the header city pill is tapped. Popular cities render as a 2-col
 * grid of monument cards; the rest fall under "Other Cities". Built to the Figma
 * spec (24px sheet radius, 16px cards, #FE9A00 selection, monument colours).
 */
export default function LocationSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { city, detectedCity, setSelectedCity, redetect } = useLocation();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setLoading(true);
    api.cities().then((d) => setCities(d.cities || [])).catch(() => {}).finally(() => setLoading(false));
  }, [visible]);

  const isActive = (name) => (city || '').toLowerCase() === String(name).toLowerCase();

  const choose = (name) => { setSelectedCity(name); onClose(); };
  const useCurrent = () => { setSelectedCity(null); redetect && redetect(); onClose(); };

  // "Other cities" = API cities that aren't already in the popular grid.
  const popularSet = useMemo(() => new Set(POPULAR_CITIES.map((c) => c.toLowerCase().replace(/\s*-\s*ncr/, ''))), []);
  const otherCities = useMemo(
    () => cities.filter((c) => !popularSet.has(String(c.name).toLowerCase())),
    [cities, popularSet],
  );

  const q = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!q) return null;
    const pool = [...POPULAR_CITIES.map((n) => ({ name: n })), ...cities];
    const seen = new Set();
    return pool.filter((c) => {
      const key = String(c.name).toLowerCase();
      if (seen.has(key) || !key.includes(q)) return false;
      seen.add(key);
      return true;
    });
  }, [q, cities]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.head}>
            <Text style={styles.title}>Choose Location</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.search}>
            <SvgXml xml={SEARCH_SVG} width={16} height={16} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for Destinations"
              placeholderTextColor={colors.inkFaint}
              value={query}
              onChangeText={setQuery}
            />
            <TouchableOpacity onPress={useCurrent} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <SvgXml xml={LOCATE_SVG} width={20} height={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginTop: 4 }}>
            {loading ? (
              <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
            ) : searchResults ? (
              <View style={{ paddingTop: 8 }}>
                {searchResults.length === 0 && <Text style={styles.empty}>No destinations match “{query}”.</Text>}
                {searchResults.map((c) => (
                  <CityRow key={c.name} name={c.name} active={isActive(c.name)} onPress={() => choose(c.name)} />
                ))}
              </View>
            ) : (
              <>
                {/* Popular cities */}
                <View style={styles.labelRow}>
                  <Text style={styles.heart}>♥</Text>
                  <Text style={styles.label}>Popular Cities</Text>
                </View>
                <View style={styles.grid}>
                  {POPULAR_CITIES.map((name) => {
                    const active = isActive(name) || isActive(name.replace(/\s*-\s*NCR/i, ''));
                    return (
                      <TouchableOpacity
                        key={name}
                        style={[styles.cityCard, active && styles.cityCardActive]}
                        activeOpacity={0.85}
                        onPress={() => choose(name.replace(/\s*-\s*NCR/i, ''))}
                      >
                        <SvgXml xml={cityMonumentSvg(name)} width={36} height={36} />
                        <Text style={styles.cityCardName} numberOfLines={1}>{name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Other cities */}
                <View style={[styles.labelRow, { marginTop: 20 }]}>
                  <SvgXml xml={OTHER_CITIES_SVG} width={15} height={15} />
                  <Text style={styles.label}>Other Cities</Text>
                </View>
                {otherCities.length === 0 ? (
                  <Text style={styles.empty}>More cities coming soon.</Text>
                ) : (
                  otherCities.map((c, i) => (
                    <CityRow
                      key={c.name}
                      name={c.name}
                      count={c.count}
                      active={isActive(c.name)}
                      onPress={() => choose(c.name)}
                      last={i === otherCities.length - 1}
                    />
                  ))
                )}
                <View style={{ height: 12 }} />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CityRow({ name, count, active, onPress, last }) {
  return (
    <TouchableOpacity style={[styles.otherRow, !last && styles.otherRowBorder]} activeOpacity={0.7} onPress={onPress}>
      <Text style={[styles.otherName, active && { color: colors.brand, fontWeight: '800' }]}>{name}</Text>
      {count != null && <Text style={styles.otherCount}>{count}</Text>}
      {active && <Text style={styles.otherCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 18, maxHeight: '86%',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F2F4', alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 14, color: '#4B4B57', fontWeight: '700' },

  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, color: '#1A1A2E', fontSize: font.body, paddingVertical: 0 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, marginBottom: 12 },
  heart: { fontSize: 14, color: '#FE9A00' },
  label: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  cityCard: {
    width: '48.5%', height: 64, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: '#EDEEF1', borderRadius: 16, paddingHorizontal: 12,
  },
  cityCardActive: { borderColor: '#FE9A00', backgroundColor: '#FFF9EF' },
  cityCardName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: '#1A1A2E' },

  otherRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  otherRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EDEEF1' },
  otherName: { flex: 1, fontSize: font.body, color: '#1A1A2E', fontWeight: '600' },
  otherCount: { fontSize: font.small, color: colors.inkMuted },
  otherCheck: { color: colors.brand, fontWeight: '900', marginLeft: 10 },

  empty: { color: colors.inkMuted, paddingVertical: 20, textAlign: 'center' },
});
