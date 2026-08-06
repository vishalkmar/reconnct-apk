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
// `childCounts` is an array parallel to item.childBands — the number of children
// booked in each age band (so different age groups price independently).
export function priceBreakdown(item, adults, childCounts = []) {
  const adultPrice = item.fromPrice || 0;
  const bands = Array.isArray(item.childBands) ? item.childBands : [];

  let childCount = 0;
  let childSubtotal = 0;
  const childLines = [];
  bands.forEach((band, i) => {
    const n = Number((childCounts || [])[i]) || 0;
    if (!n) return;
    const price = band.charge ? (Number(band.price) || 0) : 0;
    childCount += n;
    childSubtotal += n * price;
    childLines.push({ startAge: band.startAge, endAge: band.endAge, count: n, price });
  });
  const subtotal = adults * adultPrice + childSubtotal;

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
  return {
    adultPrice, subtotal, discountAmt, gstAmt, convAmt, total, childCount, childLines, bands,
  };
}

// Per-adult "from" price WITH the go-live extras (GST + convenience, less any
// %-discount) applied — what the card / detail "from ₹X" should show once live.
export function finalFromPrice(item) {
  const b = priceBreakdown(item, 1, []);
  return b.total || (item.fromPrice || 0);
}
