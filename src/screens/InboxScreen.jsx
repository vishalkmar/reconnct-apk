import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font } from '../theme';
import { initials } from '../utils/format';

/**
 * Messages — Figma inspect spec:
 *   row      : horizontal, 390 × 87, border-bottom 1px, padding 16, gap 12
 *   avatar   : 48 × 48 rounded (initials, gold on light-gold)
 *   name     : #1A1A2E bold + time #888899 (right) + gold unread dot
 *   preview  : #888899, 12px / 16, up to 2 lines
 */
const MESSAGES = [
  { id: 1, name: 'Ravi Patel', time: '11:30', text: 'Hi! Just wanted to confirm the meeting point for our kayaking session.', unread: true },
  { id: 2, name: 'Aisha Khan', time: 'Yesterday', text: 'Thank you so much! The dolphin tour was absolutely incredible.' },
  { id: 3, name: 'Tom Williams', time: 'Jun 14', text: 'Can we reschedule the kayaking to Saturday instead' },
];

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList
        data={MESSAGES}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(item.name)}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
                {item.unread && <View style={styles.dot} />}
              </View>
              <Text style={styles.preview} numberOfLines={2}>{item.text}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: font.h2, fontWeight: '900', color: '#1A1A2E' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FDEFD3', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#F9B402' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: font.body, fontWeight: '800', color: '#1A1A2E' },
  time: { fontSize: font.tiny, color: '#888899' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  preview: { fontSize: 12, lineHeight: 16, color: '#888899', marginTop: 3 },
});
