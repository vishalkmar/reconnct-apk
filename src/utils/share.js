import { Share } from 'react-native';
import RNShare from 'react-native-share';
import { API_BASE } from '../config';

// Binary → base64 without Buffer/btoa (RN has neither for binary).
const abToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const len = bytes.length;
  let out = '';
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += chars[b0 >> 2];
    out += chars[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < len ? chars[b2 & 63] : '=';
  }
  return out;
};

// XHR (arraybuffer) is the most reliable way to pull binary in RN.
const fetchArrayBuffer = (url, token) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.responseType = 'arraybuffer';
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.onload = () => ((xhr.status >= 200 && xhr.status < 300) ? resolve(xhr.response) : reject(new Error(`HTTP ${xhr.status}`)));
  xhr.onerror = () => reject(new Error('network error'));
  xhr.send();
});

// Share the ACTUAL voucher PDF file (the same one emailed) via the OS share
// sheet — WhatsApp, Gmail, Drive, etc. get the document, not just a link.
// Throws on failure so the caller can fall back to the text voucher.
export async function shareVoucherPdf({ code, token }) {
  if (!code) throw new Error('no booking code');
  const buf = await fetchArrayBuffer(`${API_BASE}/bookings/me/${encodeURIComponent(code)}/voucher.pdf`, token);
  const b64 = abToBase64(buf);
  await RNShare.open({
    title: `Voucher ${code}`,
    filename: `voucher-${code}`,
    url: `data:application/pdf;base64,${b64}`,
    type: 'application/pdf',
    failOnCancel: false,
  });
}

// Opens the OS share sheet (includes "Copy link") for an experience. Uses RN's
// built-in Share API — no native module needed.
export async function shareExperience(item) {
  if (!item) return;
  const url = `https://reconnct.app/experiences/${item.slug || item.id}`;
  try {
    await Share.share(
      { message: `${item.name} — discover it on reconnct\n${url}`, url, title: item.name },
      { dialogTitle: 'Share experience' },
    );
  } catch (_) { /* user dismissed */ }
}

// Share the BOOKING VOUCHER — the actual confirmed booking details (code, date,
// guests, amount) formatted as a voucher, so forwarding it on WhatsApp shares
// the voucher itself, not just the listing link. The full PDF voucher is also
// emailed; this is the instantly-forwardable copy.
export async function shareVoucher(v = {}) {
  const lines = [
    '🎟️ reconnct — Booking Voucher',
    '',
    v.name ? `${v.name}${v.city ? ` · ${v.city}` : ''}` : null,
    v.code ? `Booking ID: ${v.code}` : null,
    v.date ? `Date: ${v.date}${v.slot ? ` · ${v.slot}` : ''}` : null,
    v.guests != null ? `Guests: ${v.guests}` : null,
    v.total ? `Total paid: ${v.total}` : null,
    '',
    'Show this booking code at check-in.',
    v.url ? `\n${v.url}` : null,
  ].filter((l) => l !== null);
  try {
    await Share.share(
      { message: lines.join('\n'), title: v.code ? `Voucher ${v.code}` : 'Booking voucher' },
      { dialogTitle: 'Share voucher' },
    );
  } catch (_) { /* user dismissed */ }
}
