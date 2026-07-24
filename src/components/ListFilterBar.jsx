import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Modal, Pressable, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../theme';
import { ICONS } from '../icons';
import {
  DATE_PRESETS, RATING_OPTIONS, emptyFilters, activeFilterCount,
} from '../utils/listFilters';

/*
  The single search bar + "Filter" button used on every owner-facing list —
  Bookings, Listings and Transactions, for both the supplier portal and the
  host panel. Nothing is shown inline: tapping "Filter" opens a bottom sheet
  with every control the website offers (date presets incl. a specific date and
  a custom range, category, rating and an amount range).

  `show` lets a screen switch off a section it has no data for (e.g. a
  per-listing bookings feed carries no category or rating).
*/
export default function ListFilterBar({
  query,
  onQueryChange,
  placeholder = 'Search…',
  filters,
  onChange,
  categories = [],
  // What the category section is called on this screen — "Category" for
  // bookings/listings, "Experience" on the transactions screens.
  categoryLabel = 'Category',
  show = {},
  style,
}) {
  const cfg = {
    date: true, category: true, rating: true, amount: true, ...show,
  };
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.bar}>
        <Image source={ICONS.searchMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          value={query}
          onChangeText={onQueryChange}
          returnKeyType="search"
        />
        {!!query && (
          <TouchableOpacity onPress={() => onQueryChange('')} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
            <Text style={styles.clearX}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85} onPress={() => setOpen(true)}>
          <Image source={ICONS.filter} style={styles.filterIcon} />
          <Text style={styles.filterLabel}>Filter</Text>
          {count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{count}</Text></View>}
        </TouchableOpacity>
      </View>

      <FilterSheet
        visible={open}
        onClose={() => setOpen(false)}
        filters={filters}
        onApply={(f) => { onChange(f); setOpen(false); }}
        categories={categories}
        categoryLabel={categoryLabel}
        cfg={cfg}
      />
    </View>
  );
}

function FilterSheet({ visible, onClose, filters, onApply, categories, categoryLabel, cfg }) {
  const insets = useSafeAreaInsets();
  // Edited locally so "Cancel"/backdrop leaves the list untouched — only
  // "Apply" commits.
  const [draft, setDraft] = useState(filters);
  // Re-seed each time the sheet opens so it always reflects what's live.
  const [wasVisible, setWasVisible] = useState(false);
  if (visible && !wasVisible) { setWasVisible(true); setDraft(filters); }
  if (!visible && wasVisible) setWasVisible(false);

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {cfg.date && (
              <Section title="Date">
                <Chips>
                  {DATE_PRESETS.map(([value, label]) => (
                    <Chip key={value} active={draft.date === value} onPress={() => patch({ date: value })}>{label}</Chip>
                  ))}
                </Chips>
                {draft.date === 'specific' && (
                  <View style={styles.dateRow}>
                    <DateInput label="Date" value={draft.specificDate} onChange={(v) => patch({ specificDate: v })} />
                  </View>
                )}
                {draft.date === 'range' && (
                  <View style={styles.dateRow}>
                    <DateInput label="From" value={draft.from} onChange={(v) => patch({ from: v })} />
                    <DateInput label="To" value={draft.to} onChange={(v) => patch({ to: v })} />
                  </View>
                )}
              </Section>
            )}

            {cfg.category && categories.length > 0 && (
              <Section title={categoryLabel}>
                <Chips>
                  <Chip active={!draft.category} onPress={() => patch({ category: '' })}>All</Chip>
                  {categories.map((c) => (
                    <Chip key={c} active={draft.category === c} onPress={() => patch({ category: c })}>{c}</Chip>
                  ))}
                </Chips>
              </Section>
            )}

            {cfg.rating && (
              <Section title="Rating">
                <Chips>
                  {RATING_OPTIONS.map(([value, label]) => (
                    <Chip key={value || 'any'} active={draft.minRating === value} onPress={() => patch({ minRating: value })}>{label}</Chip>
                  ))}
                </Chips>
              </Section>
            )}

            {cfg.amount && (
              <Section title="Amount range">
                <View style={styles.dateRow}>
                  <MoneyInput label="Min ₹" value={draft.minAmount} onChange={(v) => patch({ minAmount: v })} />
                  <MoneyInput label="Max ₹" value={draft.maxAmount} onChange={(v) => patch({ maxAmount: v })} />
                </View>
              </Section>
            )}
          </ScrollView>

          <View style={styles.sheetFoot}>
            <TouchableOpacity style={styles.reset} activeOpacity={0.85} onPress={() => setDraft(emptyFilters())}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.apply} activeOpacity={0.9} onPress={() => onApply(draft)}>
              <Text style={styles.applyText}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);
const Chips = ({ children }) => <View style={styles.chips}>{children}</View>;
const Chip = ({ active, onPress, children }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.chip, active && styles.chipOn]}>
    <Text style={[styles.chipText, active && styles.chipTextOn]}>{children}</Text>
  </TouchableOpacity>
);
const DateInput = ({ label, value, onChange }) => (
  <View style={{ flex: 1 }}>
    <Text style={styles.miniLabel}>{label}</Text>
    <TextInput
      style={styles.miniInput}
      placeholder="YYYY-MM-DD"
      placeholderTextColor={colors.inkFaint}
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>
);
const MoneyInput = ({ label, value, onChange }) => (
  <View style={{ flex: 1 }}>
    <Text style={styles.miniLabel}>{label}</Text>
    <TextInput
      style={styles.miniInput}
      placeholder="0"
      placeholderTextColor={colors.inkFaint}
      keyboardType="numeric"
      value={String(value ?? '')}
      onChangeText={(t) => onChange(t.replace(/[^\d.]/g, ''))}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.lg, paddingTop: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingLeft: 14, paddingRight: 6, height: 48 },
  searchIcon: { width: 15, height: 15, marginRight: 8, tintColor: colors.inkFaint },
  input: { flex: 1, color: colors.ink, fontSize: font.body, paddingVertical: 0 },
  clearX: { color: colors.inkFaint, fontSize: 14, paddingHorizontal: 6 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brandSoft, paddingHorizontal: 12, height: 36, borderRadius: radius.pill },
  filterIcon: { width: 15, height: 15, tintColor: colors.brandText },
  filterLabel: { color: colors.brandText, fontWeight: '800', fontSize: font.small },
  badge: { minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.brandText, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: space.lg, paddingTop: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTitle: { fontSize: font.h2, fontWeight: '900', color: colors.ink },
  sheetClose: { fontSize: 18, fontWeight: '800', color: colors.inkMuted },

  section: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionTitle: { fontSize: font.small, fontWeight: '900', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: font.small, color: colors.ink, fontWeight: '700' },
  chipTextOn: { color: '#101010' },

  dateRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  miniLabel: { fontSize: font.tiny, color: colors.inkMuted, marginBottom: 5, fontWeight: '700' },
  miniInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: font.body, color: colors.ink },

  sheetFoot: { flexDirection: 'row', gap: 10, paddingTop: 14 },
  reset: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontWeight: '800', color: colors.ink, fontSize: font.body },
  apply: { flex: 1, backgroundColor: colors.brand, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontWeight: '900', color: '#101010', fontSize: font.body },
});
