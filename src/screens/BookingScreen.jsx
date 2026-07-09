import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, Modal, Pressable, Linking, ActivityIndicator, AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../theme';
import { resolveImage, DUMMY_IMAGE, api } from '../api/client';
import { formatMoney } from '../utils/format';
import {
  bookableDateSet, slotsForDate, priceBreakdown, MONTHS_FULL,
} from '../utils/booking';
import { useAuth } from '../store/AuthContext';
import { useNav } from '../navigation/NavContext';
import { shareExperience } from '../utils/share';
import { createDirectPaymentLink } from '../utils/cashfree';
import PaymentWebView from '../components/PaymentWebView';
import { ICONS } from '../icons';

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (key) => {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}, ${y}`;
};

export default function BookingScreen({ item }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { pop, navigateTab, push } = useNav();

  const [step, setStep] = useState(1); // 1 plan · 2 review · 3 pay · 4 done
  const today = new Date();
  const schedule = useMemo(() => item.schedule || {}, [item.schedule]);
  const bookable = useMemo(() => bookableDateSet(schedule), [schedule]);
  // Open the calendar on the first month that actually has availability.
  const firstAvail = useMemo(() => {
    const keys = [...bookable].sort();
    return keys.length ? keys[0] : null;
  }, [bookable]);
  const initMonth = firstAvail ? new Date(firstAvail) : today;

  const [view, setView] = useState({ y: initMonth.getFullYear(), m: initMonth.getMonth() });
  const [dateKey, setDateKey] = useState(null);
  const [slot, setSlot] = useState(null);
  // Real slots for the selected date only — schedule.dates[].slots, same
  // source the admin/host "Manage dates & slots" screen writes to.
  const slots = useMemo(() => slotsForDate(schedule, dateKey), [schedule, dateKey]);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [showGuest, setShowGuest] = useState(false);
  const [guest, setGuest] = useState({ name: '', phone: '', email: '' });
  const [paying, setPaying] = useState(false);
  const [payLink, setPayLink] = useState(null);
  const [showPayWeb, setShowPayWeb] = useState(false);
  const [bookingCode, setBookingCode] = useState(null);
  const [dbBooking, setDbBooking] = useState(null);
  // True once a status check has come back and the booking is still NOT paid
  // (link closed/backed-out/failed/pending-and-abandoned) — lets the pay step
  // show a clear "try again" state instead of an eternal "waiting…" spinner
  // that never actually reflected what happened.
  const [checkedOnce, setCheckedOnce] = useState(false);

  const b = priceBreakdown(item, adults, children);
  const guests = adults + children;
  const primaryName = guest.name.trim() || (user && user.name) || 'You';
  // The amount actually charged comes from the DB booking once created.
  const payTotal = (dbBooking && dbBooking.pricing && dbBooking.pricing.total) || b.total;

  // Create the REAL booking in the DB, then a Cashfree hosted payment link and
  // open it. The booking + transaction now live server-side (original data).
  const startPayment = async () => {
    setStep(3); setPaying(true); setPayLink(null); setDbBooking(null); setBookingCode(null); setCheckedOnce(false);
    try {
      const res = await api.createBooking(token, {
        itemType: 'experience',
        itemId: item.id,
        scheduledFor: dateKey,
        guestCount: adults + children,
        guestName: primaryName,
        guestEmail: (guest.email || '').trim() || (user && user.email) || '',
        guestPhone: (guest.phone || '').trim() || (user && user.phone) || '',
        specialRequests: slot ? `Preferred time: ${slot.label}` : undefined,
      });
      const bk = res.booking;
      setDbBooking(bk);
      setBookingCode(bk.bookingCode);
      // Phase-1: create the Cashfree link DIRECTLY from the app (reliable on all
      // devices — the server round-trip was failing to open the checkout on some
      // phones), then register its id with our backend so the booking still
      // auto-confirms when the link is paid. Backend-created link is a fallback.
      let linkUrl = null;
      let directErr = null;
      let fallbackErr = null;
      try {
        const linkId = `${bk.bookingCode}-${Date.now().toString(36)}`;
        const direct = await createDirectPaymentLink({
          amount: (bk.pricing && bk.pricing.total) || b.total,
          name: primaryName,
          phone: (guest.phone || '').trim() || (user && user.phone) || '',
          email: (guest.email || '').trim() || (user && user.email) || '',
          purpose: item.name,
          linkId,
          bookingCode: bk.bookingCode,
        });
        linkUrl = direct.linkUrl;
        try { await api.bookingLink(token, bk.bookingCode, { linkId: direct.linkId, linkUrl: direct.linkUrl }); } catch (_) { /* registration is best-effort */ }
      } catch (e) {
        directErr = e;
        // Fallback: let the backend create the link (retry for free-host cold starts).
        let lk = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try { lk = await api.bookingLink(token, bk.bookingCode); if (lk && lk.linkUrl) break; } catch (e2) { fallbackErr = e2; }
          await new Promise((r) => setTimeout(r, 1500));
        }
        linkUrl = lk && lk.linkUrl;
      }
      // Surface the REAL reason (Cashfree/network error) instead of a generic
      // message — both the direct-from-app and backend-fallback paths failed.
      if (!linkUrl) {
        const reason = (directErr && directErr.message) || (fallbackErr && fallbackErr.message);
        throw new Error(reason ? `Could not start the payment: ${reason}` : 'Could not start the payment. Please try again.');
      }
      setPayLink(linkUrl);
      // Open the Cashfree checkout INSIDE the app (WebView).
      setShowPayWeb(true);
    } catch (e) {
      Alert.alert('Payment', e.message || 'Could not start the payment. Please try again.');
      setStep(2);
    } finally { setPaying(false); }
  };

  // Ask the backend whether the link is paid (it confirms the booking + emails
  // the voucher on success). Used by the auto-poll while we're on the pay step.
  const checkStatus = async () => {
    if (!bookingCode) return;
    try {
      const res = await api.bookingLinkStatus(token, bookingCode);
      if (res && res.paid) {
        if (res.booking) setDbBooking(res.booking);
        setShowPayWeb(false);
        setStep(4);
        return;
      }
      // Definitively not paid yet (link closed/backed-out/failed/still-pending)
      // — the pay step switches from "waiting" to a "try again" state instead
      // of implying nothing happened.
      setCheckedOnce(true);
    } catch { setCheckedOnce(true); }
  };

  // Reopen the SAME Cashfree link (it stays valid until paid or expired) for
  // a fresh attempt after a failed/abandoned one.
  const retryPayment = () => { setCheckedOnce(false); setShowPayWeb(true); };

  // Auto-detect payment: poll every 4s while on the pay step and immediately
  // when the user returns to the app (from the Cashfree browser). No manual
  // "I've paid" button — success/failure is Cashfree's call, we just react.
  useEffect(() => {
    if (step !== 3 || !bookingCode) return undefined;
    const id = setInterval(checkStatus, 4000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') checkStatus(); });
    return () => { clearInterval(id); sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, bookingCode]);

  // ── Calendar grid ─────────────────────────────────────────────────────
  const monthStart = new Date(view.y, view.m, 1);
  const firstDow = monthStart.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const stepMonth = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const next1 = () => {
    if (!dateKey) return Alert.alert('Pick a date', 'Choose an available date to continue.');
    if (slots.length && !slot) return Alert.alert('Pick a time', 'Choose a time slot for your date.');
    setStep(2);
  };

  const headerTitle = ['', 'Plan your trip', 'Review booking', 'Confirm & pay', 'Done'][step];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {step < 4 && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.back} onPress={() => (step > 1 ? setStep(step - 1) : pop())}><Text style={styles.backIcon}>‹</Text></TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.hTitle}>{headerTitle}</Text>
              <Text style={styles.hStep}>Step {step} of 3</Text>
            </View>
            <Text style={styles.hTotal}>{formatMoney(b.total, item.currency)}</Text>
          </View>
          <View style={styles.progress}>
            {[1, 2, 3].map((s) => <View key={s} style={[styles.progressSeg, s <= step && styles.progressOn]} />)}
          </View>
        </View>
      )}

      {/* ───────── STEP 1: plan ───────── */}
      {step === 1 && (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.bigQ}>When are you going?</Text>
          <Text style={styles.sub}>Select a date for your experience.</Text>

          {/* Calendar */}
          <View style={styles.calendar}>
            <View style={styles.calHead}>
              <TouchableOpacity onPress={() => stepMonth(-1)} style={styles.calNav}><Text style={styles.calNavTxt}>‹</Text></TouchableOpacity>
              <Text style={styles.calMonth}>{MONTHS_FULL[view.m]} {view.y}</Text>
              <TouchableOpacity onPress={() => stepMonth(1)} style={styles.calNav}><Text style={styles.calNavTxt}>›</Text></TouchableOpacity>
            </View>
            <View style={styles.calDows}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.calDow}>{d}</Text>)}</View>
            <View style={styles.calGrid}>
              {cells.map((day, i) => {
                if (!day) return <View key={i} style={styles.calCell} />;
                const key = `${view.y}-${pad(view.m + 1)}-${pad(day)}`;
                const avail = bookable.has(key) && key >= todayKey;
                const sel = dateKey === key;
                return (
                  <TouchableOpacity key={i} style={styles.calCell} disabled={!avail} onPress={() => { setDateKey(key); setSlot(null); }}>
                    <View style={[styles.calDay, sel && styles.calDaySel, avail && !sel && styles.calDayAvail]}>
                      <Text style={[styles.calDayTxt, sel && styles.calDayTxtSel, !avail && styles.calDayTxtOff]}>{day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {!!dateKey && (
            <View style={styles.selDate}>
              <Image source={ICONS.calendar} style={styles.selDateIcon} />
              <Text style={styles.selDateTxt}>{fmtDate(dateKey)}{item.durationLabel ? `  ·  ${item.durationLabel}` : ''}</Text>
            </View>
          )}

          {/* Time slots — single slidable row */}
          {!!dateKey && slots.length > 0 && (
            <>
              <Text style={styles.label}>Available time slots</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
                {slots.map((t) => {
                  const on = slot && slot.start === t.start && slot.end === t.end;
                  return (
                    <TouchableOpacity key={`${t.start}-${t.end}`} onPress={() => setSlot(t)} style={[styles.slotChip, on && styles.slotChipOn]}>
                      <Image source={ICONS.clock} style={[styles.slotIcon, on && { tintColor: colors.brandText }]} />
                      <Text style={[styles.slotTxt, on && styles.slotTxtOn]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Guests */}
          {!!dateKey && (
            <>
              <Text style={styles.label}>Guests</Text>
              <View style={styles.guestCard}>
                <Stepper label="Adults" sub={`${formatMoney(b.adultPrice, item.currency)} each${item.capacity ? ` · up to ${item.capacity}` : ''}`} value={adults} setValue={setAdults} min={1} max={item.capacity || 30} />
                {b.childBand && (
                  <Stepper label={`Children (${b.childBand.startAge}–${b.childBand.endAge} yrs)`} sub={`${formatMoney(b.childPrice, item.currency)} each`} value={children} setValue={setChildren} min={0} max={item.capacity || 30} />
                )}
                <View style={styles.guestPrice}>
                  <Text style={styles.guestPriceTxt}>{formatMoney(b.adultPrice, item.currency)} × {guests} guest{guests > 1 ? 's' : ''}</Text>
                  <Text style={styles.guestPriceVal}>{formatMoney(b.subtotal, item.currency)}</Text>
                </View>
              </View>

              {/* Primary guest (optional) — opens a center popup */}
              <TouchableOpacity style={styles.guestToggle} onPress={() => setShowGuest(true)}>
                <Image source={ICONS.people} style={styles.guestToggleIcon} />
                <Text style={styles.guestToggleTxt}>{guest.name.trim() ? `Primary guest: ${guest.name.trim()}` : 'Add primary guest details (optional)'}</Text>
                <Text style={styles.guestToggleChev}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      {/* ───────── STEP 2: review ───────── */}
      {step === 2 && (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.bigQ}>Review your booking</Text>

          <View style={styles.expCard}>
            <Image source={{ uri: resolveImage(item.mainImage) || DUMMY_IMAGE }} style={styles.expImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.expName} numberOfLines={2}>{item.name}</Text>
              <View style={styles.expLoc}><Image source={ICONS.locGray} style={styles.tinyLoc} /><Text style={styles.expLocTxt}>{item.city || item.location}</Text></View>
              <Text style={styles.expRating}><Text style={{ color: colors.star }}>★ </Text>{Number(item.rating).toFixed(1)}{item.reviewsCount ? ` (${item.reviewsCount})` : ''}</Text>
            </View>
          </View>

          <Section title="Your trip">
            <KV k="Date" v={fmtDate(dateKey)} />
            {!!slot && <KV k="Time" v={slot.label} />}
            <KV k="Guests" v={`${guests} guest${guests > 1 ? 's' : ''}`} />
            {!!item.durationLabel && <KV k="Duration" v={item.durationLabel} />}
            <KV k="Language" v="English" />
            <KV k="Primary guest" v={primaryName} last />
          </Section>

          <Section title="Price details">
            <KV k={`${formatMoney(b.adultPrice, item.currency)} × ${guests} guest${guests > 1 ? 's' : ''}`} v={formatMoney(b.subtotal, item.currency)} />
            {b.discountAmt > 0 && <KV k="Discount" v={`− ${formatMoney(b.discountAmt, item.currency)}`} green />}
            {b.gstAmt > 0 && <KV k={`GST (${item.gstRate}%)`} v={formatMoney(b.gstAmt, item.currency)} />}
            {b.convAmt > 0 && <KV k="reconnct service fee" v={formatMoney(b.convAmt, item.currency)} />}
            <View style={styles.kvDivider} />
            <KV k="Total (INR)" v={formatMoney(b.total, item.currency)} bold last />
          </Section>

          <View style={styles.cancelNote}>
            <Image source={ICONS.shield} style={styles.cancelIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelTitle}>Free cancellation — up to 24 hrs before</Text>
              <Text style={styles.cancelSub}>Cancel up to 24 hours before your experience starts for a full refund.</Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ───────── STEP 3: Cashfree payment ───────── */}
      {step === 3 && (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.bigQ}>Complete your payment</Text>
          <View style={styles.dueBox}><Text style={styles.dueTxt}>{formatMoney(payTotal, item.currency)} due today</Text></View>

          <View style={styles.cashfreeCard}>
            {paying ? (
              <><ActivityIndicator color={colors.brand} /><Text style={styles.cashfreeWait}>Opening secure Cashfree checkout…</Text></>
            ) : checkedOnce ? (
              <>
                <View style={styles.notPaidIcon}><Text style={styles.notPaidIconTxt}>!</Text></View>
                <Text style={styles.cashfreeTitle}>Payment not completed</Text>
                <Text style={styles.cashfreeSub}>We couldn't confirm your payment. If money was deducted it'll reflect automatically in a few minutes — otherwise nothing was charged and you can try again.</Text>
                {!!payLink && (
                  <TouchableOpacity style={[styles.cashfreeReopen, styles.cashfreeRetry]} onPress={retryPayment}>
                    <Image source={ICONS.card} style={styles.cashfreeReopenIcon} />
                    <Text style={styles.cashfreeReopenTxt}>Pay Again</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <ActivityIndicator color={colors.brand} />
                <Text style={styles.cashfreeTitle}>Waiting for payment…</Text>
                <Text style={styles.cashfreeSub}>Finish paying in the Cashfree checkout — we’ll confirm automatically and take you to your booking. No need to tap anything.</Text>
                {!!payLink && (
                  <>
                    <TouchableOpacity style={styles.cashfreeReopen} onPress={() => setShowPayWeb(true)}>
                      <Image source={ICONS.card} style={styles.cashfreeReopenIcon} />
                      <Text style={styles.cashfreeReopenTxt}>Reopen Cashfree payment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cashfreeBrowser} onPress={() => Linking.openURL(payLink).catch(() => {})}>
                      <Text style={styles.cashfreeBrowserTxt}>Open in browser instead ↗</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>

          <View style={styles.payTotals}>
            <KV k="Booking ID" v={bookingCode || '—'} />
            <KV k="Total" v={formatMoney(payTotal, item.currency)} bold last />
          </View>
          <View style={styles.secure}>
            <Image source={ICONS.shield} style={styles.secureIcon} />
            <Text style={styles.secureTxt}>Payments handled securely by Cashfree (sandbox)</Text>
          </View>
        </ScrollView>
      )}

      {/* NOTE: the custom Card / UPI form is parked for later (Cashfree handles
          payment for now). Kept here intentionally, not rendered.
      {false && (
        <View>...card / upi form...</View>
      )} */}

      {/* ───────── STEP 4: confirmation ───────── */}
      {step === 4 && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.doneHero, { paddingTop: insets.top + 30 }]}>
            <View style={styles.doneCheck}><Image source={ICONS.check} style={styles.doneCheckIcon} /></View>
            <Text style={styles.doneTitle}>You’re all set!</Text>
            <Text style={styles.doneSub}>Payment received — a voucher has been emailed to you.</Text>
          </View>

          <View style={styles.doneCard}>
            <View style={styles.doneImgWrap}>
              <Image source={{ uri: resolveImage(item.mainImage) || DUMMY_IMAGE }} style={styles.doneImg} />
              <Image source={ICONS.cardGradient} style={styles.doneImgGrad} resizeMode="stretch" />
              <View style={styles.doneImgText}>
                <Text style={styles.doneImgName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.doneImgLoc} numberOfLines={1}>{item.city || item.location}</Text>
              </View>
            </View>
            <View style={styles.doneRows}>
              <KV k="Booking ID" v={bookingCode} />
              <KV k="Date" v={fmtDate(dateKey)} />
              <KV k="Guests" v={`${guests} guest${guests > 1 ? 's' : ''}`} />
              <KV k="Total paid" v={formatMoney(payTotal, item.currency)} bold last />
            </View>
          </View>

          <View style={styles.doneBtns}>
            <TouchableOpacity style={styles.doneBtnPrimary} onPress={() => { navigateTab('profile'); push('bookings'); }}>
              <Text style={styles.doneBtnPrimaryTxt}>View trips</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtnGhost} onPress={() => shareExperience(item)}>
              <Image source={ICONS.share} style={{ width: 16, height: 16, tintColor: colors.ink }} />
              <Text style={styles.doneBtnGhostTxt}>Share</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigateTab('home')}><Text style={styles.backExplore}>Back to explore</Text></TouchableOpacity>
        </ScrollView>
      )}

      {/* Sticky action bar (steps 1–3) */}
      {step < 4 && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
          {step === 1 && <Action label="Choose guests & continue" onPress={next1} enabled={!!dateKey && (!slots.length || !!slot)} />}
          {step === 2 && <Action label={`Continue to payment  ${formatMoney(b.total, item.currency)}`} onPress={startPayment} enabled />}
          {step === 3 && (
            <View style={styles.waitRow}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.waitTxt}>Waiting for payment confirmation… this updates automatically</Text>
            </View>
          )}
        </View>
      )}

      {/* In-app Cashfree checkout */}
      <PaymentWebView
        visible={showPayWeb}
        url={payLink}
        onClose={() => { setShowPayWeb(false); checkStatus(); }}
        onReturn={() => { setShowPayWeb(false); checkStatus(); }}
      />

      {/* Primary guest popup */}
      <Modal visible={showGuest} transparent animationType="fade" onRequestClose={() => setShowGuest(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowGuest(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Primary guest details</Text>
              <TouchableOpacity onPress={() => setShowGuest(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Who should we put on the booking? Leave blank to use your account.</Text>
            <Field placeholder="Full name" value={guest.name} onChangeText={(t) => setGuest({ ...guest, name: t })} />
            <View style={{ height: 10 }} />
            <Field placeholder="Phone" value={guest.phone} onChangeText={(t) => setGuest({ ...guest, phone: t })} keyboardType="phone-pad" />
            <View style={{ height: 10 }} />
            <Field placeholder="Email" value={guest.email} onChangeText={(t) => setGuest({ ...guest, email: t })} keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={styles.modalSave} onPress={() => setShowGuest(false)} activeOpacity={0.9}>
              <Text style={styles.modalSaveTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── small pieces ──────────────────────────────────────────────────────────
function Stepper({ label, sub, value, setValue, min = 0, max = 30 }) {
  return (
    <View style={styles.stepperRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepperLabel}>{label}</Text>
        {!!sub && <Text style={styles.stepperSub}>{sub}</Text>}
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => setValue(Math.max(min, value - 1))}><Text style={styles.stepSign}>−</Text></TouchableOpacity>
        <Text style={styles.stepVal}>{value}</Text>
        <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus]} onPress={() => setValue(Math.min(max, value + 1))}><Text style={[styles.stepSign, { color: '#fff' }]}>＋</Text></TouchableOpacity>
      </View>
    </View>
  );
}
function Field(props) { return <TextInput {...props} placeholderTextColor={colors.inkFaint} style={styles.field} />; }
function Label({ children }) { return <Text style={styles.fieldLabel}>{children}</Text>; }
function Section({ title, children }) { return (<View style={styles.sectionBox}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>); }
function KV({ k, v, bold, green, last }) {
  return (
    <View style={[styles.kv, !last && styles.kvBorder]}>
      <Text style={[styles.kvK, bold && styles.kvBold]}>{k}</Text>
      <Text style={[styles.kvV, bold && styles.kvBold, green && { color: colors.success }]}>{v}</Text>
    </View>
  );
}
function Action({ label, onPress, enabled }) {
  return (
    <TouchableOpacity style={[styles.action, !enabled && styles.actionOff]} onPress={onPress} disabled={!enabled} activeOpacity={0.9}>
      <Text style={styles.actionTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

const CELL = `${100 / 7}%`;
const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  backIcon: { fontSize: 24, color: colors.ink, marginTop: -2 },
  hTitle: { fontSize: font.h3, fontWeight: '800', color: colors.ink },
  hStep: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 1 },
  hTotal: { fontSize: font.body, fontWeight: '900', color: colors.price },
  progress: { flexDirection: 'row', gap: 6, marginTop: 10 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressOn: { backgroundColor: colors.brand },

  bigQ: { fontSize: font.h1, fontWeight: '800', color: colors.ink },
  sub: { fontSize: font.body, color: colors.inkMuted, marginTop: 4 },
  label: { fontSize: font.body, fontWeight: '800', color: colors.ink, marginTop: 20, marginBottom: 10 },

  calendar: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12, marginTop: 16, ...shadow.card },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  calNav: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  calNavTxt: { fontSize: 20, color: colors.ink, marginTop: -2 },
  calMonth: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  calDows: { flexDirection: 'row' },
  calDow: { width: CELL, textAlign: 'center', fontSize: font.tiny, color: colors.inkFaint, fontWeight: '700', marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: CELL, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calDayAvail: { backgroundColor: colors.brandSoft },
  calDaySel: { backgroundColor: colors.brand },
  calDayTxt: { fontSize: font.body, color: colors.ink, fontWeight: '600' },
  calDayTxtSel: { color: '#fff', fontWeight: '800' },
  calDayTxtOff: { color: colors.inkFaint, fontWeight: '400' },

  selDate: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: 12, marginTop: 14 },
  selDateIcon: { width: 18, height: 18, tintColor: colors.brandText },
  selDateTxt: { color: colors.brandText, fontWeight: '700', fontSize: font.body },

  slotRow: { flexDirection: 'row', gap: 8, paddingVertical: 2, paddingRight: 8 },
  slotChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill },
  slotChipOn: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  slotIcon: { width: 14, height: 14, tintColor: colors.inkMuted },
  slotTxt: { color: colors.ink, fontWeight: '600', fontSize: font.small },
  slotTxtOn: { color: colors.brandText },

  guestCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 6, ...shadow.card },
  stepperRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  stepperLabel: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  stepperSub: { fontSize: font.small, color: colors.inkMuted, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  stepBtnPlus: { backgroundColor: colors.brand },
  stepSign: { fontSize: 18, color: colors.brand, fontWeight: '800' },
  stepVal: { fontSize: font.h3, fontWeight: '800', color: colors.ink, minWidth: 22, textAlign: 'center' },
  guestPrice: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  guestPriceTxt: { fontSize: font.small, color: colors.inkMuted },
  guestPriceVal: { fontSize: font.body, fontWeight: '800', color: colors.ink },

  guestToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  guestToggleIcon: { width: 18, height: 18, tintColor: colors.brand },
  guestToggleTxt: { flex: 1, fontSize: font.body, fontWeight: '600', color: colors.ink },
  guestToggleChev: { fontSize: 18, color: colors.inkMuted },
  guestForm: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, marginTop: 8, gap: 10, borderWidth: 1, borderColor: colors.border },
  guestNote: { fontSize: font.tiny, color: colors.inkMuted },

  field: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 14, height: 48, fontSize: font.body, color: colors.ink, borderWidth: 1, borderColor: colors.border },
  fieldLabel: { fontSize: font.small, fontWeight: '700', color: colors.inkMuted, marginTop: 14, marginBottom: 6 },
  fieldIconWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: colors.border },
  fieldIcon: { width: 18, height: 18, tintColor: colors.inkFaint, marginRight: 8 },
  fieldIconInput: { flex: 1, fontSize: font.body, color: colors.ink, paddingVertical: 0 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: font.h3, fontWeight: '800', color: colors.ink },
  modalClose: { fontSize: 18, color: colors.inkMuted, padding: 4 },
  modalSub: { fontSize: font.small, color: colors.inkMuted, marginTop: 4, marginBottom: 14, lineHeight: 18 },
  modalSave: { backgroundColor: colors.brand, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  modalSaveTxt: { color: '#fff', fontWeight: '800', fontSize: font.h3 },

  expCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 10, marginTop: 16, ...shadow.card },
  expImg: { width: 70, height: 70, borderRadius: radius.md, backgroundColor: '#DCE0E6' },
  expName: { fontSize: font.body, fontWeight: '700', color: colors.ink },
  expLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tinyLoc: { width: 12, height: 12 },
  expLocTxt: { fontSize: font.small, color: colors.inkMuted },
  expRating: { fontSize: font.small, color: colors.ink, fontWeight: '700', marginTop: 4 },

  sectionBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginTop: 14, ...shadow.card },
  sectionTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  kvBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  kvK: { fontSize: font.body, color: colors.inkMuted },
  kvV: { fontSize: font.body, color: colors.ink, fontWeight: '700' },
  kvBold: { fontWeight: '900', color: colors.ink, fontSize: font.h3 },
  kvDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  cancelNote: { flexDirection: 'row', gap: 10, backgroundColor: '#F0FDF4', borderRadius: radius.md, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#BBF7D0' },
  cancelIcon: { width: 20, height: 20, tintColor: colors.success },
  cancelTitle: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  cancelSub: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2, lineHeight: 16 },

  dueBox: { alignSelf: 'flex-start', backgroundColor: colors.brandSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: 10 },
  dueTxt: { color: colors.brandText, fontWeight: '800', fontSize: font.small },
  payTabs: { flexDirection: 'row', gap: 10, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4, marginTop: 16 },
  payTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: radius.sm },
  payTabOn: { backgroundColor: colors.surface, ...shadow.card },
  payTabIcon: { width: 18, height: 18, tintColor: colors.inkMuted },
  payTabTxt: { fontSize: font.body, fontWeight: '700', color: colors.inkMuted },
  payTabTxtOn: { color: colors.ink },
  upiHint: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 6 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 16 },
  secureIcon: { width: 16, height: 16, tintColor: colors.success },
  secureTxt: { fontSize: font.small, color: colors.inkMuted, flex: 1 },
  payTotals: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginTop: 16, ...shadow.card },
  cashfreeCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, marginTop: 16, alignItems: 'center', ...shadow.card },
  cashfreeShield: { width: 40, height: 40, tintColor: colors.brand },
  cashfreeWait: { color: colors.inkMuted, marginTop: 12, fontSize: font.body },
  cashfreeTitle: { fontSize: font.h3, fontWeight: '800', color: colors.ink, marginTop: 12 },
  cashfreeSub: { fontSize: font.small, color: colors.inkMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  cashfreeReopen: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.brandSoft, paddingHorizontal: 18, height: 46, borderRadius: radius.pill, marginTop: 16 },
  cashfreeReopenIcon: { width: 18, height: 18, tintColor: colors.brandText },
  cashfreeReopenTxt: { color: colors.brandText, fontWeight: '800', fontSize: font.body },
  cashfreeBrowser: { marginTop: 10 },
  cashfreeBrowserTxt: { color: colors.inkMuted, fontWeight: '700', fontSize: font.small },
  notPaidIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  notPaidIconTxt: { color: '#DC2626', fontSize: 26, fontWeight: '900' },
  cashfreeRetry: { backgroundColor: colors.brand },

  doneHero: { backgroundColor: colors.brand, alignItems: 'center', paddingBottom: 40, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  doneCheck: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow.card },
  doneCheckIcon: { width: 40, height: 40, tintColor: colors.brand },
  doneTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginTop: 16 },
  doneSub: { fontSize: font.body, color: 'rgba(255,255,255,0.92)', marginTop: 4 },
  doneCard: { backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: space.lg, marginTop: 18, overflow: 'hidden', ...shadow.card },
  doneImgWrap: { height: 140, position: 'relative', backgroundColor: '#DCE0E6' },
  doneImg: { width: '100%', height: '100%' },
  doneImgGrad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%' },
  doneImgText: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  doneImgName: { color: '#fff', fontSize: font.h3, fontWeight: '800' },
  doneImgLoc: { color: 'rgba(255,255,255,0.92)', fontSize: font.small, marginTop: 1 },
  doneRows: { padding: 14 },
  doneBtns: { flexDirection: 'row', gap: 12, marginHorizontal: space.lg, marginTop: 18 },
  doneBtnPrimary: { flex: 1, backgroundColor: colors.brand, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  doneBtnPrimaryTxt: { color: '#fff', fontWeight: '800', fontSize: font.h3 },
  doneBtnGhost: { flex: 1, flexDirection: 'row', gap: 8, borderWidth: 1.5, borderColor: colors.border, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  doneBtnGhostTxt: { color: colors.ink, fontWeight: '800', fontSize: font.h3 },
  backExplore: { textAlign: 'center', color: colors.inkMuted, fontWeight: '700', marginTop: 18 },

  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  action: { backgroundColor: colors.brand, height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionOff: { opacity: 0.45 },
  actionTxt: { color: '#fff', fontWeight: '800', fontSize: font.h3 },
  terms: { textAlign: 'center', fontSize: font.tiny, color: colors.inkMuted, marginTop: 8 },
  waitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54 },
  waitTxt: { flex: 1, fontSize: font.small, color: colors.inkMuted, fontWeight: '600' },
});
