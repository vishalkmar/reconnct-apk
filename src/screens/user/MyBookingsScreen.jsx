import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { api, resolveImage } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import { useNav } from '../../navigation/NavContext';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';

const STATUS_COLOR = {
  confirmed: colors.success, paid: colors.success,
  pending_payment: '#D97706', cancelled: '#DC2626', refunded: '#6B7280',
};
const label = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function MyBookingsScreen() {
  const { token } = useAuth();
  const { navigateTab } = useNav();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.myBookings(token)
      .then((d) => { if (alive) setItems(d.bookings || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="My Bookings" />
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.id || b.bookingCode)}
          contentContainerStyle={{ padding: space.lg }}
          renderItem={({ item }) => {
            const snap = item.item || {};
            const img = resolveImage(snap.image || snap.mainImage);
            return (
              <View style={styles.card}>
                {img ? <Image source={{ uri: img }} style={styles.img} /> : <View style={[styles.img, styles.imgPh]} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={2}>{snap.name || snap.title || 'Experience'}</Text>
                  <Text style={styles.code}>#{item.bookingCode}</Text>
                  {!!item.scheduledFor && <Text style={styles.meta}>📅 {String(item.scheduledFor).slice(0, 10)}</Text>}
                  <View style={styles.row}>
                    <Text style={[styles.status, { color: STATUS_COLOR[item.status] || colors.inkMuted }]}>● {label(item.status)}</Text>
                    {!!(item.pricing && item.pricing.total) && (
                      <Text style={styles.total}>{formatMoney(item.pricing.total, item.currency)}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState emoji="🎟️" title="No bookings yet"
              sub="Your booked experiences will appear here."
              cta="Explore experiences" onCta={() => navigateTab('experiences')} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginBottom: 12, ...shadow.card },
  img: { width: 84, height: 84, borderRadius: radius.md },
  imgPh: { backgroundColor: '#DCE0E6' },
  name: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  code: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 2 },
  meta: { fontSize: font.small, color: colors.inkMuted, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  status: { fontSize: font.small, fontWeight: '700' },
  total: { fontSize: font.h3, fontWeight: '800', color: colors.price },
});
