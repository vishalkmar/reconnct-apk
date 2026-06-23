// ₹12,500 — Indian grouping without relying on full Intl support on-device.
export function formatMoney(value, currency = 'INR') {
  const n = Math.round(Number(value) || 0);
  const sign = n < 0 ? '-' : '';
  const s = String(Math.abs(n));
  let out;
  if (s.length <= 3) {
    out = s;
  } else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  const symbol = currency === 'INR' ? '₹' : (currency ? currency + ' ' : '');
  return `${sign}${symbol}${out}`;
}

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
