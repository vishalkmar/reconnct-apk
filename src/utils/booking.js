// Shared booking helpers used by the booking flow.
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Set of bookable date-keys (YYYY-MM-DD) from a schedule: within its date range
// and on an allowed weekday.
export function bookableDateSet(schedule = {}, monthsAhead = 6) {
  const allowed = (schedule.availableDays || []).map((d) => d.slice(0, 3));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = schedule.startDate ? new Date(schedule.startDate) : today;
  const end = schedule.endDate ? new Date(schedule.endDate) : new Date(today.getTime() + monthsAhead * 31 * 86400000);
  const from = start > today ? start : today;
  const set = new Set();
  const d = new Date(from);
  while (d <= end) {
    if (allowed.length === 0 || allowed.includes(DOW[d.getDay()])) set.add(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return set;
}

export const ymd = (date) => date.toISOString().slice(0, 10);

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
