import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../theme';
import { api } from '../api/client';
import { useNav } from '../navigation/NavContext';
import AudienceCard, { themeForAudience } from '../components/AudienceCard';
import { ICONS } from '../icons';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 16;
const GAP = 12;
const COL_W = (SCREEN_W - H_PAD * 2 - GAP) / 2;

export default function ReconnectScreen() {
  const insets = useSafeAreaInsets();
  const { pop, push } = useNav();
  const [auds, setAuds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.taxonomy()
      .then((d) => setAuds(d.audiences || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openAudience = (a) => push('experiences', { tagMode: 'audience', initialFilters: { audienceId: a.id } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        {/* Dark header (matches design) */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.back} onPress={pop}><Text style={styles.backIcon}>‹</Text></TouchableOpacity>
            <Image source={ICONS.logoWhite} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.reconnectRow}>
            <View style={styles.heartBadge}><Image source={ICONS.heartFill} style={styles.heartBadgeIcon} /></View>
            <Text style={styles.pillText}>RECONNECT</Text>
          </View>
          <Text style={styles.title}>Who are you reconnecting with?</Text>
          <Text style={styles.subtitle}>We’ll curate the perfect experience for you.</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.grid}>
            {auds.map((a) => (
              <AudienceCard
                key={a.id}
                data={themeForAudience(a)}
                style={{ width: COL_W, marginBottom: GAP }}
                onPress={() => openAudience(a)}
              />
            ))}
          </View>
        )}

        <View style={styles.note}>
          <Text style={styles.noteText}>
            ✨ reconnct curates experiences based on who you’re with — so every moment feels intentional, not just another activity.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#1c2231', paddingHorizontal: H_PAD, paddingBottom: 24, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, marginBottom: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 26, color: '#fff', marginTop: -3 },
  logo: { width: 118, height: 24 },
  reconnectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 22 },
  heartBadge: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  heartBadgeIcon: { width: 18, height: 18, tintColor: '#fff' },
  pillText: { color: colors.brand, fontWeight: '800', fontSize: font.small, letterSpacing: 1 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', fontFamily: 'serif', marginTop: 14, lineHeight: 36 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: font.body, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: H_PAD },
  note: { backgroundColor: colors.surface, marginHorizontal: H_PAD, marginTop: 6, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  noteText: { color: colors.inkMuted, fontSize: font.small, lineHeight: 19 },
});
