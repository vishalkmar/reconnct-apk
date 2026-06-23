import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, radius, font, space } from '../theme';
import { api } from '../api/client';
import { useLocation } from '../store/LocationContext';
import { useNav } from '../navigation/NavContext';
import ScreenHeader from '../components/ScreenHeader';

// Only cities that have at least one published experience are listed.
export default function CityPickerScreen() {
  const { city, detectedCity, setSelectedCity, redetect } = useLocation();
  const { pop } = useNav();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.cities().then((d) => setCities(d.cities || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const choose = (name) => { setSelectedCity(name); pop(); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Choose your city" />
      <FlatList
        data={cities}
        keyExtractor={(c) => c.name}
        contentContainerStyle={{ padding: space.lg }}
        ListHeaderComponent={
          <TouchableOpacity style={styles.detectRow} onPress={() => { setSelectedCity(null); redetect && redetect(); pop(); }}>
            <Text style={styles.detectIcon}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.detectTitle}>Use my current location</Text>
              {!!detectedCity && <Text style={styles.detectSub}>Detected: {detectedCity}</Text>}
            </View>
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const active = (city || '').toLowerCase() === item.name.toLowerCase();
          return (
            <TouchableOpacity style={[styles.row, active && styles.rowActive]} onPress={() => choose(item.name)} activeOpacity={0.8}>
              <Text style={styles.pin}>📍</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.count}>{item.count} experience{item.count === 1 ? '' : 's'}</Text>
              {active && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 30 }} /> : <Text style={styles.empty}>No cities yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  detectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: 14, marginBottom: 14 },
  detectIcon: { fontSize: 20 },
  detectTitle: { fontSize: font.body, fontWeight: '800', color: colors.brandText },
  detectSub: { fontSize: font.small, color: colors.brandText, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  rowActive: { borderColor: colors.brand, backgroundColor: '#FFFDF7' },
  pin: { fontSize: 16 },
  name: { flex: 1, fontSize: font.body, fontWeight: '700', color: colors.ink },
  count: { fontSize: font.small, color: colors.inkMuted },
  check: { color: colors.brand, fontWeight: '900', marginLeft: 8 },
  empty: { color: colors.inkMuted, textAlign: 'center', marginTop: 30 },
});
