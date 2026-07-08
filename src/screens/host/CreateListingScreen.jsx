import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Switch, Alert, Modal, Pressable, Dimensions, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, font, space, shadow } from '../../theme';
import { useNav } from '../../navigation/NavContext';
import { useHost } from '../../store/HostContext';
import { ICONS } from '../../icons';
import { pickFromDevice } from '../../utils/imagePicker';
import TaxonomyPicker from './TaxonomyPicker';

// Fixed square photo/video tile — 3 per row (matches Figma's 114px on a 390 screen).
const TILE = Math.floor((Dimensions.get('window').width - 16 * 2 - 10 * 2) / 3);
const STEPS = ['Basic info', 'Description', 'Pricing', 'Photos'];
const DURATIONS = [
  { label: '1 hr', h: 1, m: 0 },
  { label: '2 hrs', h: 2, m: 0 },
  { label: '3 hrs', h: 3, m: 0 },
  { label: '4 hrs', h: 4, m: 0 },
];
const FACILITIES = ['Restrooms', 'Parking', 'Locker', 'Wifi', 'Cafe', 'First Aid', 'Changing Room', 'Guide', 'Equipment'];
const PRICE_METHODS = [
  { value: 'per_person', label: 'Per person' },
  { value: 'per_day', label: 'Per day' },
  { value: 'days', label: 'Days (multi-day)' },
  { value: 'per_hours', label: 'By hours' },
];
// Used only as the listing thumbnail if the host added no photos at all.
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80';

const blank = {
  audiences: [], categoryId: null, typeId: null, typeName: '',
  name: '', location: '', city: '', nearbyLocation: '', durationLabel: '',
  about: '', mode: 'offline',
  // One empty row open by default so the "What's included" / "Nearby" editors
  // read as ready-to-fill boxes (host can delete them to close).
  inclusions: [''], facilities: [], nearbyPlaces: [{ name: '', distance: '', unit: 'km' }], faqs: [],
  termsConditions: '', privacyPolicy: '', refundCancellationPolicy: '',
  priceMethod: 'per_person', adultPrice: '', childrenEnabled: false, childBands: [],
  capacity: 8, durationHours: 0, durationMinutes: 0,
  schedule: { dates: [] }, // { dates:[{date:'YYYY-MM-DD', slots:[{start,end}]}], slotMode }
  photos: [], videos: [],
};

export default function CreateListingScreen() {
  const insets = useSafeAreaInsets();
  const { pop, navigateTab } = useNav();
  const { addListing, listingDraft, saveListingDraft, clearListingDraft } = useHost();
  // Restore an in-progress draft (data + step) so nothing is lost on back/exit.
  const [step, setStep] = useState(() => (listingDraft && listingDraft.step) || 1);
  const [form, setForm] = useState(() => (listingDraft && listingDraft.form) || blank);
  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  // Persist the draft on every change (data survives leaving the wizard).
  useEffect(() => { saveListingDraft({ form, step }); }, [form, step, saveListingDraft]);

  // Device/system back → go one step back; only exit the wizard from step 1.
  useEffect(() => {
    const onBack = () => { if (step > 1) { setStep((s) => s - 1); return true; } return false; };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [step]);

  const canNext = useMemo(() => {
    if (step === 1) return !!form.name.trim() && !!form.categoryId && !!form.typeId;
    return true;
  }, [step, form]);

  const goNext = () => {
    if (step === 1 && !canNext) {
      if (!form.name.trim()) return Alert.alert('Name required', 'Give your experience a name.');
      if (!form.categoryId) return Alert.alert('Pick a category', 'Choose a broad category.');
      if (!form.typeId) return Alert.alert('Pick a type', 'Choose a type of activity / event.');
    }
    setStep((s) => Math.min(4, s + 1));
  };
  const goBack = () => (step > 1 ? setStep((s) => s - 1) : pop());

  const [submitting, setSubmitting] = useState(false);
  const submit = async (isReview) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Give the listing a cover fallback if the host added no photos at all.
      const payload = form.photos.length ? form : { ...form, photos: [FALLBACK_IMAGE] };
      await addListing(payload, isReview);
      clearListingDraft();
      Alert.alert(
        isReview ? 'Submitted for review' : 'Saved as draft',
        isReview
          ? `“${form.name.trim()}” is now pending approval — you’ll be notified once it’s live.`
          : `“${form.name.trim()}” is saved as a draft in your listings.`,
        [{ text: 'OK', onPress: () => { navigateTab('listings'); } }],
      );
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header + progress */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.back} onPress={goBack}><Text style={styles.backIcon}>‹</Text></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.hTitle}>{STEPS[step - 1]}</Text>
            <Text style={styles.hStep}>Step {step} of 4</Text>
          </View>
        </View>
        <View style={styles.progress}>
          {[1, 2, 3, 4].map((s) => <View key={s} style={[styles.seg, s <= step && styles.segOn]} />)}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 130 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 1 && <Step1 form={form} patch={patch} />}
        {step === 2 && <Step2 form={form} patch={patch} />}
        {step === 3 && <Step3 form={form} patch={patch} />}
        {step === 4 && <Step4 form={form} patch={patch} />}
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        {step < 4 ? (
          <TouchableOpacity style={[styles.primary, !canNext && styles.primaryOff]} onPress={goNext} disabled={!canNext} activeOpacity={0.9}>
            <Text style={styles.primaryText}>Next ›</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.finalRow}>
            <TouchableOpacity style={[styles.ghost, submitting && styles.primaryOff]} disabled={submitting} onPress={() => submit(false)} activeOpacity={0.9}>
              <Text style={styles.ghostText}>{submitting ? 'Saving…' : 'Save Draft'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primary, { flex: 1.4 }, submitting && styles.primaryOff]} disabled={submitting} onPress={() => submit(true)} activeOpacity={0.9}>
              <Text style={styles.primaryText}>{submitting ? 'Submitting…' : 'Submit for Review'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

/* ───────────────────────── STEP 1 — basic info ───────────────────────── */
function Step1({ form, patch }) {
  return (
    <View style={{ gap: 18 }}>
      <Text style={styles.bigQ}>Let’s start with the basics</Text>
      <TaxonomyPicker value={form} onChange={patch} />
      <Divider />
      <Field label="Experience Title" value={form.name} onChangeText={(t) => patch({ name: t })} placeholder="e.g. Sunrise Kayaking at Goa Beach" />
      <Field label="Location" value={form.location} onChangeText={(t) => patch({ location: t })} placeholder="City, State, Country" />
      <Field label="City" value={form.city} onChangeText={(t) => patch({ city: t })} placeholder="e.g. Goa" />
      <DurationField form={form} patch={patch} />
    </View>
  );
}

// Duration drives the time-slot length. Hour presets + a custom (hrs/min) adder.
function DurationField({ form, patch }) {
  const [custom, setCustom] = useState(false);
  const isPreset = (d) => form.durationLabel === d.label;
  const customActive = !!form.durationLabel && !DURATIONS.some((d) => d.label === form.durationLabel);
  return (
    <View>
      <Label>Duration</Label>
      <Text style={styles.hint}>Used as the time-slot length in availability.</Text>
      <Chips>
        {DURATIONS.map((d) => (
          <Chip key={d.label} active={isPreset(d)} onPress={() => patch({ durationLabel: d.label, durationHours: d.h, durationMinutes: d.m })}>{d.label}</Chip>
        ))}
        {customActive && <Chip active onPress={() => setCustom(true)}>{form.durationLabel}</Chip>}
        <Chip active={false} onPress={() => setCustom((v) => !v)}>＋ Custom</Chip>
      </Chips>
      {custom && (
        <View style={[styles.durRow, { marginTop: 10 }]}>
          <SmallNum label="Hours" value={form.durationHours} onChange={(v) => patch({ durationHours: v })} suffix="hrs" />
          <SmallNum label="Minutes" value={form.durationMinutes} onChange={(v) => patch({ durationMinutes: Math.min(59, v) })} suffix="min" />
          <TouchableOpacity style={[styles.addBtn, { alignSelf: 'flex-end' }]} onPress={() => {
            const h = Number(form.durationHours) || 0; const m = Number(form.durationMinutes) || 0;
            patch({ durationLabel: `${h}h${m ? ` ${m}m` : ''}` }); setCustom(false);
          }}><Text style={styles.addBtnText}>Set</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ───────────────────────── STEP 2 — description ──────────────────────── */
function Step2({ form, patch }) {
  return (
    <View style={{ gap: 20 }}>
      <Text style={styles.bigQ}>Describe your experience</Text>
      <Field label="About this activity / event" value={form.about} onChangeText={(t) => patch({ about: t })}
        placeholder="What will guests experience? What makes it unique?" multiline />

      <View>
        <Label>Mode</Label>
        <Chips>
          {['offline', 'online', 'hybrid'].map((m) => (
            <Chip key={m} active={form.mode === m} onPress={() => patch({ mode: m })}>{m[0].toUpperCase() + m.slice(1)}</Chip>
          ))}
        </Chips>
      </View>

      <ListEditor label="What's included" placeholder="Describe what's included…" addLabel="Add inclusion"
        value={form.inclusions} onChange={(v) => patch({ inclusions: v })} />

      <View>
        <Label>Facilities</Label>
        <Text style={styles.hint}>Pick from the list or add your own.</Text>
        <Chips>
          {[...FACILITIES, ...form.facilities.filter((f) => !FACILITIES.includes(f))].map((f) => {
            const on = form.facilities.includes(f);
            return <Chip key={f} active={on} onPress={() => patch({ facilities: on ? form.facilities.filter((x) => x !== f) : [...form.facilities, f] })}>{on ? '✓ ' : ''}{f}</Chip>;
          })}
        </Chips>
        <AddCustom placeholder="Add facility" onAdd={(t) => !form.facilities.includes(t) && patch({ facilities: [...form.facilities, t] })} />
      </View>

      <NearbyEditor value={form.nearbyPlaces} onChange={(v) => patch({ nearbyPlaces: v })} />

      <FaqEditor value={form.faqs} onChange={(v) => patch({ faqs: v })} />

      <View style={{ gap: 14 }}>
        <Label>Policies &amp; terms</Label>
        <Field label="Terms & Conditions" value={form.termsConditions} onChangeText={(t) => patch({ termsConditions: t })} placeholder="e.g. Arrive 15 minutes early…" multiline />
        <Field label="Privacy Policy" value={form.privacyPolicy} onChangeText={(t) => patch({ privacyPolicy: t })} placeholder="How you handle guest data…" multiline />
        <Field label="Refund & Cancellation Policy" value={form.refundCancellationPolicy} onChangeText={(t) => patch({ refundCancellationPolicy: t })} placeholder="e.g. Free cancellation up to 24 hrs before…" multiline />
      </View>
    </View>
  );
}

/* ───────────────────────── STEP 3 — pricing + availability ───────────── */
function Step3({ form, patch }) {
  const addBand = () => {
    const last = form.childBands[form.childBands.length - 1];
    const start = last ? Math.min(14, Number(last.endAge) + 1) : 0;
    patch({ childBands: [...form.childBands, { startAge: start, endAge: Math.min(14, start + 4), charge: true, price: '' }] });
  };
  const setBand = (i, p) => patch({ childBands: form.childBands.map((b, idx) => (idx === i ? { ...b, ...p } : b)) });
  const removeBand = (i) => patch({ childBands: form.childBands.filter((_, idx) => idx !== i) });

  return (
    <View style={{ gap: 20 }}>
      <Text style={styles.bigQ}>Set your price</Text>

      <View>
        <Label>Price method</Label>
        <Chips>
          {PRICE_METHODS.map((m) => <Chip key={m.value} active={form.priceMethod === m.value} onPress={() => patch({ priceMethod: m.value })}>{m.label}</Chip>)}
        </Chips>
      </View>

      <MoneyField label="Adult price" value={form.adultPrice} onChangeText={(t) => patch({ adultPrice: t })} suffix={`/ ${form.priceMethod === 'per_day' || form.priceMethod === 'days' ? 'day' : 'person'}`} />

      {/* Children pricing */}
      <View style={styles.box}>
        <View style={styles.boxHead}>
          <Text style={styles.boxTitle}>Add children pricing</Text>
          <Switch value={form.childrenEnabled} onValueChange={(v) => patch({ childrenEnabled: v, childBands: v && form.childBands.length === 0 ? [{ startAge: 0, endAge: 5, charge: false, price: '' }] : form.childBands })}
            trackColor={{ true: colors.brand, false: '#CBD0D8' }} thumbColor="#fff" />
        </View>
        {form.childrenEnabled && (
          <View style={{ gap: 10, marginTop: 12 }}>
            <Text style={styles.hint}>Define age bands (years). Turn “Set a price” off to make a band free.</Text>
            {form.childBands.map((b, i) => (
              <View key={i} style={styles.band}>
                <View style={styles.bandAges}>
                  <SmallNum label="Min Age" value={b.startAge} onChange={(v) => setBand(i, { startAge: v })} />
                  <Text style={styles.toText}>to</Text>
                  <SmallNum label="Max Age" value={b.endAge} onChange={(v) => setBand(i, { endAge: v })} />
                </View>
                <View style={styles.bandPrice}>
                  <TouchableOpacity style={styles.checkRow} onPress={() => setBand(i, { charge: !b.charge })}>
                    <View style={[styles.checkbox, b.charge && styles.checkboxOn]}>{b.charge && <Text style={styles.checkboxTick}>✓</Text>}</View>
                    <Text style={styles.checkLabel}>Set a price</Text>
                  </TouchableOpacity>
                  {b.charge ? (
                    <MoneyField small value={b.price} onChangeText={(t) => setBand(i, { price: t })} />
                  ) : <Text style={styles.freeText}>Free</Text>}
                  <TouchableOpacity onPress={() => removeBand(i)} style={styles.bandTrash}><Image source={ICONS.trash} style={styles.bandTrashIcon} /></TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={addBand}><Text style={styles.addLink}>＋ Add age band</Text></TouchableOpacity>
          </View>
        )}
      </View>

      {/* Guests per session */}
      <View style={styles.guestBox}>
        <Text style={styles.guestLabel}>Guests per session</Text>
        <Stepper value={form.capacity} onChange={(v) => patch({ capacity: v })} min={1} max={100} bare />
      </View>

      {/* Availability */}
      <Availability form={form} patch={patch} />
    </View>
  );
}

/* ───────────────────────── STEP 4 — photos & videos ──────────────────── */
function Step4({ form, patch }) {
  const [picker, setPicker] = useState(null); // 'photo' | 'video' | null
  const add = (url) => {
    if (picker === 'photo') patch({ photos: [...form.photos, url] });
    else if (picker === 'video') patch({ videos: [...form.videos, url] });
    setPicker(null);
  };
  return (
    <View style={{ gap: 22 }}>
      <Text style={styles.bigQ}>Add photos &amp; videos</Text>
      <Text style={styles.hint}>Pick from your device or paste a URL. The first photo is your cover.</Text>

      <PhotoGrid
        items={form.photos}
        onAdd={() => setPicker('photo')}
        onRemove={(i) => patch({ photos: form.photos.filter((_, idx) => idx !== i) })}
      />
      <MediaSection
        title="Videos" kind="video" items={form.videos}
        onAdd={() => setPicker('video')}
        onRemove={(i) => patch({ videos: form.videos.filter((_, idx) => idx !== i) })}
      />

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
          <UrlPicker kind={picker} onPick={add} onClose={() => setPicker(null)} />
        </View>
      </Modal>
    </View>
  );
}

// Fixed 6-slot photo grid (Figma "Add photos"): first slot is the Cover with a
// gold + on a light-gold dashed tile; the rest show a gray upload icon centred
// on a gray dashed tile. Filled slots show the photo (+ Cover tag) with a ✕.
const PHOTO_SLOTS = 6;
function PhotoGrid({ items, onAdd, onRemove }) {
  return (
    <View>
      <Label>Photos</Label>
      <Text style={styles.hint}>Great photos increase bookings by up to 3×</Text>
      <View style={styles.grid}>
        {Array.from({ length: PHOTO_SLOTS }).map((_, i) => {
          const url = items[i];
          const isCover = i === 0;
          if (url) {
            return (
              <View key={i} style={styles.tile}>
                <Image source={{ uri: url }} style={styles.tileImg} />
                {isCover && <View style={styles.coverTag}><Text style={styles.coverTagText}>Cover</Text></View>}
                <TouchableOpacity style={styles.tileRemove} onPress={() => onRemove(i)}><Text style={styles.tileRemoveText}>✕</Text></TouchableOpacity>
              </View>
            );
          }
          return (
            <TouchableOpacity key={i} style={[styles.tile, isCover ? styles.coverSlot : styles.uploadSlot]} activeOpacity={0.85} onPress={onAdd}>
              {isCover ? (
                <>
                  <Image source={ICONS.plus} style={styles.coverPlus} />
                  <Text style={styles.coverSlotLabel}>Cover</Text>
                </>
              ) : (
                <Image source={ICONS.upload} style={styles.uploadSlotIcon} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MediaSection({ title, kind, items, onAdd, onRemove }) {
  return (
    <View>
      <Label>{title}</Label>
      <View style={styles.grid}>
        {items.map((url, i) => (
          <View key={`${url}-${i}`} style={styles.tile}>
            {kind === 'photo'
              ? <Image source={{ uri: url }} style={styles.tileImg} />
              : <View style={styles.videoTile}><Image source={ICONS.plane} style={styles.videoIcon} /><Text style={styles.videoUrl} numberOfLines={1}>{url.replace(/^https?:\/\//, '')}</Text></View>}
            {kind === 'photo' && i === 0 && <View style={styles.coverTag}><Text style={styles.coverTagText}>Cover</Text></View>}
            <TouchableOpacity style={styles.tileRemove} onPress={() => onRemove(i)}><Text style={styles.tileRemoveText}>✕</Text></TouchableOpacity>
          </View>
        ))}
        {/* Upload / add-more tile */}
        <TouchableOpacity style={[styles.tile, styles.uploadTile]} activeOpacity={0.85} onPress={onAdd}>
          <Image source={ICONS.upload} style={styles.tileIcon} />
          <Text style={styles.tileLabel}>{items.length ? 'Add more' : `Add ${kind}`}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function UrlPicker({ kind, onPick, onClose }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const fromDevice = async () => {
    setBusy(true);
    try {
      const uri = await pickFromDevice(kind === 'video' ? 'video' : 'photo');
      if (uri) onPick(uri);
    } catch (e) {
      Alert.alert('Gallery', e.message || 'Could not open the device gallery.');
    } finally { setBusy(false); }
  };
  return (
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>Add {kind === 'video' ? 'a video' : 'a photo'}</Text>
      <TouchableOpacity style={styles.deviceBtn} onPress={fromDevice} disabled={busy} activeOpacity={0.9}>
        <Image source={ICONS.upload} style={styles.deviceIcon} />
        <Text style={styles.deviceText}>{busy ? 'Opening…' : `Choose ${kind === 'video' ? 'video' : 'photo'} from device`}</Text>
      </TouchableOpacity>
      <Text style={styles.orText}>or paste a {kind === 'video' ? 'video (YouTube / MP4)' : 'image'} URL</Text>
      <TextInput value={url} onChangeText={setUrl} placeholder="https://…" placeholderTextColor={colors.inkFaint} autoCapitalize="none" autoCorrect={false} style={styles.input} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <TouchableOpacity style={styles.ghost} onPress={onClose}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.primary, { flex: 1.4 }, !url.trim() && styles.primaryOff]} disabled={!url.trim()} onPress={() => onPick(url.trim())}><Text style={styles.primaryText}>Add URL</Text></TouchableOpacity>
      </View>
    </View>
  );
}

/* ───────────────────────── Availability (dates + slots) ──────────────── */
const pad = (n) => String(n).padStart(2, '0');
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const toHHMM = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const fmtTime = (s) => { const [h, m] = s.split(':').map(Number); const ap = h < 12 ? 'AM' : 'PM'; return `${h % 12 || 12}:${pad(m)} ${ap}`; };
const fmtDateShort = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); };

function Availability({ form, patch }) {
  const [calOpen, setCalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState(null); // date string we're editing slots for
  const [bulkOpen, setBulkOpen] = useState(false);
  const schedule = form.schedule || { dates: [] };
  const rows = schedule.dates || [];
  const slotMode = schedule.slotMode || 'manual';
  const dur = (Number(form.durationHours) || 0) * 60 + (Number(form.durationMinutes) || 0) || 60;

  const setRows = (next) => patch({ schedule: { ...schedule, dates: next } });

  // Merge calendar selection: keep slots for surviving dates, drop removed ones.
  const saveDates = (dates, mode) => {
    const existing = new Map(rows.map((r) => [r.date, r.slots]));
    patch({ schedule: { dates: dates.sort().map((d) => ({ date: d, slots: existing.get(d) || [] })), slotMode: mode } });
    setCalOpen(false);
  };
  const removeDate = (d) => setRows(rows.filter((r) => r.date !== d));
  const saveSlots = (d, slots) => { setRows(rows.map((r) => (r.date === d ? { ...r, slots } : r))); setSlotDate(null); };
  const applyToAll = (slots) => { setRows(rows.map((r) => ({ ...r, slots }))); setBulkOpen(false); };
  const editing = slotDate ? rows.find((r) => r.date === slotDate) : null;
  const totalSlots = rows.reduce((n, r) => n + r.slots.length, 0);

  return (
    <View style={{ gap: 12 }}>
      <Label>Availability &amp; scheduling</Label>
      <Text style={styles.hint}>Pick dates, then build time slots for each one. Each slot is {Math.floor(dur / 60)}h{dur % 60 ? ` ${dur % 60}m` : ''} long (from your duration).</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <TouchableOpacity style={styles.datesBtn} onPress={() => setCalOpen(true)} activeOpacity={0.9}>
          <Image source={ICONS.calendar} style={styles.datesIcon} />
          <Text style={styles.datesText}>Manage dates{rows.length ? ` (${rows.length})` : ''}</Text>
        </TouchableOpacity>
        {rows.length > 0 && slotMode === 'dynamic' && (
          <TouchableOpacity style={styles.manageAllBtn} onPress={() => setBulkOpen(true)} activeOpacity={0.9}>
            <Image source={ICONS.clock} style={styles.manageAllIcon} />
            <Text style={styles.manageAllText}>Manage Slots</Text>
          </TouchableOpacity>
        )}
        {rows.length > 0 && <Text style={styles.hint}>{rows.length} date{rows.length > 1 ? 's' : ''} · {totalSlots} slot{totalSlots !== 1 ? 's' : ''}</Text>}
      </View>
      {rows.length > 0 && slotMode === 'dynamic' && (
        <Text style={styles.hint}>Dynamic mode — use “Manage Slots” to apply a slot set to every date at once, or edit a single date below.</Text>
      )}

      {rows.length === 0 ? (
        <Text style={styles.hint}>No dates yet. Tap “Manage dates” to pick available dates.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((r) => (
            <View key={r.date} style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateRowDate}>{fmtDateShort(r.date)}</Text>
                <Text style={styles.dateRowSlots} numberOfLines={1}>
                  {r.slots.length ? r.slots.map((s) => fmtTime(s.start)).join(', ') : 'No slots yet'}
                </Text>
              </View>
              <TouchableOpacity style={styles.manageSlots} onPress={() => setSlotDate(r.date)}>
                <Image source={ICONS.clock} style={styles.manageSlotsIcon} />
                <Text style={styles.manageSlotsText}>Slots{r.slots.length ? ` (${r.slots.length})` : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateRowTrash} onPress={() => removeDate(r.date)}><Image source={ICONS.trash} style={styles.rowTrashIcon} /></TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal visible={calOpen} transparent animationType="slide" onRequestClose={() => setCalOpen(false)}>
        <View style={styles.calBackdrop}>
          <DatesCalendar selected={rows.map((r) => r.date)} initialMode={rows.length ? slotMode : null} onClose={() => setCalOpen(false)} onSave={saveDates} />
        </View>
      </Modal>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setSlotDate(null)}>
        <View style={styles.calBackdrop}>
          {editing && <SlotsModal title={`Slots · ${fmtDateShort(editing.date)}`} slots={editing.slots} durationMinutes={dur} onClose={() => setSlotDate(null)} onSave={(s) => saveSlots(editing.date, s)} />}
        </View>
      </Modal>

      <Modal visible={bulkOpen} transparent animationType="slide" onRequestClose={() => setBulkOpen(false)}>
        <View style={styles.calBackdrop}>
          <SlotsModal title="Manage Slots · applies to every date" slots={[]} durationMinutes={dur} requireApplyAll onClose={() => setBulkOpen(false)} onSave={applyToAll} />
        </View>
      </Modal>
    </View>
  );
}

// Slot editor — build slots manually. Used both for one date and, with
// requireApplyAll, the dynamic-mode bulk editor that applies its result to
// every date at once.
function SlotsModal({ title, slots, durationMinutes, requireApplyAll, onSave, onClose }) {
  const dur = durationMinutes > 0 ? durationMinutes : 60;
  const [list, setList] = useState(slots.map((s) => ({ ...s })));
  const [start, setStart] = useState('09:00');
  const [applyAll, setApplyAll] = useState(false);

  const add = (s) => {
    const end = toHHMM(toMin(s) + dur);
    if (list.some((x) => x.start === s)) { Alert.alert('Slot', 'That slot is already added.'); return; }
    setList((p) => [...p, { start: s, end }].sort((a, b) => toMin(a.start) - toMin(b.start)));
    // Advance the start picker to the next back-to-back slot so tapping
    // "Add slot" repeatedly builds a sequence without retyping times.
    setStart(end);
  };
  const remove = (i) => setList(list.filter((_, idx) => idx !== i));
  const canSave = requireApplyAll ? (list.length > 0 && applyAll) : true;

  return (
    <View style={styles.calCard}>
      <View style={styles.calHeadRow}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
      </View>
      <Text style={styles.hint}>Each slot is {Math.floor(dur / 60)}h{dur % 60 ? ` ${dur % 60}m` : ''} long.</Text>

      {/* Manual single slot */}
      <View style={[styles.durRow, { marginTop: 12 }]}>
        <View><Text style={styles.smallNumLabel}>Start time</Text><TextInput value={start} onChangeText={setStart} placeholder="HH:MM" placeholderTextColor={colors.inkFaint} style={styles.smallInput} /></View>
        <TouchableOpacity style={[styles.addSlotBtn, { alignSelf: 'flex-end' }]} onPress={() => add(start)}><Text style={styles.addSlotText}>＋ Add slot</Text></TouchableOpacity>
      </View>

      {list.length > 0 && (
        <View style={[styles.chips, { marginTop: 12 }]}>
          {list.map((s, i) => (
            <TouchableOpacity key={`${s.start}-${i}`} style={styles.slotChip} onPress={() => remove(i)}>
              <Text style={styles.slotChipText}>{fmtTime(s.start)}–{fmtTime(s.end)}  ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {requireApplyAll && (
        <TouchableOpacity style={styles.checkRow2} onPress={() => setApplyAll((v) => !v)} activeOpacity={0.8}>
          <View style={[styles.checkbox, applyAll && styles.checkboxOn]}>{applyAll && <Text style={styles.checkboxTick}>✓</Text>}</View>
          <Text style={styles.checkLabel}>Apply to all dates</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <TouchableOpacity style={styles.ghost} onPress={onClose}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.primary, { flex: 1.4 }, !canSave && styles.primaryOff]} disabled={!canSave} onPress={() => onSave(list)}>
          <Text style={styles.primaryText}>Save {list.length} slot{list.length !== 1 ? 's' : ''}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Current month + next 11 (never past months, never bound to a calendar year).
const MONTHS_WINDOW = 12;
function DatesCalendar({ selected, initialMode, onSave, onClose }) {
  const today = new Date();
  const startY = today.getFullYear(); const startM = today.getMonth();
  const [offset, setOffset] = useState(0); // 0..11 months ahead of the current month
  const [sel, setSel] = useState(new Set(selected));
  const [mode, setMode] = useState(initialMode);
  const view = useMemo(() => {
    const d = new Date(startY, startM + offset, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }, [offset, startY, startM]);
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const toggle = (key) => { const n = new Set(sel); n.has(key) ? n.delete(key) : n.add(key); setSel(n); };

  const modeRequired = sel.size > 0;
  const canSave = !modeRequired || !!mode;

  return (
    <View style={styles.calCard}>
      <View style={styles.calHeadRow}>
        <Text style={styles.modalTitle}>Select dates</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
      </View>
      <View style={styles.calNavRow}>
        <TouchableOpacity onPress={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} style={[styles.calNav, offset === 0 && styles.calNavOff]}><Text style={styles.calNavTxt}>‹</Text></TouchableOpacity>
        <Text style={styles.calMonth}>{MONTHS_FULL[view.m]} {view.y}</Text>
        <TouchableOpacity onPress={() => setOffset((o) => Math.min(MONTHS_WINDOW - 1, o + 1))} disabled={offset === MONTHS_WINDOW - 1} style={[styles.calNav, offset === MONTHS_WINDOW - 1 && styles.calNavOff]}><Text style={styles.calNavTxt}>›</Text></TouchableOpacity>
      </View>
      <View style={styles.calDows}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={styles.calDow}>{d}</Text>)}</View>
      <View style={styles.calGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={styles.calCell} />;
          const key = `${view.y}-${pad(view.m + 1)}-${pad(day)}`;
          const past = key < todayKey;
          const on = sel.has(key);
          return (
            <TouchableOpacity key={i} style={styles.calCell} disabled={past} onPress={() => toggle(key)}>
              <View style={[styles.calDay, on && styles.calDayOn]}>
                <Text style={[styles.calDayTxt, on && styles.calDayTxtOn, past && styles.calDayTxtOff]}>{day}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {modeRequired && (
        <View style={styles.modeBox}>
          <Text style={styles.modeTitle}>How will slots be managed for these dates?</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            <ModeOption active={mode === 'manual'} title="Manual slots for each date" sub="Set slots one date at a time." onPress={() => setMode('manual')} />
            <ModeOption active={mode === 'dynamic'} title="Dynamic management" sub="Build one slot set, apply it to every date at once." onPress={() => setMode('dynamic')} />
          </View>
          {!mode && <Text style={styles.modeWarn}>Pick one to continue.</Text>}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <TouchableOpacity style={styles.ghost} onPress={onClose}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.primary, { flex: 1.4 }, !canSave && styles.primaryOff]} disabled={!canSave} onPress={() => onSave([...sel].sort(), mode)}>
          <Text style={styles.primaryText}>Save {sel.size} date{sel.size !== 1 ? 's' : ''}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ModeOption({ active, title, sub, onPress }) {
  return (
    <TouchableOpacity style={[styles.modeOption, active && styles.modeOptionOn]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.modeOptionTitle, active && styles.modeOptionTitleOn]}>{active ? '✓ ' : ''}{title}</Text>
      <Text style={styles.modeOptionSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

/* ───────────────────────── small shared pieces ───────────────────────── */
function Label({ children }) { return <Text style={styles.label}>{children}</Text>; }
function Divider() { return <View style={styles.divider} />; }
function Row({ children }) { return <View style={styles.row}>{children}</View>; }
function Chips({ children }) { return <View style={styles.chips}>{children}</View>; }
function Chip({ active, onPress, children }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text></TouchableOpacity>;
}
function Field({ label, value, onChangeText, placeholder, multiline, flex }) {
  return (
    <View style={flex && { flex: 1 }}>
      {!!label && <Label>{label}</Label>}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.inkFaint}
        multiline={multiline} style={[styles.input, multiline && styles.inputMultiline]} />
    </View>
  );
}
function MoneyField({ label, value, onChangeText, suffix, small, flex, rupee = true }) {
  return (
    <View style={flex && { flex: 1 }}>
      {!!label && <Label>{label}</Label>}
      <View style={[styles.moneyWrap, small && { width: 120 }]}>
        {rupee && <Text style={styles.rupee}>₹</Text>}
        <TextInput value={String(value)} onChangeText={(t) => onChangeText(t.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.inkFaint} style={styles.moneyInput} />
        {!!suffix && <Text style={styles.moneySuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}
function SmallNum({ label, value, onChange, suffix }) {
  return (
    <View>
      {!!label && <Text style={styles.smallNumLabel}>{label}</Text>}
      <View style={styles.smallNumWrap}>
        <TextInput value={String(value)} onChangeText={(t) => onChange(Number(t.replace(/[^\d]/g, '')) || 0)} keyboardType="numeric" style={styles.smallNumInput} />
        {!!suffix && <Text style={styles.smallNumSuffix}>{suffix}</Text>}
      </View>
    </View>
  );
}
function Stepper({ value, onChange, min = 0, max = 100, bare }) {
  return (
    <View style={[styles.stepper, bare && styles.stepperBare]}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}><Text style={styles.stepSign}>−</Text></TouchableOpacity>
      <Text style={styles.stepVal}>{value}</Text>
      <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus]} onPress={() => onChange(Math.min(max, value + 1))}><Text style={[styles.stepSign, { color: '#101010' }]}>＋</Text></TouchableOpacity>
    </View>
  );
}
function AddCustom({ placeholder, onAdd }) {
  const [t, setT] = useState('');
  return (
    <View style={[styles.row, { marginTop: 10 }]}>
      <TextInput value={t} onChangeText={setT} placeholder={placeholder} placeholderTextColor={colors.inkFaint} style={[styles.input, { flex: 1 }]} onSubmitEditing={() => { if (t.trim()) { onAdd(t.trim()); setT(''); } }} returnKeyType="done" />
      <TouchableOpacity style={styles.addBtn} onPress={() => { if (t.trim()) { onAdd(t.trim()); setT(''); } }}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
    </View>
  );
}
function ListEditor({ label, placeholder, addLabel, value, onChange }) {
  return (
    <View>
      <Label>{label}</Label>
      {value.map((v, i) => (
        <View key={i} style={[styles.row, { marginBottom: 8 }]}>
          <TextInput value={v} onChangeText={(t) => onChange(value.map((x, idx) => (idx === i ? t : x)))} placeholder={placeholder} placeholderTextColor={colors.inkFaint} style={[styles.input, { flex: 1 }]} />
          <TouchableOpacity style={styles.rowTrash} onPress={() => onChange(value.filter((_, idx) => idx !== i))}><Image source={ICONS.trash} style={styles.rowTrashIcon} /></TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...value, ''])}><Text style={styles.addLink}>＋ {addLabel}</Text></TouchableOpacity>
    </View>
  );
}
const NEARBY_UNITS = [
  { value: 'km', label: 'km' },
  { value: 'min', label: 'min away' },
  { value: 'hr', label: 'hrs away' },
];
function NearbyEditor({ value, onChange }) {
  const [openRow, setOpenRow] = useState(null); // index whose unit dropdown is open
  const update = (i, p) => onChange(value.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  const labelFor = (u) => (NEARBY_UNITS.find((x) => x.value === u) || NEARBY_UNITS[0]).label;
  return (
    <View>
      <Label>Nearby places</Label>
      <Text style={styles.hint}>Famous spots near the location and how far they are.</Text>
      {value.map((it, i) => (
        <View key={i} style={[styles.row, { marginBottom: 8 }]}>
          <TextInput value={it.name} onChangeText={(t) => update(i, { name: t })} placeholder="Place name" placeholderTextColor={colors.inkFaint} style={[styles.input, { flex: 1 }]} />
          <TextInput value={String(it.distance)} onChangeText={(t) => update(i, { distance: t.replace(/[^\d.]/g, '') })} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.inkFaint} style={[styles.input, { width: 56 }]} />
          <TouchableOpacity style={styles.unitDrop} onPress={() => setOpenRow(i)}>
            <Text style={styles.unitChipText}>{(it.unit || 'km')}</Text>
            <Text style={styles.unitCaret}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowTrash} onPress={() => onChange(value.filter((_, idx) => idx !== i))}><Image source={ICONS.trash} style={styles.rowTrashIcon} /></TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...value, { name: '', distance: '', unit: 'km' }])}><Text style={styles.addLink}>＋ Add nearby place</Text></TouchableOpacity>

      <Modal visible={openRow !== null} transparent animationType="fade" onRequestClose={() => setOpenRow(null)}>
        <Pressable style={styles.dropBackdrop} onPress={() => setOpenRow(null)}>
          <View style={styles.dropCard}>
            <Text style={styles.dropTitle}>Distance unit</Text>
            {NEARBY_UNITS.map((u) => (
              <TouchableOpacity key={u.value} style={styles.dropOption} onPress={() => { update(openRow, { unit: u.value }); setOpenRow(null); }}>
                <Text style={styles.dropOptionText}>{u.label}</Text>
                {value[openRow] && value[openRow].unit === u.value && <Text style={styles.dropCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
function FaqEditor({ value, onChange }) {
  const update = (i, p) => onChange(value.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  return (
    <View>
      <Label>FAQs</Label>
      {value.map((it, i) => (
        <View key={i} style={styles.faqCard}>
          <TextInput value={it.question} onChangeText={(t) => update(i, { question: t })} placeholder="Question" placeholderTextColor={colors.inkFaint} style={[styles.input, { fontWeight: '700' }]} />
          <TextInput value={it.answer} onChangeText={(t) => update(i, { answer: t })} placeholder="Answer" placeholderTextColor={colors.inkFaint} multiline style={[styles.input, styles.inputMultiline, { marginTop: 8 }]} />
          <TouchableOpacity onPress={() => onChange(value.filter((_, idx) => idx !== i))} style={{ alignSelf: 'flex-end', marginTop: 6 }}><Text style={styles.removeLink}>Remove</Text></TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...value, { question: '', answer: '' }])}><Text style={styles.addLink}>＋ Add FAQ</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  backIcon: { fontSize: 24, color: colors.ink, marginTop: -2 },
  hTitle: { fontSize: font.h3, fontWeight: '800', color: colors.ink },
  hStep: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 1 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 12 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segOn: { backgroundColor: colors.brand },

  bigQ: { fontSize: font.h1, fontWeight: '900', color: colors.ink },
  label: { fontSize: font.small, fontWeight: '800', color: colors.ink, marginBottom: 7 },
  hint: { fontSize: font.tiny, color: colors.inkMuted, marginBottom: 8, lineHeight: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 48, fontSize: font.body, color: colors.ink, paddingVertical: 12 },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: font.small, fontWeight: '700', color: colors.ink },
  chipTextActive: { color: '#101010' },

  moneyWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, height: 48 },
  rupee: { fontSize: font.body, color: colors.inkMuted, marginRight: 6 },
  moneyInput: { flex: 1, fontSize: font.body, color: colors.ink },
  moneySuffix: { fontSize: font.small, color: colors.inkMuted, marginLeft: 6 },

  smallInput: { width: 90, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, height: 44, fontSize: font.body, color: colors.ink },
  smallNumLabel: { fontSize: font.tiny, color: colors.inkMuted, marginBottom: 4 },
  smallNumWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, height: 44, width: 84 },
  smallNumInput: { flex: 1, fontSize: font.body, color: colors.ink, textAlign: 'center' },
  smallNumSuffix: { fontSize: font.tiny, color: colors.inkMuted },
  durRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },

  box: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  boxHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boxTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  band: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, gap: 10 },
  bandAges: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  toText: { color: colors.inkMuted, paddingBottom: 12 },
  bandPrice: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.inkFaint, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkboxTick: { color: '#101010', fontSize: 12, fontWeight: '900' },
  checkLabel: { fontSize: font.small, color: colors.ink },
  freeText: { color: colors.success, fontWeight: '800', fontSize: font.small },
  bandTrash: { marginLeft: 'auto', padding: 6 },
  bandTrashIcon: { width: 16, height: 16, tintColor: '#DC2626' },
  addLink: { color: colors.brand, fontWeight: '800', fontSize: font.small, marginTop: 4 },
  removeLink: { color: '#DC2626', fontWeight: '700', fontSize: font.tiny },

  guestBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  guestLabel: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, height: 48 },
  stepperBare: { borderWidth: 0, paddingHorizontal: 0, height: 'auto', gap: 14 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  stepBtnPlus: { backgroundColor: colors.brand },
  stepSign: { fontSize: 18, color: colors.brand, fontWeight: '800' },
  stepVal: { fontSize: font.h3, fontWeight: '800', color: colors.ink, minWidth: 24, textAlign: 'center' },

  addBtn: { backgroundColor: colors.brand, height: 48, paddingHorizontal: 16, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#101010', fontWeight: '800', fontSize: font.small },
  rowTrash: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: radius.md },
  rowTrashIcon: { width: 16, height: 16, tintColor: '#DC2626' },
  unitChipText: { fontSize: font.small, fontWeight: '700', color: colors.ink },
  unitDrop: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48, paddingHorizontal: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  unitCaret: { fontSize: 10, color: colors.inkMuted },
  dropBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 40 },
  dropCard: { width: '100%', maxWidth: 280, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 8, ...shadow.card },
  dropTitle: { fontSize: font.small, fontWeight: '800', color: colors.inkMuted, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  dropOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: radius.md },
  dropOptionText: { fontSize: font.body, color: colors.ink, fontWeight: '600' },
  dropCheck: { color: colors.brand, fontWeight: '900', fontSize: font.body },
  faqCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginBottom: 10 },

  datesBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.brand, alignSelf: 'flex-start', paddingHorizontal: 16, height: 46, borderRadius: radius.md },
  datesIcon: { width: 18, height: 18, tintColor: '#101010' },
  datesText: { color: '#101010', fontWeight: '800', fontSize: font.body },
  manageAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.brand, alignSelf: 'flex-start', paddingHorizontal: 16, height: 46, borderRadius: radius.md },
  manageAllIcon: { width: 16, height: 16, tintColor: colors.brandText },
  manageAllText: { color: colors.brandText, fontWeight: '800', fontSize: font.body },
  dateChip: { backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  dateChipText: { color: colors.brandText, fontWeight: '700', fontSize: font.tiny },
  addSlotBtn: { backgroundColor: colors.brandSoft, height: 44, paddingHorizontal: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  addSlotText: { color: colors.brandText, fontWeight: '800', fontSize: font.small },
  slotChip: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  slotChipText: { fontSize: font.tiny, fontWeight: '700', color: colors.ink },
  checkRow2: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  calNavOff: { opacity: 0.35 },
  modeBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginTop: 14 },
  modeTitle: { fontSize: font.tiny, fontWeight: '800', color: colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  modeWarn: { fontSize: font.tiny, color: '#DC2626', marginTop: 8 },
  modeOption: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12 },
  modeOptionOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  modeOptionTitle: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  modeOptionTitleOn: { color: colors.brandText },
  modeOptionSub: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },

  // per-date rows
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  dateRowDate: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  dateRowSlots: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  manageSlots: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.brandSoft, paddingHorizontal: 12, height: 38, borderRadius: radius.md },
  manageSlotsIcon: { width: 14, height: 14, tintColor: colors.brandText },
  manageSlotsText: { color: colors.brandText, fontWeight: '800', fontSize: font.small },
  dateRowTrash: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  // photos & videos
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: TILE, height: TILE, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  uploadTile: { borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(0,0,0,0.14)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEFEF' },
  tileImg: { width: '100%', height: '100%' },
  tileIcon: { width: 20, height: 20, tintColor: '#888899' },
  tileLabel: { fontSize: font.tiny, color: colors.brand, fontWeight: '800', marginTop: 4 },
  // fixed photo slots (Figma: 114×114, radius 14, dashed 2px, cover #F9B402·10% bg / ·40% border)
  coverSlot: { borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(249,180,2,0.4)', backgroundColor: 'rgba(249,180,2,0.1)', alignItems: 'center', justifyContent: 'center' },
  coverPlus: { width: 24, height: 24, tintColor: '#F9B402' },
  coverSlotLabel: { fontSize: font.tiny, color: '#F9B402', fontWeight: '800', marginTop: 4 },
  uploadSlot: { borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(0,0,0,0.14)', backgroundColor: '#EFEFEF', alignItems: 'center', justifyContent: 'center' },
  uploadSlotIcon: { width: 20, height: 20, tintColor: '#888899' },
  videoTile: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#101A33', padding: 6 },
  videoIcon: { width: 22, height: 22, tintColor: '#fff', marginBottom: 4 },
  videoUrl: { fontSize: 8, color: 'rgba(255,255,255,0.8)' },
  coverTag: { position: 'absolute', bottom: 6, left: 6, backgroundColor: colors.brand, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  coverTagText: { fontSize: 9, fontWeight: '900', color: '#101010' },
  tileRemove: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  tileRemoveText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20 },
  modalTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  deviceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand, height: 50, borderRadius: radius.md },
  deviceIcon: { width: 18, height: 18, tintColor: '#101010' },
  deviceText: { color: '#101010', fontWeight: '900', fontSize: font.body },
  orText: { textAlign: 'center', fontSize: font.tiny, color: colors.inkMuted, marginVertical: 12 },
  modalClose: { fontSize: 18, color: colors.inkMuted, padding: 4 },
  samples: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sample: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#DCE0E6' },

  calBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  calCard: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 30 },
  calHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  calNav: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  calNavTxt: { fontSize: 20, color: colors.ink, marginTop: -2 },
  calMonth: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  calDows: { flexDirection: 'row' },
  calDow: { width: `${100 / 7}%`, textAlign: 'center', fontSize: font.tiny, color: colors.inkFaint, fontWeight: '700', marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calDayOn: { backgroundColor: colors.brand },
  calDayTxt: { fontSize: font.body, color: colors.ink, fontWeight: '600' },
  calDayTxtOn: { color: '#101010', fontWeight: '800' },
  calDayTxtOff: { color: colors.inkFaint },

  actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, paddingHorizontal: space.lg, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  finalRow: { flexDirection: 'row', gap: 12 },
  primary: { backgroundColor: colors.brand, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryOff: { opacity: 0.45 },
  primaryText: { color: '#101010', fontWeight: '900', fontSize: font.h3 },
  ghost: { flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.ink, fontWeight: '800', fontSize: font.body },
});
