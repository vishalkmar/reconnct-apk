import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Switch, Modal, Pressable, Alert,
} from 'react-native';
import { colors, radius, font } from '../../theme';
import { ICONS } from '../../icons';
import { pickAsset } from '../../utils/imagePicker';
import TaxonomyPicker from '../host/TaxonomyPicker';

/*
  Per-review-section editors for the objection-resolution flow, in the
  host/supplier `form` shape. This is the mobile counterpart of the website's
  HostSectionFields — Center Ops objects to ONE section ("About", "Pricing",
  "Nearby places"), and we render exactly the inputs that section owns.

  Deliberately self-contained (its own primitives + styles) rather than reaching
  into the create wizard, so touching this never risks the working "Create
  listing" screen. The `SECTION_FORM_FIELDS` map mirrors the backend registry
  and lets the caller tell which section actually changed.
*/

export const SECTION_FORM_FIELDS = {
  basic: ['name', 'location', 'city', 'nearbyLocation', 'mode'],
  taxonomy: ['audiences', 'categoryIds', 'typeIds'],
  about: ['about'],
  media: ['photos', 'videos'],
  pricing: ['priceMethod', 'adultPrice', 'childrenEnabled', 'childBands', 'capacity'],
  duration: ['durationLabel', 'durationHours', 'durationMinutes'],
  schedule: ['schedule'],
  inclusions: ['inclusions'],
  facilities: ['facilities'],
  nearby: ['nearbyPlaces'],
  faqs: ['faqs'],
  policies: ['termsConditions', 'privacyPolicy', 'refundCancellationPolicy'],
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export const sectionDirty = (section, form, base) => (
  (SECTION_FORM_FIELDS[section] || []).some((f) => !same(form?.[f], base?.[f]))
);

const DURATIONS = [
  { label: '1 hr', h: 1 }, { label: '2 hrs', h: 2 }, { label: '3 hrs', h: 3 }, { label: '4 hrs', h: 4 },
];
const FACILITIES = ['Restrooms', 'Parking', 'Locker', 'Wifi', 'Cafe', 'First Aid', 'Changing Room', 'Guide', 'Equipment'];
const PRICE_METHODS = [
  { value: 'per_person', label: 'Per person' },
  { value: 'per_day', label: 'Per day' },
  { value: 'days', label: 'Days (multi-day)' },
  { value: 'per_hours', label: 'By hours' },
];

/* ────────────────────────── the section switch ────────────────────────── */
export default function SectionEditor({ section, form, patch, uploadImage }) {
  switch (section) {
    case 'basic':
      return (
        <View style={{ gap: 14 }}>
          <Field label="Experience title" value={form.name} onChangeText={(t) => patch({ name: t })} placeholder="e.g. Sunrise Kayaking at Goa Beach" />
          <Field label="Location" value={form.location} onChangeText={(t) => patch({ location: t })} placeholder="City, State, Country" />
          <Field label="City" value={form.city} onChangeText={(t) => patch({ city: t })} placeholder="e.g. Goa" />
          <Field label="Nearby location" value={form.nearbyLocation} onChangeText={(t) => patch({ nearbyLocation: t })} placeholder="e.g. near Baga Beach" />
          <View>
            <Label>Mode</Label>
            <Chips>
              {['offline', 'online', 'hybrid'].map((m) => (
                <Chip key={m} active={form.mode === m} onPress={() => patch({ mode: m })}>{m[0].toUpperCase() + m.slice(1)}</Chip>
              ))}
            </Chips>
          </View>
        </View>
      );

    case 'taxonomy':
      return <TaxonomyPicker value={form} onChange={patch} />;

    case 'about':
      return (
        <Field label="About this activity / event" value={form.about} onChangeText={(t) => patch({ about: t })}
          placeholder="What will guests experience? What makes it unique?" multiline />
      );

    case 'duration':
      return <DurationEditor form={form} patch={patch} />;

    case 'inclusions':
      return (
        <ListEditor label="What's included" placeholder="Describe what's included…" addLabel="Add inclusion"
          value={form.inclusions || []} onChange={(v) => patch({ inclusions: v })} />
      );

    case 'facilities':
      return (
        <View>
          <Label>Facilities</Label>
          <Text style={styles.hint}>Pick from the list or add your own.</Text>
          <Chips>
            {[...FACILITIES, ...(form.facilities || []).filter((f) => !FACILITIES.includes(f))].map((f) => {
              const on = (form.facilities || []).includes(f);
              return <Chip key={f} active={on} onPress={() => patch({ facilities: on ? form.facilities.filter((x) => x !== f) : [...(form.facilities || []), f] })}>{on ? '✓ ' : ''}{f}</Chip>;
            })}
          </Chips>
          <AddCustom placeholder="Add facility" onAdd={(t) => !(form.facilities || []).includes(t) && patch({ facilities: [...(form.facilities || []), t] })} />
        </View>
      );

    case 'nearby':
      return <NearbyEditor value={form.nearbyPlaces || []} onChange={(v) => patch({ nearbyPlaces: v })} />;

    case 'faqs':
      return <FaqEditor value={form.faqs || []} onChange={(v) => patch({ faqs: v })} />;

    case 'policies':
      return (
        <View style={{ gap: 14 }}>
          <Field label="Terms & Conditions" value={form.termsConditions} onChangeText={(t) => patch({ termsConditions: t })} placeholder="e.g. Arrive 15 minutes early…" multiline />
          <Field label="Privacy Policy" value={form.privacyPolicy} onChangeText={(t) => patch({ privacyPolicy: t })} placeholder="How you handle guest data…" multiline />
          <Field label="Refund & Cancellation Policy" value={form.refundCancellationPolicy} onChangeText={(t) => patch({ refundCancellationPolicy: t })} placeholder="e.g. Free cancellation up to 24 hrs before…" multiline />
        </View>
      );

    case 'pricing':
      return <PricingEditor form={form} patch={patch} />;

    case 'media':
      return <MediaEditor form={form} patch={patch} uploadImage={uploadImage} />;

    case 'schedule':
      return <Availability form={form} patch={patch} />;

    default:
      return (
        <Text style={styles.hint}>
          This section can’t be changed from your app — please reply to your account manager instead.
        </Text>
      );
  }
}

/* ───────────────────────────── field editors ──────────────────────────── */
function DurationEditor({ form, patch }) {
  const [custom, setCustom] = useState(false);
  const customActive = !!form.durationLabel && !DURATIONS.some((d) => d.label === form.durationLabel);
  return (
    <View>
      <Label>Duration</Label>
      <Text style={styles.hint}>Used as the time-slot length in availability.</Text>
      <Chips>
        {DURATIONS.map((d) => (
          <Chip key={d.label} active={form.durationLabel === d.label} onPress={() => patch({ durationLabel: d.label, durationHours: d.h, durationMinutes: 0 })}>{d.label}</Chip>
        ))}
        {customActive && <Chip active onPress={() => setCustom(true)}>{form.durationLabel}</Chip>}
        <Chip active={false} onPress={() => setCustom((v) => !v)}>＋ Custom</Chip>
      </Chips>
      {custom && (
        <View style={[styles.row, { marginTop: 10, gap: 10 }]}>
          <SmallNum label="Hours" value={form.durationHours || 0} onChange={(v) => patch({ durationHours: v })} suffix="hrs" />
          <SmallNum label="Minutes" value={form.durationMinutes || 0} onChange={(v) => patch({ durationMinutes: Math.min(59, v) })} suffix="min" />
          <TouchableOpacity style={[styles.addBtn, { alignSelf: 'flex-end' }]} onPress={() => {
            const h = Number(form.durationHours) || 0; const m = Number(form.durationMinutes) || 0;
            patch({ durationLabel: `${h}h${m ? ` ${m}m` : ''}` }); setCustom(false);
          }}><Text style={styles.addBtnText}>Set</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PricingEditor({ form, patch }) {
  const bands = form.childBands || [];
  const perDay = form.priceMethod === 'per_day' || form.priceMethod === 'days';
  const setBand = (i, p) => patch({ childBands: bands.map((b, idx) => (idx === i ? { ...b, ...p } : b)) });
  const addBand = () => {
    const last = bands[bands.length - 1];
    const start = last ? Math.min(14, Number(last.endAge) + 1) : 0;
    patch({ childBands: [...bands, { startAge: start, endAge: Math.min(14, start + 4), charge: true, price: '' }] });
  };
  return (
    <View style={{ gap: 18 }}>
      <View>
        <Label>Price method</Label>
        <Chips>
          {PRICE_METHODS.map((m) => <Chip key={m.value} active={form.priceMethod === m.value} onPress={() => patch({ priceMethod: m.value })}>{m.label}</Chip>)}
        </Chips>
      </View>
      <MoneyField label="Adult price" value={form.adultPrice || ''} onChangeText={(t) => patch({ adultPrice: t })} suffix={`/ ${perDay ? 'day' : 'person'}`} />
      <View style={styles.box}>
        <View style={styles.boxHead}>
          <Text style={styles.boxTitle}>Add children pricing</Text>
          <Switch value={!!form.childrenEnabled} onValueChange={(v) => patch({ childrenEnabled: v, childBands: v && bands.length === 0 ? [{ startAge: 0, endAge: 5, charge: false, price: '' }] : bands })}
            trackColor={{ true: colors.brand, false: '#CBD0D8' }} thumbColor="#fff" />
        </View>
        {form.childrenEnabled && (
          <View style={{ gap: 10, marginTop: 12 }}>
            <Text style={styles.hint}>Define age bands (years). Turn “Set a price” off to make a band free.</Text>
            {bands.map((b, i) => (
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
                  <TouchableOpacity onPress={() => patch({ childBands: bands.filter((_, idx) => idx !== i) })} style={{ marginLeft: 'auto' }}><Image source={ICONS.trash} style={styles.rowTrashIcon} /></TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={addBand}><Text style={styles.addLink}>＋ Add age band</Text></TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.guestBox}>
        <Text style={styles.guestLabel}>Guests per session</Text>
        <Stepper value={form.capacity || 1} onChange={(v) => patch({ capacity: v })} min={1} max={100} />
      </View>
    </View>
  );
}

function MediaEditor({ form, patch, uploadImage }) {
  const photos = form.photos || [];
  const videos = form.videos || [];
  const [picker, setPicker] = useState(null); // 'photo' | 'video'
  const add = (url) => {
    if (picker === 'photo') patch({ photos: [...photos, url] });
    else if (picker === 'video') patch({ videos: [...videos, url] });
    setPicker(null);
  };
  const SLOTS = Math.max(6, photos.length + 1);
  return (
    <View style={{ gap: 16 }}>
      <View>
        <Label>Photos</Label>
        <Text style={styles.hint}>The first photo is your cover. At least 6 photos are required before you can send it back.</Text>
        <View style={styles.grid}>
          {Array.from({ length: SLOTS }).map((_, i) => {
            const url = photos[i];
            if (url) {
              return (
                <View key={i} style={styles.tile}>
                  <Image source={{ uri: url }} style={styles.tileImg} />
                  {i === 0 && <View style={styles.coverTag}><Text style={styles.coverTagText}>Cover</Text></View>}
                  <TouchableOpacity style={styles.tileRemove} onPress={() => patch({ photos: photos.filter((_, idx) => idx !== i) })}><Text style={styles.tileRemoveText}>✕</Text></TouchableOpacity>
                </View>
              );
            }
            return (
              <TouchableOpacity key={i} style={[styles.tile, styles.uploadTile]} activeOpacity={0.85} onPress={() => setPicker('photo')}>
                <Image source={ICONS.upload} style={styles.tileIcon} />
                <Text style={styles.tileLabel}>{i === 0 ? 'Cover' : 'Add'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View>
        <Label>Videos</Label>
        <View style={styles.grid}>
          {videos.map((url, i) => (
            <View key={`${url}-${i}`} style={styles.tile}>
              <View style={styles.videoTile}><Image source={ICONS.plane} style={styles.videoIcon} /><Text style={styles.videoUrl} numberOfLines={1}>{String(url).replace(/^https?:\/\//, '')}</Text></View>
              <TouchableOpacity style={styles.tileRemove} onPress={() => patch({ videos: videos.filter((_, idx) => idx !== i) })}><Text style={styles.tileRemoveText}>✕</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[styles.tile, styles.uploadTile]} activeOpacity={0.85} onPress={() => setPicker('video')}>
            <Image source={ICONS.upload} style={styles.tileIcon} />
            <Text style={styles.tileLabel}>{videos.length ? 'Add more' : 'Add video'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
          <UrlPicker kind={picker} onPick={add} onClose={() => setPicker(null)} uploadImage={uploadImage} />
        </View>
      </Modal>
    </View>
  );
}

function UrlPicker({ kind, onPick, onClose, uploadImage }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  /*
    The picker returns a LOCAL device URI that only resolves on this phone —
    storing it left the website (and the app itself after a reinstall wipes the
    cache) with a dead image. So upload it first and keep only the public URL.
  */
  const fromDevice = async () => {
    setBusy(true);
    try {
      const asset = await pickAsset(kind === 'video' ? 'video' : 'photo');
      if (!asset) return;
      const res = await uploadImage(asset);
      const url = res && res.url;
      if (!url) throw new Error('Upload did not return a URL.');
      onPick(url);
    } catch (e) {
      Alert.alert('Could not add it', e.message || 'Please try again, or paste a link instead.');
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

/* ─────────────────────── availability (dates + slots) ─────────────────── */
const pad = (n) => String(n).padStart(2, '0');
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const toHHMM = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
/*
  Snap already-built slots to the CURRENT activity duration — same rule as the
  website (ExperienceScheduling.fitSlotsToDuration). If every slot already
  matches the duration they come back untouched; if the duration changed
  (1 hr → 2 hrs) the same NUMBER of back-to-back slots is rebuilt from the
  earliest start, so the owner never has to delete and re-add everything.
*/
const fitSlotsToDuration = (slots, dur) => {
  const list = Array.isArray(slots) ? slots.filter((s) => s && s.start && s.end) : [];
  if (!list.length || dur <= 0) return list.map((s) => ({ ...s }));
  if (list.every((s) => toMin(s.end) - toMin(s.start) === dur)) return list.map((s) => ({ ...s }));
  const sorted = [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
  let cur = toMin(sorted[0].start);
  return sorted.map(() => {
    const s = { start: toHHMM(cur), end: toHHMM(cur + dur) };
    cur += dur;
    return s;
  });
};
const fmtTime = (s) => { const [h, m] = s.split(':').map(Number); const ap = h < 12 ? 'AM' : 'PM'; return `${h % 12 || 12}:${pad(m)} ${ap}`; };
const fmtDateShort = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); };

function Availability({ form, patch }) {
  const [calOpen, setCalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const schedule = form.schedule || { dates: [] };
  const rows = schedule.dates || [];
  const slotMode = schedule.slotMode || 'manual';
  const dur = (Number(form.durationHours) || 0) * 60 + (Number(form.durationMinutes) || 0) || 60;

  const setRows = (next) => patch({ schedule: { ...schedule, dates: next } });

  /*
    The owner went back and picked a different duration (1 hr → 2 hrs) after
    already building slots. Re-snap EVERY date's slots to the new length right
    away, so the rows below and the slot editor both show the new timings
    instead of stale ones — matching the website. Guarded by a deep compare so
    it only writes on a real change and can never loop.
  */
  useEffect(() => {
    if (!rows.length) return;
    const next = rows.map((r) => ({ ...r, slots: fitSlotsToDuration(r.slots, dur) }));
    if (JSON.stringify(next) !== JSON.stringify(rows)) setRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dur]);
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
      <Text style={styles.hint}>Pick dates, then build time slots for each one. Each slot is {Math.floor(dur / 60)}h{dur % 60 ? ` ${dur % 60}m` : ''} long.</Text>
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

      {rows.length === 0 ? (
        <Text style={styles.hint}>No dates yet. Tap “Manage dates” to pick available dates.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((r) => (
            <View key={r.date} style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dateRowDate}>{fmtDateShort(r.date)}</Text>
                <Text style={styles.dateRowSlots} numberOfLines={1}>{r.slots.length ? r.slots.map((s) => fmtTime(s.start)).join(', ') : 'No slots yet'}</Text>
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
        <View style={styles.calBackdrop}><DatesCalendar selected={rows.map((r) => r.date)} initialMode={rows.length ? slotMode : null} onClose={() => setCalOpen(false)} onSave={saveDates} /></View>
      </Modal>
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setSlotDate(null)}>
        <View style={styles.calBackdrop}>{editing && <SlotsModal title={`Slots · ${fmtDateShort(editing.date)}`} slots={editing.slots} durationMinutes={dur} onClose={() => setSlotDate(null)} onSave={(s) => saveSlots(editing.date, s)} />}</View>
      </Modal>
      <Modal visible={bulkOpen} transparent animationType="slide" onRequestClose={() => setBulkOpen(false)}>
        <View style={styles.calBackdrop}><SlotsModal title="Manage Slots · applies to every date" slots={(rows.find((r) => r.slots.length) || {}).slots || []} durationMinutes={dur} requireApplyAll onClose={() => setBulkOpen(false)} onSave={applyToAll} /></View>
      </Modal>
    </View>
  );
}

function SlotsModal({ title, slots, durationMinutes, requireApplyAll, onSave, onClose }) {
  const dur = durationMinutes > 0 ? durationMinutes : 60;
  // Pre-fill with the chosen slots, snapped to the CURRENT duration — so a
  // changed duration shows the updated timings instead of the stale ones.
  const [list, setList] = useState(() => fitSlotsToDuration(slots, dur));
  const [start, setStart] = useState('09:00');
  const [applyAll, setApplyAll] = useState(false);
  const add = (s) => {
    const end = toHHMM(toMin(s) + dur);
    if (list.some((x) => x.start === s)) { Alert.alert('Slot', 'That slot is already added.'); return; }
    setList((p) => [...p, { start: s, end }].sort((a, b) => toMin(a.start) - toMin(b.start)));
    setStart(end);
  };
  const canSave = requireApplyAll ? (list.length > 0 && applyAll) : true;
  return (
    <View style={styles.calCard}>
      <View style={styles.calHeadRow}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
      </View>
      <Text style={styles.hint}>Each slot is {Math.floor(dur / 60)}h{dur % 60 ? ` ${dur % 60}m` : ''} long.</Text>
      <View style={[styles.row, { marginTop: 12, gap: 10 }]}>
        <View><Text style={styles.smallNumLabel}>Start time</Text><TextInput value={start} onChangeText={setStart} placeholder="HH:MM" placeholderTextColor={colors.inkFaint} style={styles.smallInput} /></View>
        <TouchableOpacity style={[styles.addSlotBtn, { alignSelf: 'flex-end' }]} onPress={() => add(start)}><Text style={styles.addSlotText}>＋ Add slot</Text></TouchableOpacity>
      </View>
      {list.length > 0 && (
        <View style={[styles.chips, { marginTop: 12 }]}>
          {list.map((s, i) => (
            <TouchableOpacity key={`${s.start}-${i}`} style={styles.slotChip} onPress={() => setList(list.filter((_, idx) => idx !== i))}>
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

const MONTHS_WINDOW = 12;
function DatesCalendar({ selected, initialMode, onSave, onClose }) {
  const today = new Date();
  const startY = today.getFullYear(); const startM = today.getMonth();
  const [offset, setOffset] = useState(0);
  const [sel, setSel] = useState(new Set(selected));
  const [mode, setMode] = useState(initialMode);
  const view = useMemo(() => { const d = new Date(startY, startM + offset, 1); return { y: d.getFullYear(), m: d.getMonth() }; }, [offset, startY, startM]);
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

/* ───────────────────────────── primitives ─────────────────────────────── */
function Label({ children }) { return <Text style={styles.label}>{children}</Text>; }
function Chips({ children }) { return <View style={styles.chips}>{children}</View>; }
function Chip({ active, onPress, children }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text></TouchableOpacity>;
}
function Field({ label, value, onChangeText, placeholder, multiline }) {
  return (
    <View>
      {!!label && <Label>{label}</Label>}
      <TextInput value={value || ''} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.inkFaint}
        multiline={multiline} style={[styles.input, multiline && styles.inputMultiline]} />
    </View>
  );
}
function MoneyField({ label, value, onChangeText, suffix, small }) {
  return (
    <View>
      {!!label && <Label>{label}</Label>}
      <View style={[styles.moneyWrap, small && { width: 120 }]}>
        <Text style={styles.rupee}>₹</Text>
        <TextInput value={String(value ?? '')} onChangeText={(t) => onChangeText(t.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.inkFaint} style={styles.moneyInput} />
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
function Stepper({ value, onChange, min = 0, max = 100 }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}><Text style={styles.stepSign}>−</Text></TouchableOpacity>
      <Text style={styles.stepVal}>{value}</Text>
      <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus]} onPress={() => onChange(Math.min(max, value + 1))}><Text style={[styles.stepSign, { color: '#101010' }]}>＋</Text></TouchableOpacity>
    </View>
  );
}
function AddCustom({ placeholder, onAdd }) {
  const [t, setT] = useState('');
  return (
    <View style={[styles.row, { marginTop: 10, gap: 10 }]}>
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
        <View key={i} style={[styles.row, { marginBottom: 8, gap: 8 }]}>
          <TextInput value={v} onChangeText={(t) => onChange(value.map((x, idx) => (idx === i ? t : x)))} placeholder={placeholder} placeholderTextColor={colors.inkFaint} style={[styles.input, { flex: 1 }]} />
          <TouchableOpacity style={styles.rowTrash} onPress={() => onChange(value.filter((_, idx) => idx !== i))}><Image source={ICONS.trash} style={styles.rowTrashIcon} /></TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...value, ''])}><Text style={styles.addLink}>＋ {addLabel}</Text></TouchableOpacity>
    </View>
  );
}
const NEARBY_UNITS = [{ value: 'km', label: 'km' }, { value: 'min', label: 'min away' }, { value: 'hr', label: 'hrs away' }];
function NearbyEditor({ value, onChange }) {
  const [openRow, setOpenRow] = useState(null);
  const update = (i, p) => onChange(value.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  return (
    <View>
      <Label>Nearby places</Label>
      <Text style={styles.hint}>Famous spots near the location and how far they are.</Text>
      {value.map((it, i) => (
        <View key={i} style={[styles.row, { marginBottom: 8, gap: 8 }]}>
          <TextInput value={it.name} onChangeText={(t) => update(i, { name: t })} placeholder="Place name" placeholderTextColor={colors.inkFaint} style={[styles.input, { flex: 1 }]} />
          <TextInput value={String(it.distance ?? '')} onChangeText={(t) => update(i, { distance: t.replace(/[^\d.]/g, '') })} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.inkFaint} style={[styles.input, { width: 56 }]} />
          <TouchableOpacity style={styles.unitDrop} onPress={() => setOpenRow(i)}>
            <Text style={styles.unitChipText}>{it.unit || 'km'}</Text><Text style={styles.unitCaret}>▾</Text>
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
  hint: { fontSize: font.small, color: colors.inkMuted, marginTop: 2, marginBottom: 6, lineHeight: 18 },
  label: { fontSize: font.small, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: font.body, color: colors.ink },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: font.small, color: colors.ink, fontWeight: '700' },
  chipTextActive: { color: '#101010' },
  addBtn: { backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: font.small },
  addLink: { color: colors.brandText, fontWeight: '800', fontSize: font.small, marginTop: 4 },
  removeLink: { color: '#DC2626', fontWeight: '800', fontSize: font.small },
  rowTrash: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center' },
  rowTrashIcon: { width: 17, height: 17, tintColor: '#DC2626' },

  moneyWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12 },
  rupee: { color: colors.inkMuted, fontSize: font.body },
  moneyInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, fontSize: font.body, color: colors.ink },
  moneySuffix: { color: colors.inkMuted, fontSize: font.small },
  smallNumLabel: { fontSize: font.tiny, color: colors.inkMuted, marginBottom: 4 },
  smallNumWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, width: 92 },
  smallNumInput: { flex: 1, paddingVertical: 9, fontSize: font.body, color: colors.ink },
  smallNumSuffix: { fontSize: font.tiny, color: colors.inkMuted },
  smallInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, width: 120, color: colors.ink, fontSize: font.body },

  box: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 14 },
  boxHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boxTitle: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  band: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, gap: 10 },
  bandAges: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  toText: { color: colors.inkMuted, alignSelf: 'center', marginBottom: 9 },
  bandPrice: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkboxTick: { color: '#101010', fontSize: 12, fontWeight: '900' },
  checkLabel: { fontSize: font.small, color: colors.ink },
  freeText: { color: colors.success, fontWeight: '800', fontSize: font.small },
  guestBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 14 },
  guestLabel: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnPlus: { backgroundColor: colors.brand, borderColor: colors.brand },
  stepSign: { fontSize: 20, fontWeight: '900', color: colors.ink },
  stepVal: { fontSize: font.h3, fontWeight: '900', color: colors.ink, minWidth: 28, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  tileImg: { width: '100%', height: '100%' },
  uploadTile: { borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tileIcon: { width: 22, height: 22, tintColor: colors.inkMuted },
  tileLabel: { fontSize: font.tiny, color: colors.inkMuted, fontWeight: '700' },
  coverTag: { position: 'absolute', bottom: 6, left: 6, backgroundColor: colors.brand, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coverTagText: { fontSize: 9, fontWeight: '900', color: '#101010' },
  tileRemove: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  tileRemoveText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  videoTile: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4 },
  videoIcon: { width: 22, height: 22, tintColor: colors.inkMuted },
  videoUrl: { fontSize: 9, color: colors.inkMuted, textAlign: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20 },
  modalTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink },
  modalClose: { fontSize: 18, fontWeight: '800', color: colors.inkMuted },
  deviceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingVertical: 13, marginTop: 14 },
  deviceIcon: { width: 18, height: 18, tintColor: colors.ink },
  deviceText: { fontSize: font.body, fontWeight: '800', color: colors.ink },
  orText: { textAlign: 'center', color: colors.inkMuted, fontSize: font.small, marginVertical: 12 },
  ghost: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontWeight: '800', color: colors.ink, fontSize: font.body },
  primary: { backgroundColor: colors.brand, paddingHorizontal: 18, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryOff: { opacity: 0.45 },
  primaryText: { fontWeight: '900', color: '#101010', fontSize: font.body },

  datesBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  datesIcon: { width: 17, height: 17, tintColor: colors.ink },
  datesText: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  manageAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.brandSoft, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11 },
  manageAllIcon: { width: 15, height: 15, tintColor: colors.brandText },
  manageAllText: { fontSize: font.small, fontWeight: '800', color: colors.brandText },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10 },
  dateRowDate: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  dateRowSlots: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  manageSlots: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  manageSlotsIcon: { width: 13, height: 13, tintColor: colors.ink },
  manageSlotsText: { fontSize: font.tiny, fontWeight: '800', color: colors.ink },
  dateRowTrash: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },

  calBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  calCard: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  calHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  calNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  calNav: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  calNavOff: { opacity: 0.3 },
  calNavTxt: { fontSize: 22, fontWeight: '900', color: colors.ink },
  calMonth: { fontSize: font.body, fontWeight: '900', color: colors.ink },
  calDows: { flexDirection: 'row', marginTop: 12 },
  calDow: { flex: 1, textAlign: 'center', fontSize: font.tiny, fontWeight: '800', color: colors.inkMuted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calDayOn: { backgroundColor: colors.brand },
  calDayTxt: { fontSize: font.small, color: colors.ink, fontWeight: '700' },
  calDayTxtOn: { color: '#101010', fontWeight: '900' },
  calDayTxtOff: { color: colors.inkFaint },
  modeBox: { marginTop: 14, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12 },
  modeTitle: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  modeWarn: { fontSize: font.tiny, color: '#DC2626', marginTop: 6 },
  modeOption: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  modeOptionOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  modeOptionTitle: { fontSize: font.small, fontWeight: '800', color: colors.ink },
  modeOptionTitleOn: { color: colors.brandText },
  modeOptionSub: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 2 },
  addSlotBtn: { backgroundColor: colors.brand, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  addSlotText: { fontWeight: '900', color: '#101010', fontSize: font.small },
  slotChip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  slotChipText: { fontSize: font.tiny, fontWeight: '700', color: colors.ink },
  checkRow2: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },

  unitDrop: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, height: 44 },
  unitChipText: { fontSize: font.small, color: colors.ink, fontWeight: '700' },
  unitCaret: { fontSize: 10, color: colors.inkMuted },
  dropBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 40 },
  dropCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16 },
  dropTitle: { fontSize: font.body, fontWeight: '900', color: colors.ink, marginBottom: 8 },
  dropOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropOptionText: { fontSize: font.body, color: colors.ink },
  dropCheck: { color: colors.brandText, fontWeight: '900' },
  faqCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, marginBottom: 10 },
});
