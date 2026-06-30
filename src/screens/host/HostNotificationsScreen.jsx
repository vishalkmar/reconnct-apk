import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { ICONS } from '../../icons';
import ScreenHeader from '../../components/ScreenHeader';

const TYPE = {
  message: { icon: ICONS.navInbox, tint: '#2563EB', bg: '#DBEAFE' },
  update: { icon: ICONS.sparkle, tint: '#16A34A', bg: '#DCFCE7' },
  email: { icon: ICONS.bell, tint: colors.brand, bg: colors.brandSoft },
};
const DATA = [
  { id: 1, type: 'message', title: 'New booking from Ravi Patel', body: 'Goa Coastal Kayaking · Jul 22, 2026 · 2 guests', time: '2h ago', unread: true },
  { id: 2, type: 'update', title: 'Listing approved', body: '“Sunset Dolphin Boat Tour” is now live and bookable.', time: '5h ago', unread: true },
  { id: 3, type: 'email', title: 'Payout processed', body: '₹8,800 has been sent to your linked account.', time: '1d ago', unread: false },
  { id: 4, type: 'message', title: 'Aisha Khan sent a message', body: '“Is the tour suitable for kids?”', time: '1d ago', unread: false },
  { id: 5, type: 'update', title: 'New review', body: 'Tom Williams rated you 5★ on Goa Coastal Kayaking.', time: '2d ago', unread: false },
  { id: 6, type: 'email', title: 'Weekly summary', body: 'You earned ₹11,000 from 3 bookings this week.', time: '3d ago', unread: false },
];

export default function HostNotificationsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Notifications" />
      <FlatList
        data={DATA}
        style={{ flex: 1 }}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ padding: space.lg, paddingTop: 14, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const ty = TYPE[item.type] || TYPE.update;
          return (
            <View style={[styles.row, item.unread && styles.rowUnread]}>
              <View style={[styles.icon, { backgroundColor: ty.bg }]}><Image source={ty.icon} style={{ width: 18, height: 18, tintColor: ty.tint }} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              {item.unread && <View style={styles.dot} />}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: space.lg, paddingVertical: 12, gap: 8 },
  tab: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#101010' },

  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 10, alignItems: 'center', ...shadow.card },
  rowUnread: { borderLeftWidth: 3, borderLeftColor: colors.brand },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  body: { fontSize: font.small, color: colors.inkMuted, marginTop: 2, lineHeight: 17 },
  time: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand },
});
