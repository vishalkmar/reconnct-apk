import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../theme';
import { api } from '../api/client';
import { useLocation } from '../store/LocationContext';
import { useNav } from '../navigation/NavContext';
import ExperienceRow from '../components/ExperienceRow';
import FilterSheet, { draftToParams, PRICE_BANDS } from './FilterSheet';
import { ICONS } from '../icons';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { coords } = useLocation();
  const { push } = useNav();

  const [taxonomy, setTaxonomy] = useState(null);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const geo = coords ? { lat: coords.lat, lon: coords.lon } : {};

  useEffect(() => { api.taxonomy().then(setTaxonomy).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.listExperiences({ ...draftToParams(filters), q: query.trim() || undefined, ...geo })
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, query, coords && coords.lat]);

  // Debounced reload.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const cats = (taxonomy && taxonomy.categories) || [];
  const auds = (taxonomy && taxonomy.audiences) || [];
  const catName = (id) => (cats.find((c) => c.id === id) || {}).name;
  const audName = (id) => (auds.find((a) => a.id === id) || {}).name;
  const bandLabel = (k) => (PRICE_BANDS.find((b) => b.key === k) || {}).label;

  // Active filters as removable chips.
  const chips = [];
  if (filters.audienceId) chips.push({ key: 'audienceId', label: audName(filters.audienceId) });
  if (filters.categoryId) chips.push({ key: 'categoryId', label: catName(filters.categoryId) });
  if (filters.priceBand) chips.push({ key: 'priceBand', label: bandLabel(filters.priceBand) });
  const removeChip = (k) => setFilters((f) => ({ ...f, [k]: null }));

  const openDetail = (it) => push('detail', { idOrSlug: it.slug || it.id });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBox}>
          <Image source={ICONS.searchMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Destinations, experiences…"
            placeholderTextColor={colors.inkFaint}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Text style={styles.clearX}>✕</Text></TouchableOpacity>}
        </View>

        {/* Filters button + active filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter(true)}>
            <Image source={ICONS.filter} style={styles.filterIcon} />
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>
          {chips.map((c) => (
            <TouchableOpacity key={c.key} style={styles.activeChip} onPress={() => removeChip(c.key)}>
              <Text style={styles.activeChipText}>{c.label}</Text>
              <Text style={styles.activeChipX}>✕</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: 12, paddingBottom: 110 }}
          ListHeaderComponent={<Text style={styles.count}>{items.length} experience{items.length === 1 ? '' : 's'}</Text>}
          renderItem={({ item }) => <ExperienceRow item={item} onPress={() => openDetail(item)} />}
          ListEmptyComponent={<Text style={styles.empty}>No experiences match. Try a different search or filter.</Text>}
        />
      )}

      <FilterSheet
        visible={showFilter}
        taxonomy={taxonomy}
        initial={filters}
        onClose={() => setShowFilter(false)}
        onApply={(draft) => { setFilters(draft); setShowFilter(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: colors.border },
  searchIcon: { width: 16, height: 16, marginRight: 8 },
  input: { flex: 1, fontSize: font.body, color: colors.ink, paddingVertical: 0 },
  clearX: { color: colors.inkFaint, fontSize: 14, paddingHorizontal: 6 },
  chipsRow: { gap: 8, paddingTop: 12 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand, paddingHorizontal: 14, height: 34, borderRadius: radius.pill },
  filterIcon: { width: 15, height: 15, tintColor: '#fff' },
  filterText: { color: '#fff', fontWeight: '800', fontSize: font.small },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brandSoft, paddingHorizontal: 12, height: 34, borderRadius: radius.pill },
  activeChipText: { color: colors.brandText, fontWeight: '700', fontSize: font.small },
  activeChipX: { color: colors.brandText, fontSize: 12 },
  count: { fontSize: font.body, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  empty: { color: colors.inkMuted, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
});
