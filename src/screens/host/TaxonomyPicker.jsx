import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { colors, radius, font } from '../../theme';
import { api } from '../../api/client';
import { categoryAudiences } from '../../data/categoryAudiences';
import { typesForCategorySlug } from '../../data/categoryTypes';
import { ICONS, iconForCategory } from '../../icons';

/**
 * The Reconnct experience cascade, mirroring the website admin picker:
 *   1. Who is this for?  — audiences multi-select (+ "All")
 *   2. Broad category    — single-select, FILTERED by the chosen audience(s)
 *   3. Type              — single-select, filled from the chosen category
 *
 * Each level supports "+ Add custom" (kept client-side here for phase-1 — a
 * custom category/type is selectable immediately without a round-trip).
 *
 * Controlled: value = { audiences:number[], categoryId, typeId, typeName } and
 * onChange(patch).
 */
export default function TaxonomyPicker({ value, onChange }) {
  const audiences = value?.audiences || [];
  const { categoryId = null, typeId = null } = value || {};

  const [audienceList, setAudienceList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [customCats, setCustomCats] = useState([]);
  const [typeList, setTypeList] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  useEffect(() => {
    api.taxonomy()
      .then((d) => { setAudienceList(d.audiences || []); setCategoryList(d.categories || []); })
      .catch(() => {});
  }, []);

  const loadTypes = useCallback((catId) => {
    if (!catId || String(catId).startsWith('custom')) { setTypeList([]); return; }
    setLoadingTypes(true);
    api.types(catId)
      .then((d) => setTypeList(d.types || []))
      .catch(() => setTypeList([]))
      .finally(() => setLoadingTypes(false));
  }, []);

  useEffect(() => { loadTypes(categoryId); }, [categoryId, loadTypes]);

  // Audience filtering — "All" (none selected) shows every category; otherwise
  // only categories tagged with a selected audience (taxonomy tag wins, else the
  // embedded map). Mirrors the website's strict filter.
  const selectedSlugs = audienceList.filter((a) => audiences.includes(a.id)).map((a) => a.slug);
  const allCats = [...categoryList, ...customCats];
  const filteredCategories = audiences.length === 0
    ? allCats
    : allCats.filter((c) => {
        const tags = categoryAudiences(c);
        return tags.length > 0 && tags.some((s) => selectedSlugs.includes(s));
      });

  const toggleAudience = (id) => {
    const next = audiences.includes(id) ? audiences.filter((x) => x !== id) : [...audiences, id];
    onChange({ audiences: next, categoryId: null, typeId: null, typeName: '' });
  };

  const pickCategory = (id) => {
    if (id === categoryId) return;
    onChange({ categoryId: id, typeId: null, typeName: '' });
  };

  // Preset types come from the backend; if that endpoint isn't reachable yet
  // (not deployed), fall back to the embedded category→types map so the Type
  // step still works. Custom types the host adds are always appended.
  const selectedCat = allCats.find((c) => c.id === categoryId);
  const embedded = selectedCat ? typesForCategorySlug(selectedCat.slug).map((name, i) => ({ id: `emb-${selectedCat.slug}-${i}`, name })) : [];
  const baseTypes = typeList.length ? typeList : embedded;
  const allTypes = [...baseTypes, ...customTypes.filter((t) => t.categoryId === categoryId)];

  return (
    <View style={{ gap: 22 }}>
      {/* 1) Audiences */}
      <Section title="Who is this for?" hint="Pick “All”, or one or more groups — the categories below filter to match.">
        <Chips>
          <Chip active={audiences.length === 0} onPress={() => onChange({ audiences: [], categoryId: null, typeId: null, typeName: '' })}>All</Chip>
          {audienceList.map((a) => (
            <Chip key={a.id} active={audiences.includes(a.id)} onPress={() => toggleAudience(a.id)}>{a.name}</Chip>
          ))}
        </Chips>
      </Section>

      {/* 2) Broad category */}
      <Section title="Broad category" hint={audiences.length === 0 ? 'Choose one. The type list fills from this category.' : 'Showing categories for the selected audience(s).'}>
        {filteredCategories.length === 0 ? (
          <Text style={styles.empty}>No categories for this audience yet — add one below.</Text>
        ) : (
          <Chips>
            {filteredCategories.map((c) => (
              <Chip key={c.id} active={categoryId === c.id} icon={iconForCategory(c.name)} onPress={() => pickCategory(c.id)}>{c.name}</Chip>
            ))}
          </Chips>
        )}
        <InlineAdd label="Add category" onAdd={(name) => {
          const id = 'custom-c-' + Date.now();
          const cat = { id, name, slug: name.toLowerCase().replace(/\s+/g, '-'), audiences: selectedSlugs };
          setCustomCats((p) => [...p, cat]);
          onChange({ categoryId: id, typeId: null, typeName: '' });
        }} />
      </Section>

      {/* 3) Type */}
      <Section title="Type of activity / event" hint={categoryId ? 'Pick the specific type, or add a custom one.' : 'Select a broad category first.'}>
        {!categoryId ? (
          <Text style={styles.empty}>Choose a broad category above to see its types.</Text>
        ) : loadingTypes ? (
          <View style={styles.loadingRow}><ActivityIndicator size="small" color={colors.brand} /><Text style={styles.loadingText}>Loading types…</Text></View>
        ) : (
          <>
            <Chips>
              {allTypes.map((t) => (
                <Chip key={t.id} active={typeId === t.id} onPress={() => onChange({ typeId: t.id, typeName: t.name })}>{t.name}</Chip>
              ))}
              {allTypes.length === 0 && <Text style={styles.empty}>No preset types — add one below.</Text>}
            </Chips>
            <InlineAdd label="Add type" onAdd={(name) => {
              const id = 'custom-t-' + Date.now();
              setCustomTypes((p) => [...p, { id, name, categoryId }]);
              onChange({ typeId: id, typeName: name });
            }} />
          </>
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

function InlineAdd({ label, onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const submit = () => { const t = name.trim(); if (!t) return; onAdd(t); setName(''); setOpen(false); };
  if (!open) {
    return (
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.8} style={styles.addChip}>
        <Text style={styles.addChipText}>＋ {label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.addRow}>
      <TextInput autoFocus value={name} onChangeText={setName} placeholder={label} placeholderTextColor={colors.inkFaint} style={styles.addInput} onSubmitEditing={submit} returnKeyType="done" />
      <TouchableOpacity onPress={submit} style={styles.addOk}><Text style={styles.addOkText}>Add</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => { setOpen(false); setName(''); }} style={styles.addX}><Text style={styles.addXText}>✕</Text></TouchableOpacity>
    </View>
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
  addChip: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.brand, borderStyle: 'dashed' },
  addChipText: { fontSize: font.small, fontWeight: '800', color: colors.brand },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addInput: { flex: 1, height: 42, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.brand, paddingHorizontal: 12, fontSize: font.body, color: colors.ink },
  addOk: { backgroundColor: colors.brand, height: 42, paddingHorizontal: 16, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  addOkText: { color: '#101010', fontWeight: '800', fontSize: font.small },
  addX: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  addXText: { fontSize: 16, color: colors.inkMuted },
});
