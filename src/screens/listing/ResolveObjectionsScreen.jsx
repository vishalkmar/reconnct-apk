import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useAuth } from '../../store/AuthContext';
import { useSupplierAuth } from '../../store/SupplierAuthContext';
import { useSupplier } from '../../store/SupplierContext';
import { api } from '../../api/client';
import ScreenHeader from '../../components/ScreenHeader';
import SectionEditor, { sectionDirty } from './sectionEditors';

/*
  The objection-resolution cycle on mobile — the app half of the website's
  HostResolveObjectionsPage. When Center Ops objects to sections of a listing,
  this is the ONLY way the owner (supplier or host) changes it: each objected
  section shows the objection, the running conversation, the exact fields it
  owns, and a REQUIRED "how did you fix it?" note. "Review again" resubmits the
  whole form plus the resolution notes so Center Ops takes another look.

  `mode` picks the right identity + endpoints so one screen serves both the
  supplier portal and a user's "Switch to Host" panel.
*/
export default function ResolveObjectionsScreen({ id, mode = 'supplier' }) {
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  const userAuth = useAuth();
  const supplierAuth = useSupplierAuth();
  const supplierStore = useSupplier();
  const token = mode === 'host' ? userAuth.token : supplierAuth.token;
  const getListing = mode === 'host' ? api.hostListing : api.supplierListing;
  const updateListing = mode === 'host' ? api.hostUpdateListing : api.supplierUpdateListing;

  const [listing, setListing] = useState(null);
  const [form, setForm] = useState(null);
  const [baseForm, setBaseForm] = useState(null);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  const load = useCallback(async () => {
    try {
      const d = await getListing(token, id);
      setListing((d && d.listing) || null);
      setForm((d && d.form) || null);
      setBaseForm((d && d.form) || null);
    } catch (e) {
      Alert.alert('Could not load', e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [getListing, token, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Resolve objections" />
        <ActivityIndicator color={colors.brand} style={{ marginTop: 60 }} />
      </View>
    );
  }

  const review = (listing && listing.review) || {};
  const objections = review.objections || [];
  const suggestion = review.suggestion;
  const thread = review.thread || {};

  if (!listing || objections.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Resolve objections" />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No open objections</Text>
          <Text style={styles.emptySub}>There’s nothing to resolve on this listing right now.</Text>
        </View>
      </View>
    );
  }

  const filledCount = objections.filter((o) => (notes[o.key] || '').trim()).length;
  const allNotesFilled = filledCount === objections.length;

  const reviewAgain = async () => {
    if (!allNotesFilled) return Alert.alert('Add a note', 'Please describe how you fixed every objection.');
    setBusy(true);
    try {
      const resolutions = {};
      objections.forEach((o) => { resolutions[o.key] = (notes[o.key] || '').trim(); });
      await updateListing(token, id, form, true, resolutions);
      if (mode === 'supplier' && supplierStore.reload) supplierStore.reload();
      Alert.alert('Sent back for review', 'Center Ops will take another look. You’ll be notified on the outcome.', [
        { text: 'OK', onPress: () => pop() },
      ]);
    } catch (e) {
      Alert.alert('Could not send', e.message || 'Please try again.');
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Resolve objections" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>{listing.title || (form && form.name)}</Text>
        <Text style={styles.sub}>{objections.length} objection{objections.length > 1 ? 's' : ''} to address before you can send it back.</Text>

        {!!suggestion && (
          <View style={styles.suggestBox}>
            <Text style={styles.suggestText}><Text style={styles.suggestLabel}>Center Ops suggestion: </Text>{suggestion}</Text>
          </View>
        )}

        {objections.map((o) => {
          const dirty = sectionDirty(o.key, form, baseForm);
          const conversation = (thread[o.key] || []).filter(Boolean);
          return (
            <View key={o.key} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{o.label}</Text>
                <View style={[styles.changeBadge, (o.changed || dirty) ? styles.changeBadgeOn : styles.changeBadgeOff]}>
                  <Text style={[styles.changeBadgeText, (o.changed || dirty) ? styles.changeBadgeTextOn : styles.changeBadgeTextOff]}>
                    {(o.changed || dirty) ? 'Changed' : 'Not changed yet'}
                  </Text>
                </View>
              </View>

              <View style={styles.objectionBox}>
                <Text style={styles.objectionText}><Text style={styles.objectionLabel}>Objection: </Text>{o.objection}</Text>
              </View>

              {conversation.length > 1 && (
                <View style={styles.threadBox}>
                  <Text style={styles.threadHead}>Conversation so far</Text>
                  {conversation.map((m, i) => (
                    <View key={i} style={styles.threadItem}>
                      <Text style={styles.threadWho}>{m.by || m.role || (m.fromOwner ? 'You' : 'Center Ops')}</Text>
                      <Text style={styles.threadMsg}>{m.text || m.message || m.note || ''}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.fixBox}>
                <Text style={styles.fixLabel}>Fix it here</Text>
                <SectionEditor section={o.key} form={form} patch={patch}
                  uploadImage={(asset) => api.uploadListingImage(token, asset)} />
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.noteLabel}>How did you fix it? <Text style={{ color: '#DC2626' }}>*</Text></Text>
                <TextInput
                  value={notes[o.key] || ''}
                  onChangeText={(t) => setNotes((n) => ({ ...n, [o.key]: t }))}
                  placeholder="Describe what you changed to address this."
                  placeholderTextColor={colors.inkFaint}
                  multiline
                  style={styles.noteInput}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.footerCount}>{filledCount}/{objections.length} notes added</Text>
        <TouchableOpacity style={[styles.reviewBtn, (!allNotesFilled || busy) && styles.reviewBtnOff]} disabled={!allNotesFilled || busy} onPress={reviewAgain} activeOpacity={0.9}>
          <Text style={styles.reviewBtnText}>{busy ? 'Sending…' : 'Review again'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { padding: 40, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  emptySub: { fontSize: font.small, color: colors.inkMuted, marginTop: 6, textAlign: 'center' },

  h1: { fontSize: font.h2, fontWeight: '900', color: colors.ink },
  sub: { fontSize: font.small, color: colors.inkMuted, marginTop: 4, marginBottom: 14 },

  suggestBox: { backgroundColor: '#FFFBEB', borderRadius: radius.md, padding: 12, marginBottom: 14 },
  suggestText: { fontSize: font.small, color: '#78350F', lineHeight: 19 },
  suggestLabel: { fontWeight: '900', color: '#B45309' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#F87171' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  cardTitle: { flex: 1, fontSize: font.h3, fontWeight: '900', color: colors.ink },
  changeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  changeBadgeOn: { backgroundColor: '#DCFCE7' },
  changeBadgeOff: { backgroundColor: '#FEF3C7' },
  changeBadgeText: { fontSize: 10, fontWeight: '900' },
  changeBadgeTextOn: { color: '#15803D' },
  changeBadgeTextOff: { color: '#B45309' },

  objectionBox: { backgroundColor: '#FEF2F2', borderRadius: radius.md, padding: 12 },
  objectionText: { fontSize: font.small, color: '#991B1B', lineHeight: 19 },
  objectionLabel: { fontWeight: '900' },

  threadBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 10 },
  threadHead: { fontSize: 10, fontWeight: '900', color: colors.inkMuted, letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' },
  threadItem: { marginBottom: 8 },
  threadWho: { fontSize: font.tiny, fontWeight: '900', color: colors.ink },
  threadMsg: { fontSize: font.small, color: colors.inkMuted, marginTop: 2, lineHeight: 18 },

  fixBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginTop: 12 },
  fixLabel: { fontSize: 10, fontWeight: '900', color: colors.brandText, letterSpacing: 0.4, marginBottom: 12, textTransform: 'uppercase' },

  noteLabel: { fontSize: font.small, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  noteInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, minHeight: 70, textAlignVertical: 'top', fontSize: font.body, color: colors.ink },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerCount: { fontSize: font.small, color: colors.inkMuted },
  reviewBtn: { backgroundColor: '#DC2626', paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.md },
  reviewBtnOff: { opacity: 0.45 },
  reviewBtnText: { color: '#fff', fontWeight: '900', fontSize: font.body },
});
