import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, RefreshControl, FlatList, TextInput, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../theme';
import { api } from '../api/client';
import { useAuth } from '../store/AuthContext';
import { useLocation } from '../store/LocationContext';
import { useNav } from '../navigation/NavContext';
import ExperienceCard from '../components/ExperienceCard';
import AudienceCard, { AUDIENCE_CARDS } from '../components/AudienceCard';
import OfferBannerCarousel from '../components/OfferBannerCarousel';
import FilterSheet, { draftToParams } from './FilterSheet';
import { ICONS } from '../icons';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 16;
const GRID_GAP = 12;
const COL_W = (SCREEN_W - H_PAD * 2 - GRID_GAP) / 2;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { city, selectedCity, coords, detectedCity } = useLocation();
  const { push, navigateTab } = useNav();

  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [cats, setCats] = useState([]);
  const [auds, setAuds] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // In-place search + filter
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [showFilter, setShowFilter] = useState(false);
  const [results, setResults] = useState(null);
  const [searchingBusy, setSearchingBusy] = useState(false);
  const [geoDismissed, setGeoDismissed] = useState(false);

  const geoParams = coords ? { lat: coords.lat, lon: coords.lon } : {};

  const load = useCallback(async () => {
    setError('');
    try {
      const [list, feat, tax] = await Promise.all([
        // Only hard-filter when the user explicitly picks a city; otherwise show
        // everything (nearest-first) so the demo data isn't emptied out.
        api.listExperiences({ ...geoParams, city: selectedCity || undefined }),
        api.listExperiences({ featured: 1 }),
        api.taxonomy(),
      ]);
      setItems(list.items || []);
      const f = (feat.items && feat.items.length) ? feat.items : (list.items || []).slice(0, 8);
      setFeatured(f);
      setCats(tax.categories || []);
      setAuds(tax.audiences || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, coords && coords.lat]);

  useEffect(() => { load(); }, [load]);

  const hasActiveFilters = !!(filters.audienceId || filters.categoryId || filters.priceBand);
  const isSearching = query.trim().length > 0 || hasActiveFilters;

  // Debounced in-place search/filter.
  useEffect(() => {
    if (!isSearching) { setResults(null); return; }
    let alive = true;
    setSearchingBusy(true);
    const t = setTimeout(() => {
      api.listExperiences({ ...draftToParams(filters), q: query.trim() || undefined, ...geoParams })
        .then((d) => { if (alive) setResults(d.items || []); })
        .catch(() => { if (alive) setResults([]); })
        .finally(() => { if (alive) setSearchingBusy(false); });
    }, 350);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters, isSearching]);

  const onRefresh = () => { setRefreshing(true); load(); };
  const firstName = (user && user.name) ? user.name.split(' ')[0] : 'there';
  const openDetail = (item) => push('detail', { idOrSlug: item.slug || item.id });

  // Explore = a 2-col grid where every row pairs ONE overlay audience card with
  // ONE experience card, and the audience card alternates left/right each row.
  const mixed = [];
  let ei = 0;
  AUDIENCE_CARDS.forEach((aud, r) => {
    if (r % 2 === 0) {
      mixed.push({ __aud: aud });
      if (items[ei]) mixed.push({ __exp: items[ei++] });
    } else {
      if (items[ei]) mixed.push({ __exp: items[ei++] });
      mixed.push({ __aud: aud });
    }
  });
  while (ei < items.length) mixed.push({ __exp: items[ei++] });
  const gridMixed = mixed.slice(0, 12);
  const featShown = activeCat ? featured.filter((e) => e.category && e.category.id === activeCat) : featured;

  // Tapping a Reconnect card opens the Experiences page filtered by that audience.
  const goAudience = (slug) => {
    const match = auds.find((a) => a.slug === slug);
    push('experiences', { tagMode: 'audience', initialFilters: match ? { audienceId: match.id } : {} });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* Golden header — scrolls; the hero cards overlap up into its base */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>reconnct</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.locPill} onPress={() => push('cityPicker')}>
                <Image source={ICONS.locWhite} style={styles.locPinIcon} />
                <Text style={styles.locText}>{city || 'Delhi'} ▾</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => push('notifications')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.bell}>🔔</Text>
                <View style={styles.bellDot} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.hello}>☀️  {greeting()}, {firstName}</Text>
          <Text style={styles.whatsNext}>What’s next?</Text>

          <View style={styles.search}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Experiences, destinations…"
              placeholderTextColor={colors.inkFaint}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}><Text style={styles.clearX}>✕</Text></TouchableOpacity>
            )}
            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter(true)}>
              <Text style={styles.filterIcon}>≡</Text>
              <Text style={styles.filterLabel}>Filter</Text>
              {hasActiveFilters && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {isSearching ? (
          <>
            <View style={styles.resultsHead}>
              <Text style={styles.sectionTitle}>{searchingBusy ? 'Searching…' : `${(results || []).length} result${(results || []).length === 1 ? '' : 's'}`}</Text>
              <TouchableOpacity onPress={() => { setQuery(''); setFilters({}); }}><Text style={styles.clearAll}>Clear</Text></TouchableOpacity>
            </View>
            {searchingBusy && !results ? (
              <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.grid}>
                {(results || []).map((it) => (
                  <ExperienceCard key={it.id} item={it} style={{ width: COL_W, marginBottom: GRID_GAP }} onPress={() => openDetail(it)} />
                ))}
                {(results || []).length === 0 && (
                  <Text style={styles.emptyFeat}>No experiences match. Try a different search or filter.</Text>
                )}
              </View>
            )}
          </>
        ) : (
          <>
          {/* Two hero cards — pulled up so they overlap the yellow header */}
          <View style={styles.heroRow}>
            <TouchableOpacity activeOpacity={0.9} style={[styles.heroCard, { backgroundColor: colors.reconnectCard }]} onPress={() => push('experiences', { tagMode: 'audience' })}>
              <View style={styles.heroIcon}><Text style={{ fontSize: 18 }}>💛</Text></View>
              <Text style={styles.heroTitle}>Reconnect</Text>
              <Text style={styles.heroSub}>For people who matter most</Text>
              <View style={styles.heroChips}>
                {['Partner', 'Family', 'Friends', 'Kids'].map((c) => (
                  <View key={c} style={styles.heroChip}><Text style={styles.heroChipText}>{c}</Text></View>
                ))}
              </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} style={[styles.heroCard, { backgroundColor: colors.experiencesCard }]} onPress={() => navigateTab('experiences')}>
              <View style={styles.heroIcon}><Text style={{ fontSize: 18 }}>🧭</Text></View>
              <Text style={styles.heroTitle}>Experiences</Text>
              <Text style={styles.heroSub}>Explore activities worldwide</Text>
              <View style={styles.heroChips}>
                {['Adventure', 'Cultural', 'Food', 'Nature'].map((c) => (
                  <View key={c} style={styles.heroChip}><Text style={styles.heroChipText}>{c}</Text></View>
                ))}
              </View>
            </TouchableOpacity>
          </View>

          {/* You're here — dismissible tooltip */}
          {!!detectedCity && !geoDismissed && (
            <View style={styles.geoBanner}>
              <View style={styles.geoIconWrap}><Image source={ICONS.locMuted} style={styles.geoPin} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.geoTitle}>You’re in {detectedCity}</Text>
                <Text style={styles.geoText}>Showing experiences nearby you first.</Text>
              </View>
              <TouchableOpacity onPress={() => setGeoDismissed(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.geoClose}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Offer banners — auto-sliding carousel (admin-managed) */}
          <View style={{ marginTop: 6 }}><OfferBannerCarousel /></View>

          <View style={styles.sectionHead}><Text style={styles.sectionTitle}>🌐 Explore</Text></View>

          {loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={load}><Text style={styles.retry}>Tap to retry</Text></TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.grid}>
                {gridMixed.map((m) => (
                  m.__aud
                    ? <AudienceCard key={'a' + m.__aud.slug} data={m.__aud} style={{ width: COL_W, marginBottom: GRID_GAP }} onPress={() => goAudience(m.__aud.slug)} />
                    : <ExperienceCard key={'e' + m.__exp.id} item={m.__exp} style={{ width: COL_W, marginBottom: GRID_GAP }} onPress={() => openDetail(m.__exp)} />
                ))}
              </View>

              <TouchableOpacity style={styles.exploreMore} onPress={() => navigateTab('experiences')} activeOpacity={0.9}>
                <Text style={styles.exploreMoreText}>Explore more  →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Featured */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>✨ Featured Experiences</Text>
            <TouchableOpacity onPress={() => navigateTab('experiences')}><Text style={styles.seeAll}>See all ›</Text></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catTabs}>
            <CatTab label="All" active={!activeCat} onPress={() => setActiveCat(null)} />
            {cats.map((c) => <CatTab key={c.id} label={c.name} active={activeCat === c.id} onPress={() => setActiveCat(c.id)} />)}
          </ScrollView>

          <FlatList
            data={featShown}
            horizontal
            keyExtractor={(it) => 'f' + it.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: H_PAD, gap: GRID_GAP, paddingTop: 4 }}
            renderItem={({ item }) => <ExperienceCard item={item} variant="grid" style={{ width: COL_W }} onPress={() => openDetail(item)} />}
            ListEmptyComponent={<Text style={styles.emptyFeat}>No featured experiences yet.</Text>}
          />
          </>
        )}
      </ScrollView>

      <FilterSheet
        visible={showFilter}
        taxonomy={{ categories: cats, audiences: auds }}
        initial={filters}
        onClose={() => setShowFilter(false)}
        onApply={(draft) => { setFilters(draft); setShowFilter(false); }}
      />
    </View>
  );
}

function CatTab({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.catTab, active && styles.catTabActive]} activeOpacity={0.8}>
      <Text style={[styles.catTabText, active && styles.catTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brand, paddingHorizontal: H_PAD, paddingBottom: 100,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  locPinIcon: { width: 13, height: 13 },
  locText: { color: '#fff', fontSize: font.small, fontWeight: '700' },
  bell: { fontSize: 18 },
  bellDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  hello: { color: '#fff', fontSize: font.body, marginTop: 10, opacity: 0.95 },
  whatsNext: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.pill, paddingLeft: 16, paddingRight: 6, height: 48, marginTop: 14 },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, color: colors.ink, fontSize: font.body, paddingVertical: 0 },
  clearX: { color: colors.inkFaint, fontSize: 14, paddingHorizontal: 6 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandSoft, paddingHorizontal: 12, height: 36, borderRadius: radius.pill },
  filterIcon: { color: colors.brandText, fontSize: 16, fontWeight: '900' },
  filterLabel: { color: colors.brandText, fontWeight: '800', fontSize: font.small },
  filterDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand, marginLeft: 2 },

  geoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, marginHorizontal: H_PAD, marginTop: 16, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brandSoft, ...shadow.card },
  geoIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  geoPin: { width: 18, height: 18 },
  geoTitle: { color: colors.ink, fontSize: font.body, fontWeight: '800' },
  geoText: { color: colors.inkMuted, fontSize: font.small, marginTop: 1 },
  geoClose: { color: colors.inkFaint, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },

  resultsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 8 },
  clearAll: { color: colors.brand, fontWeight: '700' },

  heroRow: { flexDirection: 'row', gap: GRID_GAP, paddingHorizontal: H_PAD, marginTop: -38 },
  heroCard: { flex: 1, borderRadius: radius.lg, padding: 14, minHeight: 148 },
  heroIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroTitle: { color: '#fff', fontSize: font.h2, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: font.small, marginTop: 3 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  heroChip: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.sm },
  heroChipText: { color: '#fff', fontSize: font.tiny, fontWeight: '600' },

  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBD38D', marginHorizontal: H_PAD, marginTop: 16, borderRadius: radius.lg, padding: 16, overflow: 'hidden' },
  bannerTag: { backgroundColor: colors.brandDark, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  bannerTagText: { color: '#fff', fontSize: font.tiny, fontWeight: '800' },
  bannerTitle: { fontSize: font.h3, fontWeight: '900', color: '#7A4E00', marginTop: 8 },
  bannerSub: { fontSize: font.small, color: '#8A5A00', marginTop: 2 },
  bannerBtn: { backgroundColor: colors.brandDark, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, marginTop: 10 },
  bannerBtnText: { color: '#fff', fontWeight: '800', fontSize: font.tiny },
  bannerEmoji: { fontSize: 56, marginLeft: 8 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: font.h2, fontWeight: '800', color: colors.ink },
  seeAll: { color: colors.brand, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: H_PAD },

  exploreMore: { marginHorizontal: H_PAD, marginTop: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.brand, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', ...shadow.card },
  exploreMoreText: { color: colors.brand, fontWeight: '800', fontSize: font.h3 },

  catTabs: { paddingHorizontal: H_PAD, gap: 8, paddingBottom: 4 },
  catTab: { paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  catTabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  catTabText: { color: colors.ink, fontWeight: '600', fontSize: font.small },
  catTabTextActive: { color: '#fff' },

  errorBox: { padding: 24, alignItems: 'center' },
  errorText: { color: colors.inkMuted, textAlign: 'center' },
  retry: { color: colors.brand, fontWeight: '700', marginTop: 8 },
  emptyFeat: { color: colors.inkMuted, paddingHorizontal: H_PAD, paddingVertical: 20 },
});
