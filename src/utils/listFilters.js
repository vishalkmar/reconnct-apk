/*
  Shared filter model for the owner-facing lists in the app — Bookings,
  Listings and Transactions, on BOTH the supplier portal and a user's
  "Switch to Host" panel.

  Every one of those screens shows a single search bar with a "Filter" button;
  the button opens ListFilterBar's sheet, which reads/writes the `filters`
  object defined here. The date presets and their semantics are a direct port
  of the website's All Bookings page (HostAllBookingsPage.inRange) so a supplier
  gets identical results on web and mobile.
*/

export const DATE_PRESETS = [
  ['all', 'All time'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['this_week', 'This week'],
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
  ['3_months', 'Last 3 months'],
  ['6_months', 'Last 6 months'],
  ['this_year', 'This year'],
  ['last_year', 'Last year'],
  ['specific', 'On a specific date'],
  ['range', 'Date range'],
];

export const RATING_OPTIONS = [
  ['', 'Any rating'],
  ['4', '4★ & up'],
  ['3', '3★ & up'],
  ['2', '2★ & up'],
  ['1', '1★ & up'],
];

export const emptyFilters = () => ({
  date: 'all',
  specificDate: '',
  from: '',
  to: '',
  category: '',
  minRating: '',
  minAmount: '',
  maxAmount: '',
});

// Accepts 'YYYY-MM-DD' or a full ISO string; returns a Date at local midnight
// so day comparisons never trip over timezones.
const asDate = (v) => {
  if (!v) return null;
  const s = String(v);
  const d = s.length <= 10 ? new Date(`${s}T00:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};
const sameDay = (a, b) => a.toDateString() === b.toDateString();

// Does this row's date pass the chosen date filter? Mirrors the website.
export const inDateRange = (value, f) => {
  const filter = (f && f.date) || 'all';
  if (filter === 'all') return true;
  const d = asDate(value);
  if (!d) return false;
  const now = new Date();
  switch (filter) {
    case 'today': return sameDay(d, now);
    case 'yesterday': { const y = new Date(now); y.setDate(now.getDate() - 1); return sameDay(d, y); }
    case 'this_week': { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0); return d >= s; }
    case 'this_month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    case 'last_month': { const m = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear(); }
    case '3_months': { const s = new Date(now); s.setMonth(now.getMonth() - 3); return d >= s; }
    case '6_months': { const s = new Date(now); s.setMonth(now.getMonth() - 6); return d >= s; }
    case 'this_year': return d.getFullYear() === now.getFullYear();
    case 'last_year': return d.getFullYear() === now.getFullYear() - 1;
    case 'specific': { const s = asDate(f.specificDate); return !!s && sameDay(d, s); }
    case 'range': {
      const from = asDate(f.from);
      const to = asDate(f.to);
      if (!from && !to) return true;
      const t = d.setHours(0, 0, 0, 0);
      return (from ? t >= from.setHours(0, 0, 0, 0) : true)
        && (to ? t <= to.setHours(0, 0, 0, 0) : true);
    }
    default: return true;
  }
};

export const inAmountRange = (amount, f) => {
  const n = Number(amount) || 0;
  const min = f && f.minAmount !== '' ? Number(f.minAmount) : null;
  const max = f && f.maxAmount !== '' ? Number(f.maxAmount) : null;
  if (min !== null && Number.isFinite(min) && n < min) return false;
  if (max !== null && Number.isFinite(max) && n > max) return false;
  return true;
};

export const passesCategory = (category, f) => !f || !f.category || category === f.category;
export const passesRating = (rating, f) => !f || !f.minRating || (Number(rating) || 0) >= Number(f.minRating);

// Free-text match across whichever fields the screen considers searchable.
export const matchesQuery = (fields, query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return fields.filter((v) => v !== null && v !== undefined && v !== '')
    .some((v) => String(v).toLowerCase().includes(q));
};

// How many filters are actually narrowing the list — drives the little dot /
// count badge on the Filter button.
export const activeFilterCount = (f) => {
  if (!f) return 0;
  let n = 0;
  if (f.date && f.date !== 'all') n += 1;
  if (f.category) n += 1;
  if (f.minRating) n += 1;
  if (f.minAmount !== '' || f.maxAmount !== '') n += 1;
  return n;
};

/*
  One-call filter for a row. `get` supplies whatever the screen has:
    { date, amount, category, rating, search: [] }
  Any key left out simply isn't filtered on.
*/
export const passesFilters = (get, filters, query) => {
  if (get.search && !matchesQuery(get.search, query)) return false;
  if ('date' in get && !inDateRange(get.date, filters)) return false;
  if ('amount' in get && !inAmountRange(get.amount, filters)) return false;
  if ('category' in get && !passesCategory(get.category, filters)) return false;
  if ('rating' in get && !passesRating(get.rating, filters)) return false;
  return true;
};
