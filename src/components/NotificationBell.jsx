import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { ICONS } from '../icons';
import { useNav } from '../navigation/NavContext';
import { api } from '../api/client';

/*
  Dashboard bell for the supplier portal and the host panel.

  The /notifications feed is DERIVED server-side (built on the fly from
  bookings/wallet rows), so there is no persisted read flag to count against.
  Instead we remember on this device when the owner last opened their
  notifications screen and badge anything newer than that — which is exactly
  what "unread" means to them. Opening the screen clears the badge.
*/
const seenKey = (mode) => `notif_seen_${mode}`;

export default function NotificationBell({ mode = 'supplier', token, tint = '#fff' }) {
  const { push } = useNav();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const fetcher = mode === 'host' ? api.notifications : api.supplierNotifications;
      const d = await fetcher(token);
      const all = (d && d.notifications) || [];
      // Same slice both notification screens show for an owner.
      const mine = all.filter((n) => n.kind === 'host_booking' || n.kind === 'reminder');
      const seenRaw = await AsyncStorage.getItem(seenKey(mode));
      const seen = seenRaw ? Number(seenRaw) : 0;
      const unread = mine.filter((n) => {
        const t = new Date(n.at || n.createdAt || 0).getTime();
        return Number.isFinite(t) && t > seen;
      }).length;
      setCount(unread);
    } catch { /* a failed poll just leaves the badge as-is */ }
  }, [mode, token]);

  useEffect(() => {
    refresh();
    // Cheap poll so a booking that lands while the dashboard is open shows up.
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  const open = async () => {
    await AsyncStorage.setItem(seenKey(mode), String(Date.now()));
    setCount(0);
    push(mode === 'host' ? 'hostNotifications' : 'supplierNotifications');
  };

  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={open} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Image source={ICONS.bell} style={[styles.icon, { tintColor: tint }]} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  icon: { width: 21, height: 21 },
  badge: {
    position: 'absolute', top: 2, right: 1, minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900', lineHeight: 13 },
});

