// Shared pieces for the auth screens (Login/OTP) — exact icons the user supplied
// (envelope + padlock, 14x14, amber) and the shared header decoration
// (two-tone overlapping circles + logo + tagline) used by both screens.
import React from 'react';
import { View, Text, Image, ImageBackground, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, font } from '../../theme';
import { ICONS } from '../../icons';

// Figma reference frame is 411dp wide — every absolute offset below (circle
// position/size, logo position, field width) was measured against that frame.
// Scaling by the device's actual width keeps the exact proportions/placement
// on any screen instead of baking in one fixed device size.
const FIGMA_W = 411;
const { width: SCREEN_W } = Dimensions.get('window');
const SCALE = SCREEN_W / FIGMA_W;
export const px = (v) => Math.round(v * SCALE);
export const FIELD_W = px(302);
export const CARD_PAD = px(24);
export const CARD_W = FIELD_W + CARD_PAD * 2;

export const MAIL_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.7695 2.07812H1.23047C0.550621 2.07812 0 2.63216 0 3.30859V10.6914C0 11.3719 0.554668 11.9219 1.23047 11.9219H12.7695C13.4437 11.9219 14 11.3742 14 10.6914V3.30859C14 2.63337 13.4516 2.07812 12.7695 2.07812ZM12.5972 2.89844C12.3458 3.1485 8.01946 7.45207 7.87008 7.60066C7.63766 7.83308 7.32867 7.96105 7 7.96105C6.67133 7.96105 6.36234 7.83305 6.12916 7.59989C6.0287 7.49995 1.75008 3.2439 1.40279 2.89844H12.5972ZM0.820312 10.5244V3.47607L4.3651 7.00219L0.820312 10.5244ZM1.40331 11.1016L4.9467 7.5807L5.54988 8.1807C5.93723 8.56805 6.45222 8.78136 7 8.78136C7.54778 8.78136 8.06277 8.56805 8.44936 8.18147L9.0533 7.5807L12.5967 11.1016H1.40331ZM13.1797 10.5244L9.6349 7.00219L13.1797 3.47607V10.5244Z" fill="#F9B402"/>
</svg>`;

export const LOCK_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.0863 3.63088V3.53775C10.0863 2.59948 9.71355 1.69964 9.0501 1.03618C8.38664 0.372726 7.4868 0 6.54853 0C5.61026 0 4.71042 0.372726 4.04697 1.03618C3.38351 1.69964 3.01079 2.59948 3.01079 3.53775V3.63088C2.71601 3.73471 2.4606 3.92724 2.27962 4.18203C2.09864 4.43683 2.00096 4.7414 2 5.05393V9.09707C2.00044 9.49905 2.16032 9.88444 2.44456 10.1687C2.72881 10.4529 3.1142 10.6128 3.51618 10.6132H9.58089C9.98287 10.6128 10.3683 10.4529 10.6525 10.1687C10.9367 9.88444 11.0966 9.49905 11.0971 9.09707V5.05393C11.0961 4.7414 10.9984 4.43683 10.8174 4.18203C10.6365 3.92724 10.3811 3.73471 10.0863 3.63088ZM6.54853 1.01079C7.21848 1.01157 7.86077 1.27806 8.3345 1.75178C8.80822 2.22551 9.07471 2.8678 9.0755 3.53775H4.02157C4.02236 2.8678 4.28884 2.22551 4.76257 1.75178C5.2363 1.27806 5.87858 1.01157 6.54853 1.01079ZM10.0863 9.09707C10.0861 9.23105 10.0328 9.3595 9.93806 9.45424C9.84332 9.54898 9.71487 9.60228 9.58089 9.60246H3.51618C3.38219 9.60228 3.25374 9.54898 3.159 9.45424C3.06426 9.3595 3.01096 9.23105 3.01079 9.09707V5.05393C3.01096 4.91994 3.06426 4.79149 3.159 4.69675C3.25374 4.60201 3.38219 4.54871 3.51618 4.54853H9.58089C9.71487 4.54871 9.84332 4.60201 9.93806 4.69675C10.0328 4.79149 10.0861 4.91994 10.0863 5.05393V9.09707ZM7.55932 6.5701C7.55892 6.74681 7.512 6.9203 7.42328 7.07312C7.33457 7.22594 7.20718 7.35272 7.05393 7.44069V8.08628C7.05393 8.22032 7.00068 8.34887 6.9059 8.44365C6.81112 8.53843 6.68257 8.59167 6.54853 8.59167C6.41449 8.59167 6.28595 8.53843 6.19117 8.44365C6.09639 8.34887 6.04314 8.22032 6.04314 8.08628V7.44069C5.89006 7.3517 5.76309 7.22399 5.67499 7.07039C5.58689 6.91679 5.54077 6.74272 5.54124 6.56565C5.54172 6.38858 5.58878 6.21475 5.6777 6.06163C5.76662 5.90851 5.89427 5.78148 6.04783 5.69331C6.20138 5.60513 6.37544 5.55892 6.55251 5.55931C6.72958 5.5597 6.90342 5.60668 7.05659 5.69553C7.20975 5.78438 7.33684 5.91197 7.42509 6.06549C7.51333 6.219 7.55963 6.39303 7.55932 6.5701Z" fill="#F9B402"/>
</svg>`;

// Person / phone field icons — same 14x14 amber-line style as MAIL_SVG/LOCK_SVG,
// used by the onboarding "Create your profile" fields.
export const USER_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" fill="#F9B402"/>
</svg>`;

export const PHONE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z" fill="#F9B402"/>
</svg>`;

// Shield-check note icon (sits in the amber chip next to the OTP disclaimer).
const SHIELD_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F9B402" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
<path d="M9 12l2 2 4-4"/>
</svg>`;

// Decorative wavy underline beneath "loved ones" in the tagline.
const SQUIGGLE_SVG = `<svg width="100" height="8" viewBox="0 0 100 8" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 5C10 1 18 1 26 5C34 9 42 9 50 5C58 1 66 1 74 5C82 9 90 9 98 5" stroke="#F9B402" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

// Header decoration shared by Login + OTP screens: a big circle bleeding off
// the top-right edge, a separate small circle at top:110/left:78, then the
// real logo IMAGE (tinted brand-orange, not text) at top:224/left:78, and the
// tagline directly under it — with "loved ones" underlined by a hand-drawn
// squiggle. Every offset is scaled from the 411dp Figma frame.
export function AuthHeader() {
  return (
    <View style={authStyles.decorWrap}>
      <View style={authStyles.circleBig} />
      <View style={authStyles.circleSmall} />
      <Image source={ICONS.logoWhite} resizeMode="contain" style={authStyles.logoImg} />
      <View style={authStyles.taglineWrap}>
        <Text style={authStyles.tagline}>with your <Text style={authStyles.taglineEm}>loved ones</Text></Text>
        <SvgXml xml={SQUIGGLE_SVG} width={px(100)} height={px(8)} style={authStyles.squiggle} />
      </View>
    </View>
  );
}

// White rounded card the field(s) + note sit inside — matches the Figma
// "Choose Location"-style card treatment used elsewhere in the app.
export function AuthCard({ children, style }) {
  return <View style={[authStyles.card, style]}>{children}</View>;
}

// Amber icon chip + helper copy row, used under the field(s) inside the card.
export function AuthNote({ children }) {
  return (
    <View style={authStyles.noteRow}>
      <View style={authStyles.noteIconWrap}>
        <SvgXml xml={SHIELD_SVG} width={px(16)} height={px(16)} />
      </View>
      <Text style={authStyles.noteText}>{children}</Text>
    </View>
  );
}

export function AuthField({ icon, style, ...inputProps }) {
  return (
    <View style={[authStyles.fieldWrap, style]}>
      <SvgXml xml={icon} width={14} height={14} />
      <TextInput style={authStyles.fieldInput} placeholderTextColor={colors.inkFaint} {...inputProps} />
    </View>
  );
}

// Active state fills with the brand gradient (white label + arrow); disabled
// stays a flat grey with no arrow.
export function AuthButton({ label, active, loading, onPress, style }) {
  const content = loading ? (
    <ActivityIndicator color={active ? '#fff' : '#9CA3AF'} />
  ) : (
    <View style={authStyles.btnRow}>
      <Text style={[authStyles.btnText, active && authStyles.btnTextActive]}>{label}</Text>
      {active && <Image source={ICONS.arrowRight} style={authStyles.btnArrow} />}
    </View>
  );

  if (active) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={loading} style={[authStyles.btn, style]}>
        <ImageBackground source={ICONS.brandGrad} resizeMode="stretch" style={authStyles.btnFill}>
          {content}
        </ImageBackground>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[authStyles.btn, authStyles.btnDisabled, style]} activeOpacity={0.85} onPress={onPress} disabled>
      {content}
    </TouchableOpacity>
  );
}

export const authStyles = StyleSheet.create({
  decorWrap: { position: 'relative' },
  // Shrunk + repositioned so it stops just short of the logo (bottom edge at
  // -70+260=190, well clear of the logo's top:224) — it was overlapping the
  // wordmark before.
  circleBig: {
    position: 'absolute', top: px(-70), right: px(-70),
    width: px(260), height: px(260), borderRadius: px(130),
    backgroundColor: colors.brand,
  },
  circleSmall: {
    position: 'absolute', top: px(110), left: px(78),
    width: px(85), height: px(85), borderRadius: px(42.5),
    backgroundColor: colors.brandDark,
  },
  // width:255 height computed from the logo PNG's REAL native ratio (600x111)
  // instead of a guessed height — a mismatched box ratio made `contain` shrink
  // the image and pad empty space on the sides, so it read as no bigger (even
  // smaller) than the tagline. (Not using the `aspectRatio` style prop here —
  // that combined with an explicit width made the Image stretch to fill the
  // row on this RN version, which is why the earlier attempt broke.)
  logoImg: { width: px(255), height: px(255 * (111 / 600)), marginTop: px(224), marginLeft: px(78), tintColor: colors.brandDark },
  // Exact spec: width 204 / height 26, top 261 (≈1px under the logo's own
  // bottom edge of 224+36=260), left 93, font-size 22.
  taglineWrap: { width: px(204), marginTop: px(1), marginLeft: px(93) },
  tagline: { fontSize: px(22), lineHeight: px(26), color: colors.inkMuted },
  taglineEm: { color: colors.inkMuted, fontWeight: '600' },
  squiggle: { position: 'absolute', right: px(2), bottom: px(-7) },

  // White card wrapping the field(s) + note — floats over the header/bg.
  card: {
    width: CARD_W, alignSelf: 'center', marginTop: px(28),
    backgroundColor: '#fff', borderRadius: px(24),
    paddingHorizontal: CARD_PAD, paddingVertical: px(22),
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
  },

  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: FIELD_W, alignSelf: 'center',
    backgroundColor: '#FFFCF2',
    borderWidth: 1.5, borderColor: colors.brand,
    borderRadius: px(12), height: px(48), paddingHorizontal: 12,
  },
  fieldInput: { flex: 1, fontSize: px(14), color: colors.ink, paddingVertical: 0 },

  noteRow: { flexDirection: 'row', alignItems: 'center', gap: px(10), width: FIELD_W, alignSelf: 'center', marginTop: px(14) },
  noteIconWrap: { width: px(36), height: px(36), borderRadius: px(18), backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1, fontSize: px(13), lineHeight: px(18), color: '#4B4B57' },

  btn: { width: FIELD_W, alignSelf: 'center', height: px(52), borderRadius: px(14), marginTop: 16, overflow: 'hidden' },
  btnFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { backgroundColor: '#E7E7EB', alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontWeight: '800', fontSize: font.body, color: '#9CA3AF' },
  btnTextActive: { color: '#fff' },
  btnArrow: { width: 16, height: 16, tintColor: '#fff' },
});
