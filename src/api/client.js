import { API_BASE, API_ORIGIN } from '../config';

/**
 * Tiny fetch wrapper around the backend. Returns the `data` object from the
 * standard { success, message, data } envelope, or throws an Error whose
 * message is the server's `message` so screens can show it directly.
 */
async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error('Network error — check that the backend is running and API_BASE in src/config.js points to it.');
  }

  let json = null;
  try { json = await res.json(); } catch (_) { /* non-JSON */ }

  if (!res.ok || (json && json.success === false)) {
    throw new Error((json && json.message) || `Request failed (${res.status})`);
  }
  return json ? json.data : null;
}

/** Resolve a possibly-relative image path to an absolute URL. */
export function resolveImage(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function qs(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const api = {
  // ── Public experiences ──────────────────────────────────────────────
  listExperiences: (filters = {}) => request(`/public/experiences${qs(filters)}`),
  getExperience: (idOrSlug) => request(`/public/experiences/${idOrSlug}`),
  taxonomy: () => request('/public/taxonomy'),
  types: (categoryId) => request(`/public/types${qs({ categoryId })}`),
  cashfreeLink: (body) => request('/public/payments/cashfree-link', { method: 'POST', body }),
  cities: () => request('/public/cities'),
  appScreen: (key) => request(`/public/app-screen/${key}`),
  offerBanners: () => request('/public/offer-banners'),
  geoLocate: (lat, lon) => request(`/public/geo/locate${qs({ lat, lon })}`),
  geoNearby: (params = {}) => request(`/public/geo/nearby${qs(params)}`),

  // ── Auth (OTP) ──────────────────────────────────────────────────────
  requestOtp: (email) => request('/user-auth/request-otp', { method: 'POST', body: { email } }),
  resendOtp: (email) => request('/user-auth/resend-otp', { method: 'POST', body: { email } }),
  verifyOtp: (email, code) => request('/user-auth/verify-otp', { method: 'POST', body: { email, code } }),
  completeProfile: (token, body) => request('/user-auth/complete-profile', { method: 'POST', token, body }),
  me: (token) => request('/user-auth/me', { token }),
  updateProfile: (token, body) => request('/user-auth/profile', { method: 'PATCH', token, body }),

  // ── User panel (auth required) ──────────────────────────────────────
  myBookings: (token) => request('/bookings/me', { token }),
  createBooking: (token, body) => request('/bookings', { method: 'POST', token, body }),
  bookingLink: (token, code) => request(`/payments/links/${encodeURIComponent(code)}`, { method: 'POST', token }),
  bookingLinkStatus: (token, code) => request(`/payments/link-status/${encodeURIComponent(code)}`, { token }),
  wallet: (token) => request('/refer-earn/wallet', { token }),

  // ── Wishlist (auth required) ────────────────────────────────────────
  wishlist: (token) => request('/wishlist', { token }),
  wishlistKeys: (token) => request('/wishlist/keys', { token }),
  wishlistAdd: (token, entityType, entityId) => request('/wishlist', { method: 'POST', token, body: { entityType, entityId } }),
  wishlistRemove: (token, entityType, entityId) => request('/wishlist', { method: 'DELETE', token, body: { entityType, entityId } }),

  // ── Support chat (party = user / host) ──────────────────────────────
  supportConversation: (token, queue = 'user') => request(`/support/me/conversation${qs({ queue })}`, { token }),
  supportMessages: (token, conversationId, before) => request(`/support/me/messages${qs({ conversationId, before })}`, { token }),
  supportSend: (token, body) => request('/support/me/messages', { method: 'POST', token, body }),
  supportRead: (token, conversationId) => request('/support/me/read', { method: 'POST', token, body: { conversationId } }),
  supportUnread: (token) => request('/support/me/unread', { token }),
  // Multipart image upload → { type, url, name, size }.
  supportUpload: (token, asset) => uploadRequest('/support/attachments', asset, token),
};

// Multipart upload helper (RN FormData with { uri, name, type }).
async function uploadRequest(path, asset, token) {
  const form = new FormData();
  form.append('file', { uri: asset.uri, name: asset.name, type: asset.type });
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    });
  } catch (e) {
    throw new Error('Network error while uploading.');
  }
  let json = null;
  try { json = await res.json(); } catch (_) { /* non-JSON */ }
  if (!res.ok || (json && json.success === false)) {
    throw new Error((json && json.message) || `Upload failed (${res.status})`);
  }
  return json ? json.data : null;
}

// A small dummy image so cards/screens never render blank while real media loads
// or when an item has no image set. (Unsplash — picsum was unreachable on-device.)
export const DUMMY_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80';
