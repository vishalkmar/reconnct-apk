import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { api, resolveImage } from '../../api/client';
import { useSupplierAuth } from '../../store/SupplierAuthContext';
import { useNav } from '../../navigation/NavContext';
import { ICONS } from '../../icons';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';

// Only the host-relevant slice of the shared /api/notifications feed —
// bookings on the host's own listings, plus same-day reminders. Real data
// only; no placeholder rows.
const TYPE = {
  host_booking: { icon: ICONS.ticket, tint: colors.brand, bg: colors.brandSoft },
  reminder: { icon: ICONS.bell, tint: '#2563EB', bg: '#DBEAFE' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// Kinds an OWNER (host or supplier) should see in their bell: bookings on
// their listings, the "starting soon" reminder, AND every review-pipeline
// ping (objection / approved / rejected / live / delisted / KAM assigned /
// deadline). The old filter kept only bookings, which is why objections and
// go-live pings never appeared even though the emails did.
const USER_KINDS = new Set(['host_booking', 'reminder']);
const isOwnerNotification = (n) => USER_KINDS.has(n.kind)
  || /^(review|objection|approved|rejected|live|delisted|am_assigned|supplier_listing_|deadline|resubmitted|submitted)/.test(String(n.kind || ''));

export default function SupplierNotificationsScreen() {
  const { token } = useSupplierAuth();
  const { push } = useNav();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.supplierNotifications(token)
      .then((d) => {
        if (!alive) return;
        const all = (d && d.notifications) || [];
        setFeed(all.filter(isOwnerNotification));
      })
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
          style={{ flex: 1 }}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: space.lg, paddingTop: 14, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const ty = TYPE[item.kind] || TYPE.host_booking;
            const canOpen = !!item.bookingId;
            const Row = canOpen ? TouchableOpacity : View;
            return (
              <Row
                style={styles.row}
                activeOpacity={0.7}
                {...(canOpen ? { onPress: () => push('supplierBookingDetail', { id: item.bookingId }) } : {})}
              >
                {item.image ? (
                  <Image source={{ uri: resolveImage(item.image) }} style={styles.iconImg} />
                ) : (
                  <View style={[styles.icon, { backgroundColor: ty.bg }]}><Image source={ty.icon} style={{ width: 18, height: 18, tintColor: ty.tint }} /></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                  <Text style={styles.time}>{timeAgo(item.at)}</Text>
                </View>
                {canOpen && <Text style={styles.chevron}>›</Text>}
              </Row>
            );
          }}
          ListEmptyComponent={<EmptyState emoji="🔔" title="No notifications yet" sub="New bookings on your listings will show up here." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 10, alignItems: 'center', ...shadow.card },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconImg: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt },
  title: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  body: { fontSize: font.small, color: colors.inkMuted, marginTop: 2, lineHeight: 17 },
  time: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 4 },
  chevron: { fontSize: 20, color: colors.inkFaint, marginLeft: 4 },
});
