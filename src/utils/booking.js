// Shared booking helpers used by the booking flow.
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const ymd = (date) => date.toISOString().slice(0, 10);

// "09:00" → "9:00 AM" — same formatting the admin scheduling UI uses, so the
// slot shown in the app matches exactly what the host configured.
export const to12h = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

// Set of bookable date-keys (YYYY-MM-DD): exactly the dates the host picked in
// "Manage dates & slots" on the admin/host side — schedule.dates[].date —
// so the app never shows availability that isn't actually configured.
export function bookableDateSet(schedule = {}) {
  const dates = Array.isArray(schedule.dates) ? schedule.dates : [];
  const todayKey = ymd(new Date());
  const set = new Set();
  for (const d of dates) {
    if (d && d.date && d.date >= todayKey) set.add(d.date);
  }
  return set;
}

// The real slots configured for one specific date (schedule.dates[].slots),
// formatted for display. Empty if the host hasn't added slots for that date.
export function slotsForDate(schedule = {}, dateKey) {
  const dates = Array.isArray(schedule.dates) ? schedule.dates : [];
  const row = dateKey ? dates.find((d) => d.date === dateKey) : null;
  const slots = (row && row.slots) || [];
  return slots.map((s) => ({ ...s, label: `${to12h(s.start)} – ${to12h(s.end)}` }));
}

// Full price breakdown for the chosen guests.
export function priceBreakdown(item, adults, children) {
  const adultPrice = item.fromPrice || 0;
  const band = (item.childBands || []).find((b) => b.charge && b.price > 0);
  const childPrice = band ? band.price : 0;
  const subtotal = adults * adultPrice + children * childPrice;

  const disc = item.discount || null;
  let discountAmt = 0;
  if (disc && subtotal > 0) {
    discountAmt = disc.type === 'percentage' ? (subtotal * Number(disc.value)) / 100 : Number(disc.value) || 0;
  }
  const net = Math.max(0, subtotal - discountAmt);
  const gstAmt = (net * (item.gstRate || 0)) / 100;
  const afterGst = net + gstAmt;

  const cf = item.convenienceFee || null;
  let convAmt = 0;
  if (cf && cf.type !== 'free') {
    convAmt = cf.type === 'percentage' ? (afterGst * Number(cf.value)) / 100 : Number(cf.value) || 0;
  }
  const total = Math.round(afterGst + convAmt);
  return { adultPrice, childPrice, subtotal, discountAmt, gstAmt, convAmt, total, childBand: band };
}
