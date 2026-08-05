import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions,
  ActivityIndicator, ScrollView, TextInput, Image,
} from 'react-native';
import { ICONS, iconForCategory } from '../icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../theme';
import { api } from '../api/client';
import { useNav } from '../navigation/NavContext';
import { useLocation } from '../store/LocationContext';
import ExperienceCard from '../components/ExperienceCard';
import FilterSheet, { draftToParams } from './FilterSheet';

// "Near you" screen (opened from the popup CTA / near-you See all) only ever
// shows experiences within this many km of the user.
const NEARBY_RADIUS_KM = 20;

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 16;
const GAP = 12;
const COL_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;

export default function ExperiencesScreen({ initialFilters, tagMode = 'category', nearbyMode = false }) {
  const insets = useSafeAreaInsets();
  const { navigateTab, push, pop, stack } = useNav();
  const { coords } = useLocation();
  const canGoBack = stack && stack.length > 0;

  const [taxonomy, setTaxonomy] = useState(null);
  const [filters, setFilters] = useState(initialFilters || {}); // { audienceId, categoryId, priceBand, q }
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => { api.taxonomy().then(setTaxonomy).catch(() => {}); }, []);

  const lat = coords && coords.lat != null ? coords.lat : null;
  const lon = coords && coords.lon != null ? coords.lon : null;

  const load = useCallback(async (f) => {
    setLoading(true);
    setError('');
    try {
      // Near-you screen: ONLY experiences within 20 km of the user, distance-
      // sorted. Everywhere else: the normal filtered listing.
      if (nearbyMode && lat != null) {
        const data = await api.nearbyExperiences(lat, lon, { radius: NEARBY_RADIUS_KM, limit: 60 });
        setItems(data.experiences || []);
      } else {
        const data = await api.listExperiences(draftToParams(f));
        setItems(data.items || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [nearbyMode, lat, lon]);

  useEffect(() => { load(filters); }, [filters, load]);

  const activeCount = ['audienceId', 'categoryId', 'priceBand'].filter((k) => filters[k]).length + (filters.q ? 1 : 0);
  const cats = (taxonomy && taxonomy.categories) || [];
  const auds = (taxonomy && taxonomy.audiences) || [];
  const audienceMode = tagMode === 'audience';

  const submitSearch = () => {
    setSearching(false);
    setFilters((f) => ({ ...f, q: search.trim() || undefined }));
  };

  const openDetail = (item) => push('detail', { idOrSlug: item.slug || item.id });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => (canGoBack ? pop() : navigateTab('home'))} style={styles.iconBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          {searching ? (
            <TextInput
              style={styles.searchInput}
              placeholder="Search experiences…"
              placeholderTextColor={colors.inkFaint}
              value={search}
              onChangeText={setSearch}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={submitSearch}
            />
          ) : (
            <Text style={styles.title}>{nearbyMode ? 'Near you' : (audienceMode ? 'Reconnect' : 'Experiences')}</Text>
          )}
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => (searching ? submitSearch() : setSearching(true))} style={styles.iconBtn}>
              <Image source={ICONS.search} style={styles.hIconImg} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFilter(true)} style={styles.iconBtn}>
              <Image source={ICONS.filter} style={styles.hIconImg} />
              {activeCount > 0 && <View style={styles.dot}><Text style={styles.dotText}>{activeCount}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick tabs — hidden in near-you mode, which just lists everything
            within 20 km. */}
        {nearbyMode ? (
          <View style={styles.nearbyNote}>
            <Image source={ICONS.locWhite || ICONS.search} style={styles.nearbyNoteIcon} />
            <Text style={styles.nearbyNoteText}>Showing experiences within {NEARBY_RADIUS_KM} km of you</Text>
          </View>
        ) : audienceMode ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            <Tab label="All" icon={ICONS.globe} active={!filters.audienceId} onPress={() => setFilters((f) => ({ ...f, audienceId: null }))} />
            {auds.map((a) => (
              <Tab key={a.id} label={a.name} icon={iconForCategory(a.name)} active={filters.audienceId === a.id}
                onPress={() => setFilters((f) => ({ ...f, audienceId: f.audienceId === a.id ? null : a.id }))} />
            ))}
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            <Tab label="All" icon={ICONS.globe} active={!filters.categoryId} onPress={() => setFilters((f) => ({ ...f, categoryId: null }))} />
            {cats.map((c) => (
              <Tab key={c.id} label={c.name} icon={iconForCategory(c.name)} active={filters.categoryId === c.id}
                onPress={() => setFilters((f) => ({ ...f, categoryId: f.categoryId === c.id ? null : c.id }))} />
            ))}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{error}</Text>
          <TouchableOpacity onPress={() => load(filters)}><Text style={styles.retry}>Tap to retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: H_PAD, justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ExperienceCard item={item} variant="grid" style={{ width: COL_W, marginBottom: GAP }} onPress={() => openDetail(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40 }}>{nearbyMode ? '📍' : '🔎'}</Text>
              <Text style={styles.muted}>
                {nearbyMode ? `No experiences within ${NEARBY_RADIUS_KM} km of you yet.` : 'No experiences match your filters.'}
              </Text>
            </View>
          }
        />
      )}

      <FilterSheet
        visible={showFilter}
        taxonomy={taxonomy}
        initial={filters}
        onClose={() => setShowFilter(false)}
        onApply={(draft) => { setFilters((f) => ({ ...draft, q: f.q })); setShowFilter(false); }}
      />
    </View>
  );
}

function Tab({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.8}>
      {!!icon && <Image source={icon} style={[styles.tabIcon, active && styles.tabIconActive]} />}
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 44 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 30, color: colors.ink, marginTop: -4 },
  title: { flex: 1, fontSize: font.h2, fontWeight: '800', color: colors.ink, marginLeft: 4 },
  searchInput: { flex: 1, fontSize: font.h3, color: colors.ink, marginLeft: 4, height: 40 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  hIcon: { fontSize: 18 },
  hIconImg: { width: 22, height: 22, tintColor: colors.ink },
  dot: { position: 'absolute', top: 4, right: 4, backgroundColor: colors.brand, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tabs: { paddingHorizontal: H_PAD, gap: 8, paddingTop: 4 },
  nearbyNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: H_PAD, paddingTop: 6 },
  nearbyNoteIcon: { width: 13, height: 13, tintColor: colors.brand },
  nearbyNoteText: { color: colors.inkMuted, fontSize: font.small, fontWeight: '600' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabIcon: { width: 14, height: 14, tintColor: colors.inkMuted },
  tabIconActive: { tintColor: '#101010' },
  tabText: { color: colors.ink, fontWeight: '600', fontSize: font.small },
  tabTextActive: { color: '#101010', fontWeight: '800' },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  muted: { color: colors.inkMuted, textAlign: 'center' },
  retry: { color: colors.brand, fontWeight: '700' },
});
