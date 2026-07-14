import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { colors, radius, font, space, shadow } from '../theme';
import { api, resolveImage } from '../api/client';
import { useAuth } from '../store/AuthContext';
import { MONTHS_FULL } from '../utils/booking';

const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; };
const experiencedLabel = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `Experienced on ${d.getDate()}${ordinal(d.getDate())} of ${MONTHS_FULL[d.getMonth()]}, ${d.getFullYear()}`;
};

/**
 * Shared rate-and-review popup used both as the manual "Rate Experience"
 * action from a completed booking card, and as the automatic Home-screen
 * prompt. `variant="auto"` adds the "Stop showing" (session-independent,
 * server-persisted dismissal) chrome the auto-popup needs; `variant="manual"`
 * keeps its secondary action to a plain "Cancel". The X close button shows
 * either way.
 */
export default function RatingModal({ visible, variant = 'manual', booking, onClose, onDismissForever, onSubmitted }) {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) { setRating(0); setComment(''); setDone(false); setError(''); }
  }, [visible, booking && booking.bookingCode]);

  if (!booking) return null;
  const name = booking.itemName || (booking.item && booking.item.name) || 'this experience';
  const img = resolveImage(booking.itemImage || (booking.item && (booking.item.image || booking.item.mainImage)));
  const location = booking.itemLocation || (booking.item && (booking.item.location || booking.item.city)) || '';
  const dateLabel = experiencedLabel(booking.scheduledFor || booking.scheduledAt || (booking.item && booking.item.scheduledFor));

  const submit = async () => {
    if (!rating) { setError('Please pick a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.submitReview(token, booking.bookingCode, { rating, comment: comment.trim() || undefined });
      setDone(true);
      onSubmitted && onSubmitted(res);
    } catch (e) {
      setError(e.message || 'Could not submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const stopShowing = async () => {
    setDismissing(true);
    try { await api.dismissReviewPrompt(token, booking.bookingCode); } catch (_) {}
    setDismissing(false);
    onDismissForever && onDismissForever();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {done ? (
            <View style={styles.doneWrap}>
              <Text style={styles.doneEmoji}>🎉</Text>
              <Text style={styles.doneTitle}>Thanks for rating!</Text>
              <Text style={styles.doneSub}>Congrats — your review for {name} has been posted.</Text>
              <TouchableOpacity style={styles.submitBtn} activeOpacity={0.9} onPress={onClose}>
                <Text style={styles.submitBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.title}>How Was Your Experience</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemCard}>
                {!!img && <Image source={{ uri: img }} style={styles.itemImg} />}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{name}</Text>
                  {!!location && (
                    <View style={styles.locRow}>
                      <Text style={styles.locPin}>📍</Text>
                      <Text style={styles.locText} numberOfLines={1}>{location}</Text>
                    </View>
                  )}
                  {!!dateLabel && <Text style={styles.dateText}>{dateLabel}</Text>}
                </View>
              </View>

              <Text style={styles.sectionLabel}>How would you rate the experience?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                    <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>
                In case you want to write a review <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Share a few words about your experience"
                placeholderTextColor={colors.inkFaint}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity style={styles.submitBtn} activeOpacity={0.9} onPress={submit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#101010" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </TouchableOpacity>

              {variant === 'auto' ? (
                <TouchableOpacity style={styles.linkBtn} onPress={stopShowing} disabled={dismissing}>
                  <Text style={styles.linkBtnText}>{dismissing ? 'Please wait…' : 'Stop showing this'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.linkBtn} onPress={onClose}>
                  <Text style={styles.linkBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, ...shadow.card },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { flex: 1, fontSize: font.h3, fontWeight: '900', color: colors.ink },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  closeBtnText: { color: colors.ink, fontSize: 13, fontWeight: '800' },

  itemCard: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, marginBottom: 20 },
  itemImg: { width: 100, height: 75, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  itemName: { fontSize: 15, fontWeight: '800', color: colors.ink },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locPin: { fontSize: 10 },
  locText: { fontSize: 12, color: colors.inkMuted, flex: 1 },
  dateText: { fontSize: 11, color: colors.inkFaint, marginTop: 4 },

  sectionLabel: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  optional: { fontWeight: '500', color: colors.inkMuted, fontSize: 13 },

  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  star: { fontSize: 32, color: colors.border },
  starActive: { color: colors.star },

  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, minHeight: 100, textAlignVertical: 'top', color: colors.ink, fontSize: font.body, backgroundColor: colors.surfaceAlt },
  error: { color: '#DC2626', fontSize: font.small, marginTop: 8, textAlign: 'center', fontWeight: '600' },
  submitBtn: { backgroundColor: colors.brand, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  submitBtnText: { color: '#101010', fontWeight: '900', fontSize: font.body },
  linkBtn: { alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 6 },
  linkBtnText: { color: colors.inkMuted, fontWeight: '700', fontSize: font.small },
  doneWrap: { alignItems: 'center', paddingVertical: 12 },
  doneEmoji: { fontSize: 44, marginBottom: 8 },
  doneTitle: { fontSize: font.h2, fontWeight: '900', color: colors.ink },
  doneSub: { fontSize: font.body, color: colors.inkMuted, textAlign: 'center', marginTop: 6, marginBottom: 4 },
});
