import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Modal, Pressable, Alert } from 'react-native';
import { colors, radius, font, space, shadow } from '../../theme';
import { useSupplier } from '../../store/SupplierContext';
import { initials } from '../../utils/format';
import { ICONS } from '../../icons';
import { pickFromDevice } from '../../utils/imagePicker';
import ScreenHeader from '../../components/ScreenHeader';

export default function SupplierProfileDetailScreen() {
  const { profile, setProfile } = useSupplier();
  const merged = {
    name: profile.name || 'Supplier',
    email: profile.email || '',
    phone: profile.phone || '',
    address: profile.address || '',
    company: profile.company || '',
    photo: profile.photo || '',
  };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(merged);
  const [photoModal, setPhotoModal] = useState(false);

  const startEdit = () => { setDraft(merged); setEditing(true); };
  const save = () => { setProfile(draft); setEditing(false); };

  const FIELDS = [
    { key: 'name', label: 'Full name', icon: ICONS.navProfile, required: true },
    { key: 'email', label: 'Email', icon: ICONS.bell, required: true, keyboardType: 'email-address' },
    { key: 'phone', label: 'Phone number', icon: ICONS.people, required: true, keyboardType: 'phone-pad' },
    { key: 'address', label: 'Address', icon: ICONS.loc || ICONS.locGray, required: true },
    { key: 'company', label: 'Company name (optional)', icon: ICONS.shield, required: false },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Supplier Profile" />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <TouchableOpacity disabled={!editing} onPress={() => setPhotoModal(true)} activeOpacity={0.85}>
            {draft.photo ? <Image source={{ uri: editing ? draft.photo : merged.photo }} style={styles.avatarImg} /> : (
              <View style={styles.avatar}><Text style={styles.avatarInit}>{initials(merged.name)}</Text></View>
            )}
            {editing && <View style={styles.avatarEdit}><Image source={ICONS.edit} style={styles.avatarEditIcon} /></View>}
          </TouchableOpacity>
          {!editing && <Text style={styles.nameBig}>{merged.name}</Text>}
          {!editing && !!merged.company && <Text style={styles.companyBig}>{merged.company}</Text>}
        </View>

        {editing ? (
          <View style={{ gap: 16, marginTop: 8 }}>
            {FIELDS.map((f) => (
              <View key={f.key}>
                <Text style={styles.label}>{f.label}{f.required && <Text style={{ color: '#DC2626' }}> *</Text>}</Text>
                <TextInput
                  value={draft[f.key]} onChangeText={(t) => setDraft({ ...draft, [f.key]: t })}
                  keyboardType={f.keyboardType} autoCapitalize={f.key === 'email' ? 'none' : 'sentences'}
                  placeholder={f.label} placeholderTextColor={colors.inkFaint} style={styles.input}
                />
              </View>
            ))}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.ghost} onPress={() => setEditing(false)}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.primary, { flex: 1.4 }]} onPress={save}><Text style={styles.primaryText}>Save changes</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <InfoRow icon={ICONS.bell} label="Email" value={merged.email} />
              <InfoRow icon={ICONS.people} label="Phone" value={merged.phone || '—'} />
              <InfoRow icon={ICONS.locGray} label="Address" value={merged.address || '—'} />
              <InfoRow icon={ICONS.shield} label="Company" value={merged.company || '—'} last />
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={startEdit} activeOpacity={0.9}>
              <Image source={ICONS.edit} style={styles.editIcon} />
              <Text style={styles.editText}>Edit profile</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Photo URL modal (no native picker yet) */}
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
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  primary: { backgroundColor: colors.brand, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#101010', fontWeight: '900', fontSize: font.h3 },
  ghost: { flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.ink, fontWeight: '800', fontSize: font.body },

  hint: { fontSize: font.tiny, color: colors.inkMuted, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20 },
  modalTitle: { fontSize: font.h3, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  deviceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand, height: 50, borderRadius: radius.md },
  deviceIcon: { width: 18, height: 18, tintColor: '#101010' },
  deviceText: { color: '#101010', fontWeight: '900', fontSize: font.body },
  orText: { textAlign: 'center', fontSize: font.tiny, color: colors.inkMuted, marginVertical: 12 },
});
