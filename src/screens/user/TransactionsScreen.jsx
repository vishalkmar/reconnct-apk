import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { api } from '../../api/client';
import { formatMoney } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';

const isCredit = (t) => {
  const v = Number(t.amount != null ? t.amount : (t.amountPaise || 0));
  const type = String(t.type || t.direction || '').toLowerCase();
  if (type.includes('credit') || type.includes('refund') || type.includes('cashback')) return true;
  if (type.includes('debit') || type.includes('spend')) return false;
  return v >= 0;
};

const isRefund = (t) => /refund/i.test(String(t.type || '') + ' ' + String(t.description || t.note || ''));
const TABS = [{ key: 'all', label: 'All' }, { key: 'payments', label: 'Payments' }, { key: 'refunds', label: 'Refunds' }];
const matchTab = (t, key) => key === 'all' || (key === 'refunds' ? isRefund(t) : !isRefund(t));

export default function TransactionsScreen() {
  const { token } = useAuth();
  const [data, setData] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let alive = true;
    api.wallet(token)
      .then((d) => { if (alive) setData(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token]);

  const txns = data.transactions || [];
  const counts = TABS.reduce((acc, t) => { acc[t.key] = txns.filter((x) => matchTab(x, t.key)).length; return acc; }, {});
  const shown = txns.filter((x) => matchTab(x, tab));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Transactions" />
      {loading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(t, i) => String(t.id || i)}
          contentContainerStyle={{ padding: space.lg }}
          ListHeaderComponent={
            <View>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Wallet balance</Text>
                <Text style={styles.balance}>{formatMoney(data.balance || 0, 'INR')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
                {TABS.map((t) => {
                  const active = tab === t.key;
                  return (
                    <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.8}>
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                      <View style={[styles.badge, active && styles.badgeActive]}><Text style={[styles.badgeText, active && styles.badgeTextActive]}>{counts[t.key] || 0}</Text></View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          renderItem={({ item }) => {
            const credit = isCredit(item);
            const amt = Number(item.amount != null ? item.amount : (item.amountPaise || 0) / 100);
            return (
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: credit ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Text>{credit ? '↓' : '↑'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.desc} numberOfLines={1}>{item.description || item.note || item.type || 'Transaction'}</Text>
                  {!!item.createdAt && <Text style={styles.date}>{String(item.createdAt).slice(0, 10)}</Text>}
                </View>
                <Text style={[styles.amt, { color: credit ? colors.success : '#DC2626' }]}>
                  {credit ? '+' : '−'} {formatMoney(Math.abs(amt), 'INR')}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState emoji="💳" title="No transactions yet"
              sub="Wallet credits, refunds and payments will show up here." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingVertical: 12, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { color: colors.ink, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: '#fff' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: font.tiny, fontWeight: '800', color: colors.inkMuted },
  badgeTextActive: { color: '#fff' },
  balanceCard: { backgroundColor: colors.brand, borderRadius: radius.lg, padding: 20, marginBottom: 4 },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: font.small },
  balance: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10, ...shadow.card },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: font.body, color: colors.ink, fontWeight: '600' },
  date: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 2 },
  amt: { fontSize: font.body, fontWeight: '800' },
});
