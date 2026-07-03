import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Modal, Pressable, Alert } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { api } from '../../api/client';
import { useAuth } from '../../store/AuthContext';
import { initials } from '../../utils/format';
import { toast } from '../../utils/toast';
import { ICONS } from '../../icons';
import { pickFromDevice } from '../../utils/imagePicker';
import ScreenHeader from '../../components/ScreenHeader';

/**
 * Traveller "My Profile" — mirrors the host profile detail. Backed by the real
 * backend user: on mount we refresh from /user-auth/me and on save we PATCH
 * /user-auth/profile, so what's shown here is exactly what the website shows
 * for the same account. Backend field names (addressLine, avatarUrl) are mapped
 * to the local ones (address, photo) both ways.
 */
const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say' };

export default function MyProfileScreen() {
  const { user, token, patchUser } = useAuth();
  const merged = {
    name: (user && user.name) || 'Guest',
    email: (user && user.email) || '',
    phone: (user && user.phone) || '',
    gender: (user && user.gender) || '',
    dob: (user && user.dob) || '',
    address: (user && (user.address || user.addressLine)) || '',
    city: (user && user.city) || '',
    state: (user && user.state) || '',
    country: (user && user.country) || '',
    pincode: (user && user.pincode) || '',
    photo: (user && (user.photo || user.avatarUrl)) || '',
  };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(merged);
  const [photoModal, setPhotoModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refresh from the backend so the app reflects the same profile as the website.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.me(token)
      .then((d) => {
        const u = (d && d.user) || d;
        if (!alive || !u) return;
        patchUser({
          name: u.name, email: u.email, phone: u.phone,
          gender: u.gender || '', dob: u.dob || '',
          address: u.addressLine || '', city: u.city || '', state: u.state || '',
          country: u.country || '', pincode: u.pincode || '', photo: u.avatarUrl || '',
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [token]);

  const startEdit = () => { setDraft(merged); setEditing(true); };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const d = await api.updateProfile(token, {
        name: draft.name,
        phone: draft.phone,
        gender: draft.gender || '',
        dob: draft.dob || '',
        addressLine: draft.address,
        city: draft.city,
        state: draft.state,
        country: draft.country,
        pincode: draft.pincode,
        avatarUrl: draft.photo,
      });
      const u = (d && d.user) || d || {};
      patchUser({
        name: u.name ?? draft.name,
        phone: u.phone ?? draft.phone,
        gender: u.gender ?? draft.gender,
        dob: u.dob ?? draft.dob,
        address: u.addressLine ?? draft.address,
        city: u.city ?? draft.city,
        state: u.state ?? draft.state,
        country: u.country ?? draft.country,
        pincode: u.pincode ?? draft.pincode,
        photo: u.avatarUrl ?? draft.photo,
      });
      setEditing(false);
      toast('Profile updated');
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Same field set as the website profile so the two tally exactly.
  const FIELDS = [
    { key: 'name', label: 'Full name', required: true },
    { key: 'email', label: 'Email', required: true, keyboardType: 'email-address', readOnly: true },
    { key: 'phone', label: 'Phone number', required: true, keyboardType: 'phone-pad' },
    { key: 'gender', label: 'Gender', type: 'gender' },
    { key: 'dob', label: 'Date of birth', hint: 'YYYY-MM-DD' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State / Province' },
    { key: 'country', label: 'Country' },
    { key: 'pincode', label: 'Pincode', keyboardType: 'number-pad' },
  ];
  const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="My Profile" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <TouchableOpacity disabled={!editing} onPress={() => setPhotoModal(true)} activeOpacity={0.85}>
            {(editing ? draft.photo : merged.photo) ? (
              <Image source={{ uri: editing ? draft.photo : merged.photo }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarInit}>{initials(merged.name)}</Text></View>
            )}
            {editing && <View style={styles.avatarEdit}><Image source={ICONS.edit} style={styles.avatarEditIcon} /></View>}
          </TouchableOpacity>
          {!editing && <Text style={styles.nameBig}>{merged.name}</Text>}
          {!editing && !!merged.email && <Text style={styles.companyBig}>{merged.email}</Text>}
        </View>

        {editing ? (
          <View style={{ gap: 16, marginTop: 8 }}>
            {FIELDS.map((f) => (
              <View key={f.key}>
                <Text style={styles.label}>{f.label}{f.required && <Text style={{ color: '#D4183D' }}> *</Text>}</Text>
                {f.type === 'gender' ? (
                  <View style={styles.chipsRow}>
                    {GENDERS.map((g) => {
                      const on = draft.gender === g.value;
                      return (
                        <TouchableOpacity key={g.value} onPress={() => setDraft({ ...draft, gender: on ? '' : g.value })} style={[styles.genderChip, on && styles.genderChipOn]}>
                          <Text style={[styles.genderChipText, on && styles.genderChipTextOn]}>{g.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <TextInput
                    value={draft[f.key]} onChangeText={(t) => setDraft({ ...draft, [f.key]: t })}
                    editable={!f.readOnly}
                    keyboardType={f.keyboardType} autoCapitalize={f.key === 'email' ? 'none' : 'sentences'}
                    placeholder={f.hint || f.label} placeholderTextColor={colors.inkFaint}
                    style={[styles.input, f.readOnly && styles.inputReadOnly]}
                  />
                )}
                {f.readOnly && <Text style={styles.hint}>Email can't be changed.</Text>}
                {!!f.hint && !f.readOnly && <Text style={styles.hint}>{f.hint}</Text>}
              </View>
            ))}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.ghost} disabled={saving} onPress={() => setEditing(false)}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.primary, { flex: 1.4 }]} disabled={saving} onPress={save}><Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save changes'}</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <InfoRow icon={ICONS.bell} label="Email" value={merged.email || '—'} />
              <InfoRow icon={ICONS.people} label="Phone" value={merged.phone || '—'} />
              <InfoRow icon={ICONS.people} label="Gender" value={GENDER_LABEL[merged.gender] || '—'} />
              <InfoRow icon={ICONS.calendar} label="Date of birth" value={merged.dob || '—'} />
              <InfoRow icon={ICONS.locGray} label="Address" value={merged.address || '—'} />
              <InfoRow icon={ICONS.locGray} label="City" value={merged.city || '—'} />
              <InfoRow icon={ICONS.locGray} label="State" value={merged.state || '—'} />
              <InfoRow icon={ICONS.locGray} label="Country" value={merged.country || '—'} />
              <InfoRow icon={ICONS.shield} label="Pincode" value={merged.pincode || '—'} last />
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={startEdit} activeOpacity={0.9}>
              <Image source={ICONS.edit} style={styles.editIcon} />
              <Text style={styles.editText}>Edit profile</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Photo picker modal */}
      <Modal visible={photoModal} transparent animationType="fade" onRequestClose={() => setPhotoModal(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPhotoModal(false)} />
          <PhotoUrl value={draft.photo} onSave={(url) => { setDraft({ ...draft, photo: url }); setPhotoModal(false); }} onClose={() => setPhotoModal(false)} />
        </View>
      </Modal>
    </View>
  );
}

function PhotoUrl({ value, onSave, onClose }) {
  const [url, setUrl] = useState(value || '');
  const [busy, setBusy] = useState(false);
  const fromDevice = async () => {
    setBusy(true);
    try { const uri = await pickFromDevice('photo'); if (uri) onSave(uri); }
    catch (e) { Alert.alert('Gallery', e.message || 'Could not open the device gallery.'); }
    finally { setBusy(false); }
  };
  return (
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>Profile photo</Text>
      <TouchableOpacity style={styles.deviceBtn} onPress={fromDevice} disabled={busy} activeOpacity={0.9}>
        <Image source={ICONS.upload} style={styles.deviceIcon} />
        <Text style={styles.deviceText}>{busy ? 'Opening…' : 'Choose from device'}</Text>
      </TouchableOpacity>
      <Text style={styles.orText}>or paste an image URL</Text>
      <TextInput value={url} onChangeText={setUrl} placeholder="https://…" placeholderTextColor={colors.inkFaint} autoCapitalize="none" style={styles.input} />
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.ghost} onPress={onClose}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.primary, { flex: 1.4 }]} onPress={() => onSave(url.trim())}><Text style={styles.primaryText}>Set URL</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoBorder]}>
      <View style={styles.infoIcon}><Image source={icon} style={styles.infoIconImg} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', marginBottom: 18 },
  avatar: { width: 96, height: 96, borderRadius: 26, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 96, height: 96, borderRadius: 26, backgroundColor: '#DCE0E6' },
  avatarInit: { fontSize: 34, fontWeight: '900', color: '#101010' },
  avatarEdit: { position: 'absolute', bottom: -2, right: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg },
  avatarEditIcon: { width: 14, height: 14, tintColor: '#fff' },
  nameBig: { fontSize: font.h2, fontWeight: '900', color: colors.ink, marginTop: 12 },
  companyBig: { fontSize: font.body, color: colors.inkMuted, marginTop: 2 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  infoIconImg: { width: 17, height: 17, tintColor: colors.brand },
  infoLabel: { fontSize: font.tiny, color: colors.inkMuted },
  infoValue: { fontSize: font.body, color: colors.ink, fontWeight: '700', marginTop: 2 },

  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, backgroundColor: colors.brand, height: 52, borderRadius: radius.md },
  editIcon: { width: 17, height: 17, tintColor: '#101010' },
  editText: { color: '#101010', fontWeight: '900', fontSize: font.h3 },

  label: { fontSize: font.small, fontWeight: '800', color: colors.ink, marginBottom: 7 },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, height: 50, fontSize: font.body, color: colors.ink },
  inputReadOnly: { backgroundColor: colors.chipBg, color: colors.inkMuted },
  hint: { fontSize: font.tiny, color: colors.inkFaint, marginTop: 5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  genderChipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  genderChipText: { fontSize: font.small, fontWeight: '700', color: colors.ink },
  genderChipTextOn: { color: '#101010' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  primary: { backgroundColor: colors.brand, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#101010', fontWeight: '900', fontSize: font.h3 },
  ghost: { flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.ink, fontWeight: '800', fontSize: font.body },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20 },
  modalTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  deviceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand, height: 50, borderRadius: radius.md },
  deviceIcon: { width: 18, height: 18, tintColor: '#101010' },
  deviceText: { color: '#101010', fontWeight: '900', fontSize: font.body },
  orText: { textAlign: 'center', fontSize: font.tiny, color: colors.inkMuted, marginVertical: 12 },
});
