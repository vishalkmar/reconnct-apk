import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { colors, radius, font, space, shadow } from '../theme';
import { api } from '../api/client';
import { formatMoney } from '../utils/format';
import { useAuth } from '../store/AuthContext';
import { ICONS } from '../icons';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';

// Icon per notification kind. The feed itself comes from the backend
// (/api/notifications) so the app and website always show the same list.
const ICON_FOR = { booking: ICONS.ticket, wallet: ICONS.card, welcome: ICONS.bell };
const TINT_FOR = { booking: colors.brand, wallet: '#2563EB', welcome: '#16A34A' };

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Notifications" />
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: space.lg }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: (TINT_FOR[item.kind] || colors.brand) + '22' }]}>
                <Image source={ICON_FOR[item.kind] || ICONS.bell} style={[styles.icon, { tintColor: TINT_FOR[item.kind] || colors.brand }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                {!!item.at && <Text style={styles.at}>{String(item.at).slice(0, 10)}</Text>}
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
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 18, height: 18 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  body: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },
  at: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 4 },
  amount: { fontSize: font.body, fontWeight: '800', color: colors.price },
});
