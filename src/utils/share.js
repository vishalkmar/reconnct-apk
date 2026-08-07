import { Share } from 'react-native';

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
