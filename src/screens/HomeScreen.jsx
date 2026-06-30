import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator, RefreshControl, FlatList, TextInput, Image, ImageBackground, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../theme';
import { api } from '../api/client';
import { useAuth } from '../store/AuthContext';
import { useLocation } from '../store/LocationContext';
import { useNav } from '../navigation/NavContext';
import ExperienceCard from '../components/ExperienceCard';
import AudienceCard, { AUDIENCE_CARDS } from '../components/AudienceCard';
import FramedDealCard from '../components/deals/FramedDealCard';
import CleanDealCard from '../components/deals/CleanDealCard';
import OverlayDealCard from '../components/deals/OverlayDealCard';
import TrendingNearbyCard from '../components/deals/TrendingNearbyCard';
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
  const [compact, setCompact] = useState(false); // sticky mini-header on scroll

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
  // Partner-audience experiences for the "Connect With Your Partner" rail.
  const partnerItems = (() => {
    const p = items.filter((e) => (e.audiences || []).some((a) => a.slug === 'partner'));
    return p.length ? p : items.slice(0, 8);
  })();

  // Tapping a Reconnect card opens the Experiences page filtered by that audience.
  const goAudience = (slug) => {
    const match = auds.find((a) => a.slug === slug);
    push('experiences', { tagMode: 'audience', initialFilters: match ? { audienceId: match.id } : {} });
  };

  // One Explore card (audience overlay OR experience).
  const renderMixed = (m) => (m.__aud
    ? <AudienceCard key={'a' + m.__aud.slug} data={m.__aud} style={{ marginBottom: GRID_GAP }} onPress={() => goAudience(m.__aud.slug)} />
    : <ExperienceCard key={'e' + m.__exp.id} item={m.__exp} style={{ marginBottom: GRID_GAP }} onPress={() => openDetail(m.__exp)} />);
  const renderExp = (it) => <ExperienceCard key={it.id} item={it} style={{ marginBottom: GRID_GAP }} onPress={() => openDetail(it)} />;
  // Split a list into two independent columns → masonry (no row-height gaps).
  const evens = (arr) => arr.filter((_, i) => i % 2 === 0);
  const odds = (arr) => arr.filter((_, i) => i % 2 === 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 110 }}
        scrollEventThrottle={16}
        onScroll={(e) => setCompact(e.nativeEvent.contentOffset.y > 150)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* Golden header — scrolls; the hero cards overlap up into its base */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTop}>
            <Image source={ICONS.logoWhite} style={styles.logoImg} resizeMode="contain" />
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.locPill} onPress={() => push('cityPicker')}>
                <Image source={ICONS.locWhite} style={styles.locPinIcon} />
                <Text style={styles.locText}>{city || 'Delhi'} ▾</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => push('notifications')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.bellWrap}>
                <Image source={ICONS.bell} style={styles.bellIcon} />
                <View style={styles.bellDot} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.helloRow}>
            <Image source={ICONS.sparkle} style={styles.helloIcon} />
            <Text style={styles.hello}>{greeting()}, {firstName}</Text>
          </View>
          <Text style={styles.whatsNext}>What’s next?</Text>

          <View style={styles.search}>
            <Image source={ICONS.searchMuted} style={styles.searchIconImg} />
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
              <Image source={ICONS.filter} style={styles.filterIconImg} />
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
              <>
                <View style={styles.masonry}>
                  <View style={styles.col}>{evens(results || []).map(renderExp)}</View>
                  <View style={styles.col}>{odds(results || []).map(renderExp)}</View>
                </View>
                {(results || []).length === 0 && (
                  <Text style={styles.emptyFeat}>No experiences match. Try a different search or filter.</Text>
                )}
              </>
            )}
          </>
        ) : (
          <>
          {/* Two hero cards — pulled up so they overlap the yellow header */}
          <View style={styles.heroRow}>
            <TouchableOpacity activeOpacity={0.9} style={[styles.heroCard, { backgroundColor: colors.reconnectCard }]} onPress={() => push('reconnect')}>
              <View style={[styles.heroIcon, { backgroundColor: colors.reconnectIcon }]}><Image source={ICONS.groups} style={[styles.heroGlyph, { tintColor: '#13402F' }]} /></View>
              <Text style={styles.heroTitle}>Who do you want to reconnect with?</Text>
              <Text style={styles.heroSub}>Find experiences for the people who matter most.</Text>
              <View style={styles.heroChips}>
                {['Partner', 'Family', 'Friends', 'Kids'].map((c) => (
                  <View key={c} style={styles.heroChip}><Text style={styles.heroChipText}>{c}</Text></View>
                ))}
              </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} style={[styles.heroCard, { backgroundColor: colors.experiencesCard }]} onPress={() => navigateTab('experiences')}>
              <View style={[styles.heroIcon, { backgroundColor: colors.experiencesIcon }]}><Image source={ICONS.compass} style={[styles.heroGlyph, { tintColor: '#2A2A6B' }]} /></View>
              <Text style={styles.heroTitle}>What do you want to experience?</Text>
              <Text style={styles.heroSub}>Explore unforgettable activities worldwide.</Text>
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

          <View style={styles.sectionHead}>
            <SectionTitle icon={ICONS.globe} title="Explore" />
          </View>

          {loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={load}><Text style={styles.retry}>Tap to retry</Text></TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.masonry}>
                <View style={styles.col}>{evens(gridMixed).map(renderMixed)}</View>
                <View style={styles.col}>{odds(gridMixed).map(renderMixed)}</View>
              </View>

              <TouchableOpacity style={styles.exploreMore} onPress={() => navigateTab('experiences')} activeOpacity={0.9}>
                <Text style={styles.exploreMoreText}>Explore more  →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Featured */}
          <View style={styles.sectionHead}>
            <SectionTitle icon={ICONS.sparkle} title="Featured Experiences" />
            <TouchableOpacity onPress={() => navigateTab('experiences')}><Text style={styles.seeAll}>See all ›</Text></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catTabs}>
            <CatTab label="All" icon={ICONS.globe} active={!activeCat} onPress={() => setActiveCat(null)} />
            {cats.map((c) => <CatTab key={c.id} label={c.name} icon={ICONS.tag} active={activeCat === c.id} onPress={() => setActiveCat(c.id)} />)}
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

          {/* Last Minute Deals */}
          {items.length > 0 && (
            <>
              <DealRail
                title="Last Minute Deals 1"
                data={items.slice(0, 10)}
                kind="framed"
                cardGap={12}
                onSeeAll={() => navigateTab('experiences')}
                onPressItem={openDetail}
              />
              <FocusDealSection
                data={items.slice(1, 11)}
                onSeeAll={() => navigateTab('experiences')}
                onPressItem={openDetail}
              />
            </>
          )}

          {/* Connect With Your Partner */}
          {partnerItems.length > 0 && (
            <PartnerDealSection
              data={partnerItems.slice(0, 10)}
              onPressItem={openDetail}
            />
          )}

          {items.length > 0 && (
            <>
              <DealRail
                title="Last Minute Deals 3"
                data={items.slice(2, 12)}
                kind="clean"
                cardGap={14}
                onSeeAll={() => navigateTab('experiences')}
                onPressItem={openDetail}
              />
              <DealRail
                title="Last Minute Deals 4"
                data={items.slice(1, 11)}
                kind="overlay"
                cardW={270}
                cardH={290}
                cardGap={14}
                onSeeAll={() => navigateTab('experiences')}
                onPressItem={openDetail}
              />
              <DealRail
                title="Last Minute Deals 5"
                data={items.slice(3, 13)}
                kind="framed"
                cardW={270}
                cardImageH={186}
                cardGap={14}
                onSeeAll={() => navigateTab('experiences')}
                onPressItem={openDetail}
              />
              <TrendingNearbySection
                data={items.slice(0, 12)}
                onSeeAll={() => navigateTab('experiences')}
                onPressItem={openDetail}
              />
            </>
          )}
          </>
        )}
      </ScrollView>

      {/* Sticky compact header — appears once you scroll past the hero */}
      {compact && !isSearching && (
        <View style={[styles.sticky, { paddingTop: insets.top + 6 }]}>
          <Image source={ICONS.logoWhite} style={styles.stickyLogo} resizeMode="contain" />
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.stickyPill} onPress={() => push('cityPicker')}>
            <Image source={ICONS.locGray} style={styles.stickyPin} />
            <Text style={styles.stickyPillText}>{city || 'Delhi'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stickyCircle} onPress={() => navigateTab('search')}>
            <Image source={ICONS.searchMuted} style={styles.stickyCircleIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.stickyCircle} onPress={() => push('notifications')}>
            <Image source={ICONS.bell} style={styles.stickyCircleIcon} />
            <View style={styles.stickyDot} />
          </TouchableOpacity>
        </View>
      )}

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

function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Image source={icon} style={styles.sectionTitleIcon} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// Picks the right separated card component for the rail kind.
function RailCard({ kind, item, onPress, cardW, cardImageH, cardH }) {
  if (kind === 'clean') return <CleanDealCard item={item} onPress={onPress} />;
  if (kind === 'overlay') return <OverlayDealCard item={item} width={cardW} height={cardH} onPress={onPress} />;
  return <FramedDealCard item={item} width={cardW} imageH={cardImageH} onPress={onPress} />;
}

function DealRail({ title, data, kind = 'framed', cardGap = 12, cardW, cardImageH, cardH, onSeeAll, onPressItem }) {
  return (
    <>
      <View style={styles.sectionHead}>
        <SectionTitle icon={ICONS.sparkle} title={title} />
        <TouchableOpacity onPress={onSeeAll}><Text style={styles.seeAll}>See all ›</Text></TouchableOpacity>
      </View>
      <FlatList
        data={data}
        horizontal
        keyExtractor={(it, idx) => `${kind}-${it.id || idx}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.dealRail, { gap: cardGap }]}
        renderItem={({ item }) => <RailCard kind={kind} item={item} cardW={cardW} cardImageH={cardImageH} cardH={cardH} onPress={() => onPressItem(item)} />}
      />
    </>
  );
}

// "Connect With Your Partner" — full-width section on a lavender→blue→navy
// gradient (Figma #F5F3FF → #305BA4 → #1A1A2E), serif heading + tilted polaroids,
// then a slidable rail of cards (180 wide, 160×160 square image).
function PartnerDealSection({ data, onPressItem }) {
  return (
    <ImageBackground source={ICONS.partnerGrad} style={styles.partnerSection} imageStyle={styles.partnerGradImg} resizeMode="stretch">
      <View style={styles.partnerHead}>
        <Text style={styles.partnerTitle}>Connect With Your{'\n'}Partner</Text>
        <View style={styles.polaroids}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80' }} style={[styles.polaroid, { transform: [{ rotate: '-8deg' }] }]} />
          <Image source={{ uri: 'https://images.unsplash.com/photo-1503104834685-7205e8607eb9?w=300&q=80' }} style={[styles.polaroid, styles.polaroid2, { transform: [{ rotate: '7deg' }] }]} />
        </View>
      </View>
      <FlatList
        data={data}
        horizontal
        keyExtractor={(it, idx) => `partner-${it.id || idx}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.partnerRail}
        renderItem={({ item }) => <FramedDealCard item={item} width={180} imageH={160} onPress={() => onPressItem(item)} />}
      />
    </ImageBackground>
  );
}

// Featured "Last Minute Deals" — a centre-focus carousel: the middle card sits
// forward (full size, elevated) while its neighbours peek behind it, dimmed and
// scaled down. Sliding brings the next card to the front and pushes the current
// one back. Card size/style stay the Figma spec (195 wide, image 166).
const FOCUS_CARD_W = 195;
const FOCUS_CARD_H = 274;
const FOCUS_GAP = 16;
const FOCUS_SNAP = FOCUS_CARD_W + FOCUS_GAP;
const FOCUS_SIDE = Math.max(16, (SCREEN_W - FOCUS_CARD_W) / 2);

function FocusDealSection({ data, onSeeAll, onPressItem }) {
  if (!data.length) return null;
  const scrollX = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(0);

  return (
    <>
      <View style={styles.sectionHead}>
        <SectionTitle icon={ICONS.sparkle} title="Last Minute Deals 2" />
        <TouchableOpacity onPress={onSeeAll}><Text style={styles.seeAll}>See all ›</Text></TouchableOpacity>
      </View>
      <Animated.FlatList
        data={data}
        horizontal
        keyExtractor={(it, idx) => `focus-${it.id || idx}`}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={FOCUS_SNAP}
        snapToAlignment="start"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: FOCUS_SIDE, paddingVertical: 8 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
            listener: (e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / FOCUS_SNAP);
              if (idx !== active) setActive(idx);
            },
          },
        )}
        renderItem={({ item, index }) => {
          const inputRange = [(index - 1) * FOCUS_SNAP, index * FOCUS_SNAP, (index + 1) * FOCUS_SNAP];
          // Centre card sits forward (full size + on top); neighbours scale down
          // and are pulled IN behind it — they tuck under the centre card (no gap
          // between them) which leaves the empty margin on the screen edges.
          const scale = scrollX.interpolate({ inputRange, outputRange: [0.84, 1, 0.84], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
          const translateX = scrollX.interpolate({ inputRange, outputRange: [-34, 0, 34], extrapolate: 'clamp' });
          const isActive = index === active;
          return (
            <Animated.View style={[
              styles.focusItem,
              { transform: [{ translateX }, { scale }], opacity, zIndex: isActive ? 30 : 10, elevation: isActive ? 14 : 2 },
            ]}>
              <FramedDealCard item={item} width={FOCUS_CARD_W} imageH={166} height={FOCUS_CARD_H} onPress={() => onPressItem(item)} />
            </Animated.View>
          );
        }}
      />
    </>
  );
}

// "Trending Nearby" — horizontal carousel of white container cards; each card
// holds 3 stacked row-items. The next card peeks on the side (Figma spec).
const TREND_CARD_W = 330;
function TrendingNearbySection({ data, onSeeAll, onPressItem }) {
  if (!data.length) return null;
  const groups = [];
  for (let i = 0; i < data.length; i += 3) groups.push(data.slice(i, i + 3));
  return (
    <FlatList
      data={groups}
      horizontal
      keyExtractor={(g, i) => `trend-${i}`}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={TREND_CARD_W + 14}
      snapToAlignment="start"
      contentContainerStyle={{ paddingHorizontal: H_PAD, gap: 14, paddingTop: 8, paddingBottom: 4 }}
      renderItem={({ item: group }) => (
        <TrendingNearbyCard group={group} count={data.length} onSeeAll={onSeeAll} onPressItem={onPressItem} />
      )}
    />
  );
}

function CatTab({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.catTab, active && styles.catTabActive]} activeOpacity={0.8}>
      {!!icon && <Image source={icon} style={[styles.catTabIcon, active && styles.catTabIconActive]} />}
      <Text style={[styles.catTabText, active && styles.catTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brand, paddingHorizontal: H_PAD, paddingBottom: 100,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
  },
  sticky: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: H_PAD, paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stickyLogo: { width: 110, height: 22, tintColor: colors.brand },
  stickyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandSoft, paddingHorizontal: 10, height: 34, borderRadius: radius.pill },
  stickyPin: { width: 13, height: 13, tintColor: colors.brandDark },
  stickyPillText: { color: colors.brandText, fontSize: font.small, fontWeight: '700' },
  stickyCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  stickyCircleIcon: { width: 18, height: 18, tintColor: colors.brandDark },
  stickyDot: { position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 24, fontWeight: '800', color: '#fff' },
  logoImg: { width: 132, height: 26 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  locPinIcon: { width: 13, height: 13 },
  locText: { color: '#fff', fontSize: font.small, fontWeight: '700' },
  bellWrap: { padding: 2 },
  bellIcon: { width: 22, height: 22, tintColor: '#fff' },
  bellDot: { position: 'absolute', top: 0, right: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: colors.brand },
  helloRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  helloIcon: { width: 15, height: 15, tintColor: '#FFFFFF', marginRight: 7 },
  hello: { color: '#fff', fontSize: 15, opacity: 0.95, fontWeight: '500' },
  whatsNext: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 6, letterSpacing: 0.2 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.pill, paddingLeft: 16, paddingRight: 6, height: 52, marginTop: 20 },
  searchIconImg: { width: 16, height: 16, marginRight: 8, tintColor: colors.inkFaint },
  searchInput: { flex: 1, color: colors.ink, fontSize: font.body, paddingVertical: 0 },
  clearX: { color: colors.inkFaint, fontSize: 14, paddingHorizontal: 6 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brandSoft, paddingHorizontal: 12, height: 36, borderRadius: radius.pill },
  filterIconImg: { width: 15, height: 15, tintColor: colors.brandText },
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
  heroCard: { flex: 1, borderRadius: radius.lg, padding: 16, minHeight: 215 },
  heroIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroGlyph: { width: 24, height: 24 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 23 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12.5, marginTop: 6, lineHeight: 17 },
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
  partnerSection: {
    marginTop: 28,
    paddingTop: 22,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  partnerGradImg: {},
  partnerHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 },
  partnerTitle: { fontSize: 23, fontWeight: '900', color: '#1A1A2E', fontFamily: 'serif', lineHeight: 28 },
  polaroids: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  polaroid: { width: 61, height: 70, borderRadius: 4, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#D9D9D9', ...shadow.card },
  polaroid2: { marginLeft: -18 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 24 },
  sectionTitleIcon: { width: 16, height: 16, tintColor: colors.brand, marginRight: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#242235', fontFamily: 'serif' },
  seeAll: { color: colors.brand, fontWeight: '800', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: H_PAD },
  masonry: { flexDirection: 'row', paddingHorizontal: H_PAD, gap: GRID_GAP },
  col: { flex: 1 },
  dealRail: { paddingHorizontal: H_PAD, paddingTop: 4 },
  focusItem: {
    width: FOCUS_CARD_W,
    marginRight: FOCUS_GAP,
    shadowColor: '#0B1020',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  partnerRail: { paddingHorizontal: H_PAD, gap: 10 },
  focusWrap: {
    height: 312,
    marginHorizontal: H_PAD,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  focusCenter: {
    position: 'absolute',
    zIndex: 3,
    transform: [{ scale: 1 }],
  },
  focusSideLeft: {
    position: 'absolute',
    left: -8,
    zIndex: 1,
    transform: [{ scale: 0.92 }],
  },
  focusSideRight: {
    position: 'absolute',
    right: -8,
    zIndex: 1,
    transform: [{ scale: 0.92 }],
  },

  exploreMore: { marginHorizontal: H_PAD, marginTop: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.brand, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', ...shadow.card },
  exploreMoreText: { color: colors.brand, fontWeight: '800', fontSize: font.h3 },

  catTabs: { paddingHorizontal: H_PAD, gap: 8, paddingBottom: 4 },
  catTab: { flexDirection: 'row', paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  catTabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  catTabIcon: { width: 13, height: 13, tintColor: colors.inkMuted, marginRight: 6 },
  catTabIconActive: { tintColor: '#fff' },
  catTabText: { color: colors.ink, fontWeight: '600', fontSize: font.small },
  catTabTextActive: { color: '#fff' },

  errorBox: { padding: 24, alignItems: 'center' },
  errorText: { color: colors.inkMuted, textAlign: 'center' },
  retry: { color: colors.brand, fontWeight: '700', marginTop: 8 },
  emptyFeat: { color: colors.inkMuted, paddingHorizontal: H_PAD, paddingVertical: 20 },
});
