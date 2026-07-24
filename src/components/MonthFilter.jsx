import React, { useState } from 'react';
import {
  Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable, ScrollView,
} from 'react-native';
import { colors, radius, font, shadow } from '../theme';
import { ICONS } from '../icons';

/*
  One shared "Filter by month" control for every bookings / transactions list
  in the app — so the same dropdown (All months + each month that has data)
  behaves and looks identical everywhere. A screen derives its month list with
  `buildMonths(rows.map(dateOf))`, keeps a `month` state, and filters its rows
  with `monthKey(dateOf(row)) === month`.
*/
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM' from a 'YYYY-MM-DD' / ISO string (or anything date-like).
export const monthKey = (s) => (s ? String(s).slice(0, 7) : '');
export const monthLabel = (k) => { const [y, m] = String(k).split('-').map(Number); return `${MONTHS[(m || 1) - 1]} ${y}`; };
// ['all', ...months present in the data, newest first].
export const buildMonths = (dates) => {
  const set = new Set((dates || []).map(monthKey).filter(Boolean));
  return ['all', ...[...set].sort().reverse()];
};

export default function MonthFilter({ value, months, onChange, style, full = true }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={[styles.btn, full && styles.btnFull, style]} activeOpacity={0.85} onPress={() => setOpen(true)}>
        <Image source={ICONS.calendar} style={styles.icon} />
        <Text style={styles.label} numberOfLines={1}>{value === 'all' ? 'All months' : monthLabel(value)}</Text>
        <Text style={styles.caret}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card}>
            <Text style={styles.title}>Filter by month</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {(months || ['all']).map((m) => {
                const active = value === m;
                return (
                  <TouchableOpacity key={m} style={styles.option} activeOpacity={0.7} onPress={() => { onChange(m); setOpen(false); }}>
                    <Text style={[styles.optionText, active && styles.optionTextOn]} numberOfLines={1}>{m === 'all' ? 'All months' : monthLabel(m)}</Text>
                    {active && <Text style={styles.check}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, height: 44 },
  btnFull: { flex: 1 },
  icon: { width: 15, height: 15, tintColor: colors.brand },
  label: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.ink },
  caret: { fontSize: 10, color: colors.inkMuted },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  card: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 8, ...shadow.card },
  title: { fontSize: font.small, fontWeight: '800', color: colors.inkMuted, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: radius.md },
  optionText: { fontSize: font.body, color: colors.ink, fontWeight: '600', flex: 1 },
  optionTextOn: { color: colors.brand, fontWeight: '800' },
  check: { color: colors.brand, fontWeight: '900', fontSize: font.body, marginLeft: 8 },
});
