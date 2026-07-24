import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../theme';
import { initials } from '../utils/format';
import { api } from '../api/client';

/*
  "Key Account Manager" bottom sheet — the app counterpart of the supplier web
  portal's Key Account Manager page. Shows who from the reconnct team looks
  after this owner, with the email and phone as one-tap actions (mailto: /
  tel:) so they can reach them instantly.

  A KAM is assigned by round-robin — to suppliers AND hosts alike — the first
  time one of their experiences goes live, out of the same pool and against the
  same per-KAM cap. Before that the sheet says "not assigned yet".
*/
export default function KamSheet({ visible, onClose, mode = 'supplier', token }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [manager, setManager] = useState(null);
  const [since, setSince] = useState(null);

  useEffect(() => {
    if (!visible || !token) return undefined;
    let alive = true;
    setLoading(true);
    const fetcher = mode === 'host' ? api.hostAccountManager : api.supplierAccountManager;
    fetcher(token)
      .then((d) => {
        if (!alive) return;
        setManager((d && d.manager) || null);
        setSince((d && d.since) || null);
      })
      .catch(() => { if (alive) setManager(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [visible, token, mode]);

  /*
    Deliberately NO canOpenURL() pre-check: on Android 11+ it answers "false"
    for mailto:/tel: unless every handler is declared in <queries>, so gating on
    it wrongly blocked working devices. We just fire the intent and only
    complain if the OS genuinely has nothing to handle it. `tel:` opens the
    dialer pre-filled (no CALL_PHONE permission needed — the user presses dial),
    which is exactly the "instant call" behaviour without a permission prompt.
  */
  const openLink = async (url, label, fallback) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        `Couldn't open ${label}`,
        fallback ? `No ${label.toLowerCase()} app found. ${fallback}` : 'No app on this device can handle it.',
      );
    }
  };

  const sinceLabel = since
    ? new Date(since).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title}>Key Account Manager</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>Your dedicated point of contact at reconnct — reach out about listings, bookings or payouts.</Text>

          {loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginVertical: 40 }} />
          ) : !manager ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Not assigned yet</Text>
              <Text style={styles.emptySub}>
                You’ll be assigned a Key Account Manager as soon as your first experience goes live.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.idRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials(manager.name)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{manager.name}</Text>
                  <Text style={styles.role}>{manager.roleLabel || 'Account Manager'}</Text>
                </View>
                {manager.isActive && (
                  <View style={styles.activePill}><Text style={styles.activeText}>Active</Text></View>
                )}
              </View>

              <View style={styles.rows}>
                <Row label="Employee code" value={manager.employeeCode} mono />
                <Row label="Email" value={manager.email} />
                <Row label="Phone" value={manager.phone || 'Not added yet'} />
                {!!sinceLabel && <Row label="Managing you since" value={sinceLabel} />}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.action, styles.call, !manager.phone && styles.actionOff]}
                  activeOpacity={0.9}
                  disabled={!manager.phone}
                  onPress={() => openLink(`tel:${String(manager.phone).replace(/[^\d+]/g, '')}`, 'Dialer', 'Please dial the number manually.')}>
                  <Text style={styles.callText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.action, styles.mail, !manager.email && styles.actionOff]}
                  activeOpacity={0.9}
                  disabled={!manager.email}
                  onPress={() => openLink(`mailto:${manager.email}`, 'Email app', 'Please copy the address instead.')}>
                  <Text style={styles.mailText}>Email</Text>
                </TouchableOpacity>
              </View>
              {!manager.phone && (
                <Text style={styles.noPhone}>No phone number on file yet — an admin can add it in Team Management.</Text>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const Row = ({ label, value, mono }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, mono && styles.mono]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: space.lg, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.h2, fontWeight: '900', color: colors.ink },
  close: { fontSize: 18, fontWeight: '800', color: colors.inkMuted },
  sub: { fontSize: font.small, color: colors.inkMuted, marginTop: 4, lineHeight: 18 },

  empty: { paddingVertical: 34, alignItems: 'center' },
  emptyTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  emptySub: { fontSize: font.small, color: colors.inkMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 },

  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: font.h3, fontWeight: '900', color: colors.brandText },
  name: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  role: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },
  activePill: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  activeText: { color: '#15803D', fontWeight: '900', fontSize: font.tiny },

  rows: { marginTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: font.small, color: colors.inkMuted },
  rowValue: { fontSize: font.body, color: colors.ink, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: font.small },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  action: { flex: 1, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  actionOff: { opacity: 0.4 },
  call: { backgroundColor: colors.success },
  callText: { color: '#fff', fontWeight: '900', fontSize: font.body },
  mail: { backgroundColor: colors.brand },
  mailText: { color: '#101010', fontWeight: '900', fontSize: font.body },
  noPhone: { fontSize: font.tiny, color: colors.inkMuted, textAlign: 'center', marginTop: 10 },
});
