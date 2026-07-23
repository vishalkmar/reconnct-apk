import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../theme';
import { api } from '../api/client';
import { categoryAudiences } from '../data/categoryAudiences';
import { ICONS, iconForCategory } from '../icons';

export const PRICE_BANDS = [
  { key: 'under', label: 'Under ₹1,500', sub: 'Budget-friendly', priceMax: 1500 },
  { key: 'mid', label: '₹1,500 – ₹5,000', sub: 'Mid-range', priceMin: 1500, priceMax: 5000 },
  { key: 'premium', label: '₹5,000+', sub: 'Premium', priceMin: 5000 },
];

const AUD_ICON = { partner: '💞', family: '👨‍👩‍👧', friends: '💬', 'kids-and-teens': '☀️', self: '🧘', elders: '🧓', corporate: '🏢' };

// Convert a filter draft into the query params the API understands.
export function draftToParams(draft) {
  const band = PRICE_BANDS.find((b) => b.key === draft.priceBand);
  return {
    audienceId: draft.audienceId || undefined,
    categoryId: draft.categoryId || undefined,
    priceMin: band && band.priceMin != null ? band.priceMin : undefined,
    priceMax: band && band.priceMax != null ? band.priceMax : undefined,
    q: draft.q || undefined,
  };
}

export default function FilterSheet({ visible, taxonomy, initial, onApply, onClose }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initial || {});
  const [count, setCount] = useState(null);

  useEffect(() => { if (visible) setDraft(initial || {}); }, [visible, initial]);

  // Live "Show N experiences" preview.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setCount(null);
    api.listExperiences(draftToParams(draft))
      .then((d) => { if (!cancelled) setCount(d.count); })
      .catch(() => { if (!cancelled) setCount(null); });
    return () => { cancelled = true; };
  }, [draft, visible]);

  const audiences = (taxonomy && taxonomy.audiences) || [];
  const allCategories = (taxonomy && taxonomy.categories) || [];

  // When an audience is picked, show only the categories tagged with it (like
  // the admin form). Lenient: if the taxonomy hasn't shipped category→audience
  // tags yet, show everything so the filter never goes blank.
  const selAud = audiences.find((a) => a.id === draft.audienceId);
  // "All" → every category. A specific audience → only its categories (taxonomy
  // value or the embedded fallback map — same logic as the admin form).
  const categories = (draft.audienceId && selAud)
    ? allCategories.filter((c) => categoryAudiences(c).includes(selAud.slug))
    : allCategories;

  const toggle = (key, val) => setDraft((d) => {
    const next = { ...d, [key]: d[key] === val ? null : val };
    // Changing audience drops a category that no longer fits it.
    if (key === 'audienceId' && next.categoryId) {
      const aud = audiences.find((a) => a.id === next.audienceId);
      const cat = allCategories.find((c) => c.id === next.categoryId);
      if (next.audienceId && aud && cat && !categoryAudiences(cat).includes(aud.slug)) next.categoryId = null;
    }
    return next;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 80 }]}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.headTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Reconnect with (audiences) */}
            {audiences.length > 0 && (
              <>
                <View style={styles.labelRow}><Image source={ICONS.heartFill} style={[styles.labelIcon, { tintColor: colors.brand }]} /><Text style={styles.label}>Reconnect with</Text></View>
                <View style={styles.audGrid}>
                  <TouchableOpacity style={[styles.audCard, !draft.audienceId && styles.audCardSel]} onPress={() => setDraft((d) => ({ ...d, audienceId: null }))} activeOpacity={0.85}>
                    <Image source={ICONS.globe} style={styles.audIconImg} />
                    <Text style={styles.audName} numberOfLines={2}>All</Text>
                  </TouchableOpacity>
                  {audiences.map((a) => {
                    const sel = draft.audienceId === a.id;
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.audCard, sel && styles.audCardSel]}
                        onPress={() => toggle('audienceId', a.id)}
                        activeOpacity={0.85}
                      >
                        <Image source={ICONS.groups} style={styles.audIconImg} />
                        <Text style={styles.audName} numberOfLines={2}>{a.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Category */}
            {categories.length > 0 && (
              <>
                <View style={styles.labelRow}><Image source={ICONS.layers} style={styles.labelIcon} /><Text style={styles.label}>Category</Text></View>
                <View style={styles.chipWrap}>
                  {categories.map((c) => {
                    const sel = draft.categoryId === c.id;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.chip, sel && styles.chipSel]}
                        onPress={() => toggle('categoryId', c.id)}
                        activeOpacity={0.85}
                      >
                        <Image source={iconForCategory(c.name)} style={[styles.chipIcon, sel && styles.chipIconSel]} />
                        <Text style={[styles.chipText, sel && styles.chipTextSel]}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Price */}
            <View style={styles.labelRow}><Image source={ICONS.rupee} style={styles.labelIcon} /><Text style={styles.label}>Price per person</Text></View>
            {PRICE_BANDS.map((b) => {
              const sel = draft.priceBand === b.key;
              return (
                <TouchableOpacity
                  key={b.key}
                  style={[styles.priceRow, sel && styles.priceRowSel]}
                  onPress={() => toggle('priceBand', b.key)}
                  activeOpacity={0.85}
                >
                  <View>
                    <Text style={styles.priceLabel}>{b.label}</Text>
                    <Text style={styles.priceSub}>{b.sub}</Text>
                  </View>
                  <View style={[styles.radio, sel && styles.radioSel]}>
                    {sel && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.clear} onPress={() => setDraft({})}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Apply bar */}
        <View style={[styles.applyBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(draft)} activeOpacity={0.9}>
            <Text style={styles.applyText}>
              ✓  Show {count == null ? '…' : count} experience{count === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: space.xl, paddingTop: 10, maxHeight: '88%',
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headTitle: { fontSize: font.h2, fontWeight: '800', color: colors.ink },
  close: { fontSize: 18, color: colors.inkMuted, padding: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, marginBottom: 10 },
  labelIcon: { width: 18, height: 18, tintColor: colors.ink },
  label: { fontSize: font.h3, fontWeight: '800', color: colors.ink },

  audGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  audCard: {
    width: '47%', minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12,
  },
  audCardSel: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  audIconImg: { width: 20, height: 20, tintColor: colors.inkMuted, flexShrink: 0 },
  audName: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.ink, lineHeight: 17 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipSel: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipIcon: { width: 13, height: 13, tintColor: colors.inkMuted },
  chipIconSel: { tintColor: '#101010' },
  chipText: { color: colors.ink, fontWeight: '600', fontSize: font.small },
  chipTextSel: { color: '#101010', fontWeight: '800' },

  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 10,
  },
  priceRowSel: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  priceLabel: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  priceSub: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.inkFaint, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: colors.brand },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.brand },

  clear: { alignItems: 'center', paddingVertical: 14 },
  clearText: { color: colors.inkMuted, fontWeight: '700' },

  applyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, paddingHorizontal: space.xl, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  applyBtn: { backgroundColor: colors.brand, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#fff', fontSize: font.h3, fontWeight: '800' },
});
