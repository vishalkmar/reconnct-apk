import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { colors, radius, font } from '../../theme';
import { api } from '../../api/client';
import { categoryAudiences } from '../../data/categoryAudiences';
import { iconForCategory } from '../../icons';

/**
 * The Reconnct experience cascade, mirroring the website admin picker:
 *   1. Who is this for?  — audiences multi-select (+ "All")
 *   2. Broad category    — multi-select, FILTERED by the chosen audience(s)
 *   3. Type               — dependent multi-select, the UNION of types across
 *                           every selected category
 *
 * Read-only against the platform's shared taxonomy (same as the website's
 * host wizard) — a host tags their listing with existing categories/types,
 * but adding brand-new global taxonomy entries stays an admin-only action.
 *
 * Controlled: value = { audiences:number[], categoryIds:number[], typeIds:number[] }
 * and onChange(patch).
 */
export default function TaxonomyPicker({ value, onChange }) {
  const audiences = value?.audiences || [];
  const categoryIds = value?.categoryIds || [];
  const typeIds = value?.typeIds || [];

  const [audienceList, setAudienceList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [typeList, setTypeList] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  useEffect(() => {
    api.taxonomy()
      .then((d) => { setAudienceList(d.audiences || []); setCategoryList(d.categories || []); })
      .catch(() => {});
  }, []);

  // Union of types across every selected category.
  const loadTypes = useCallback((catIds) => {
    if (!catIds.length) { setTypeList([]); return; }
    setLoadingTypes(true);
    api.types(catIds)
      .then((d) => setTypeList(d.types || []))
      .catch(() => setTypeList([]))
      .finally(() => setLoadingTypes(false));
  }, []);

  useEffect(() => { loadTypes(categoryIds); }, [categoryIds.join(','), loadTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audience filtering — "All" (none selected) shows every category; otherwise
  // only categories tagged with a selected audience. Mirrors the website.
  const selectedSlugs = audienceList.filter((a) => audiences.includes(a.id)).map((a) => a.slug);
  const filteredCategories = audiences.length === 0
    ? categoryList
    : categoryList.filter((c) => {
        const tags = categoryAudiences(c);
        return tags.length > 0 && tags.some((s) => selectedSlugs.includes(s));
      });

  const toggleAudience = (id) => {
    const next = audiences.includes(id) ? audiences.filter((x) => x !== id) : [...audiences, id];
    onChange({ audiences: next });
  };

  const toggleCategory = (id) => {
    const next = categoryIds.includes(id) ? categoryIds.filter((x) => x !== id) : [...categoryIds, id];
    // Dropping a category also drops any selected type that belonged only to it.
    const nextTypeIds = categoryIds.includes(id)
      ? typeIds.filter((tid) => {
        const t = typeList.find((x) => x.id === tid);
        return t ? next.includes(t.categoryId) : true;
      })
      : typeIds;
    onChange({ categoryIds: next, typeIds: nextTypeIds });
  };

  const toggleType = (id) => {
    const next = typeIds.includes(id) ? typeIds.filter((x) => x !== id) : [...typeIds, id];
    onChange({ typeIds: next });
  };

  return (
    <View style={{ gap: 22 }}>
      {/* 1) Audiences */}
      <Section title="Who is this for?" hint="Pick “All”, or one or more groups — the categories below filter to match.">
        <Chips>
          <Chip active={audiences.length === 0} onPress={() => onChange({ audiences: [] })}>All</Chip>
          {audienceList.map((a) => (
            <Chip key={a.id} active={audiences.includes(a.id)} onPress={() => toggleAudience(a.id)}>{a.name}</Chip>
          ))}
        </Chips>
      </Section>

      {/* 2) Broad category — multi */}
      <Section title="Broad category" hint={audiences.length === 0 ? 'Pick one or more — the type list below fills from all of them.' : 'Showing categories for the selected audience(s).'}>
        {filteredCategories.length === 0 ? (
          <Text style={styles.empty}>No categories for this audience yet.</Text>
        ) : (
          <Chips>
            {filteredCategories.map((c) => (
              <Chip key={c.id} active={categoryIds.includes(c.id)} icon={iconForCategory(c.name)} onPress={() => toggleCategory(c.id)}>{c.name}</Chip>
            ))}
          </Chips>
        )}
      </Section>

      {/* 3) Type — dependent multi, union across every selected category */}
      <Section title="Type of activity / event" hint={categoryIds.length ? 'Pick one or more specific types.' : 'Select a broad category first.'}>
        {!categoryIds.length ? (
          <Text style={styles.empty}>Choose a broad category above to see its types.</Text>
        ) : loadingTypes ? (
          <View style={styles.loadingRow}><ActivityIndicator size="small" color={colors.brand} /><Text style={styles.loadingText}>Loading types…</Text></View>
        ) : (
          <Chips>
            {typeList.map((t) => (
              <Chip key={t.id} active={typeIds.includes(t.id)} onPress={() => toggleType(t.id)}>{t.name}</Chip>
            ))}
            {typeList.length === 0 && <Text style={styles.empty}>No types for this category yet.</Text>}
          </Chips>
        )}
      </Section>
    </View>
  );
}

function Section({ title, hint, children }) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      {children}
    </View>
  );
}
function Chips({ children }) { return <View style={styles.chips}>{children}</View>; }
function Chip({ active, onPress, children, icon }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.chip, active && styles.chipActive]}>
      {!!icon && <Image source={icon} style={[styles.chipIcon, active && styles.chipIconActive]} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  hint: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 3, marginBottom: 10 },
  empty: { fontSize: font.small, color: colors.inkMuted, fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipIcon: { width: 15, height: 15, tintColor: '#888899' },
  chipIconActive: { tintColor: '#101010' },
  chipText: { fontSize: font.small, fontWeight: '700', color: colors.ink },
  chipTextActive: { color: '#101010' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: font.small, color: colors.inkMuted },
});
