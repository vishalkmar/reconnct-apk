import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Image, ActivityIndicator, Pressable } from 'react-native';
import { colors, radius, font, space, shadow } from '../theme';
import { api, resolveImage } from '../api/client';
import { useAuth } from '../store/AuthContext';

/**
 * Shared rate-and-review popup used both as the manual "Rate Experience"
 * action from a completed booking card, and as the automatic Home-screen
 * prompt. `variant="auto"` adds the "Stop showing" + top-right X (session
 * close, no server call) chrome the auto-popup needs; `variant="manual"`
 * keeps it to just stars + comment + Submit/Cancel.
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
          {variant === 'auto' && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}

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
              {!!img && <Image source={{ uri: img }} style={styles.hero} />}
              <Text style={styles.title}>Rate your experience</Text>
              <Text style={styles.itemName} numberOfLines={2}>{name}</Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                    <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Share a few words about your experience (optional)"
                placeholderTextColor={colors.inkFaint}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
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
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, ...shadow.card },
  closeBtn: { position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  closeBtnText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  hero: { width: '100%', height: 110, borderRadius: radius.md, marginBottom: 12, resizeMode: 'cover' },
  title: { fontSize: font.h3, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  itemName: { fontSize: font.body, color: colors.inkMuted, textAlign: 'center', marginTop: 4, marginBottom: 16, fontWeight: '600' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 },
  star: { fontSize: 34, color: colors.border },
  starActive: { color: colors.star },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 12, minHeight: 70, textAlignVertical: 'top', color: colors.ink, fontSize: font.body },
  error: { color: '#DC2626', fontSize: font.small, marginTop: 8, textAlign: 'center', fontWeight: '600' },
  submitBtn: { backgroundColor: colors.brand, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitBtnText: { color: '#101010', fontWeight: '900', fontSize: font.body },
  linkBtn: { alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 6 },
  linkBtnText: { color: colors.inkMuted, fontWeight: '700', fontSize: font.small },
  doneWrap: { alignItems: 'center', paddingVertical: 12 },
  doneEmoji: { fontSize: 44, marginBottom: 8 },
  doneTitle: { fontSize: font.h2, fontWeight: '900', color: colors.ink },
  doneSub: { fontSize: font.body, color: colors.inkMuted, textAlign: 'center', marginTop: 6, marginBottom: 4 },
});
