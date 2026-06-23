import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { colors, radius, font, space, shadow } from '../theme';
import { api } from '../api/client';
import { formatMoney } from '../utils/format';
import { useAuth } from '../store/AuthContext';
import ScreenHeader from '../components/ScreenHeader';

// Builds a notification feed from the user's real activity (bookings + wallet),
// newest first, with a welcome note so the screen is never empty.
function buildFeed({ bookings, wallet, name }) {
  const feed = [];
  (bookings || []).forEach((b) => {
    const title = (b.item && (b.item.name || b.item.title)) || 'your experience';
    const paid = ['confirmed', 'paid'].includes(b.status);
    feed.push({
      id: 'b' + b.id, icon: paid ? '✅' : '🕒',
      title: paid ? 'Booking confirmed' : 'Booking pending payment',
      body: `${title} — #${b.bookingCode}`,
      amount: b.pricing && b.pricing.total ? formatMoney(b.pricing.total, b.currency) : null,
      at: b.createdAt || b.scheduledFor,
    });
  });
  (wallet && wallet.transactions || []).forEach((t) => {
    feed.push({
      id: 'w' + (t.id || Math.random()), icon: '💳',
      title: 'Wallet update', body: t.description || t.type || 'Transaction',
      at: t.createdAt,
    });
  });
  feed.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  feed.push({
    id: 'welcome', icon: '🎉', title: `Welcome to reconnct${name ? ', ' + name.split(' ')[0] : ''}!`,
    body: 'Discover experiences near you and book in seconds.', at: '',
  });
  return feed;
}

export default function NotificationsScreen() {
  const { token, user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.myBookings(token), api.wallet(token)])
      .then(([b, w]) => {
        if (!alive) return;
        setFeed(buildFeed({
          bookings: b.status === 'fulfilled' ? b.value.bookings : [],
          wallet: w.status === 'fulfilled' ? w.value : null,
          name: user && user.name,
        }));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, user]);

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
              <View style={styles.iconWrap}><Text style={styles.icon}>{item.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                {!!item.at && <Text style={styles.at}>{String(item.at).slice(0, 10)}</Text>}
              </View>
              {!!item.amount && <Text style={styles.amount}>{item.amount}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  body: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },
  at: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 4 },
  amount: { fontSize: font.body, fontWeight: '800', color: colors.price },
});
