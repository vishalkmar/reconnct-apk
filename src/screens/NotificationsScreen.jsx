import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, Image } from 'react-native';
import { colors, radius, font, space } from '../theme';
import { api } from '../api/client';
import { formatMoney } from '../utils/format';
import { useAuth } from '../store/AuthContext';
import { ICONS } from '../icons';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';

// Icon + tint per notification kind. The feed itself comes from the backend
// (/api/notifications) so the app and website always show the same list.
const ICON_FOR = { booking: ICONS.ticket, wallet: ICONS.card, welcome: ICONS.bell, host_booking: ICONS.ticket };
const TINT_FOR = { booking: colors.brand, wallet: '#2563EB', welcome: '#16A34A', host_booking: '#8E51FF' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayLabel(iso) {
  if (!iso) return 'Earlier';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Earlier';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.notifications(token)
      .then((d) => { if (alive) setFeed((d && d.notifications) || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  // Feed arrives newest-first from the backend — group into Today/Yesterday/
  // older-date sections while preserving that order.
  const sections = useMemo(() => {
    const groups = new Map();
    feed.forEach((n) => {
      const label = dayLabel(n.at);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(n);
    });
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [feed]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Notifications" />
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: space.lg, paddingBottom: 32 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: (TINT_FOR[item.kind] || colors.brand) + '22' }]}>
                <Image source={ICON_FOR[item.kind] || ICONS.bell} style={[styles.icon, { tintColor: TINT_FOR[item.kind] || colors.brand }]} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
              </View>
              {item.amount != null && <Text style={styles.amount}>{formatMoney(item.amount, 'INR')}</Text>}
            </View>
          )}
          ListEmptyComponent={<EmptyState emoji="🔔" title="No notifications yet" sub="Booking and wallet updates will show up here." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginTop: 18, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  iconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 20, height: 20 },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 16, color: colors.ink },
  body: { fontSize: 12, fontWeight: '400', lineHeight: 16, color: colors.inkMuted, marginTop: 4 },
  amount: { fontSize: font.body, fontWeight: '800', color: colors.price, marginLeft: 8 },
});
