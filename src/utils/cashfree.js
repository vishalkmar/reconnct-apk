import { api } from '../api/client';
import { CASHFREE } from '../config';

/**
 * Backend-created payment link (preferred — keeps the flow server-authoritative).
 * Kept for callers that still use the public endpoint.
 */
export async function createPaymentLink({ amount, name, phone, email, purpose }) {
  const data = await api.cashfreeLink({ amount, name, phone, email, purpose });
  if (!data || !data.linkUrl) {
    throw new Error('Could not start the payment. Please try again.');
  }
  return data.linkUrl;
}

// Normalise a phone to what Cashfree accepts (Indian 10-digit → +91…), with a
// sandbox-safe fallback so a missing/odd number never blocks a test payment.
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  return '+919999999999';
}

/**
 * Create a Cashfree hosted payment LINK directly from the app against the SANDBOX
 * API (phase-1). Returns { linkId, linkUrl }. The caller registers linkId with
 * our backend so the booking still confirms when the link is paid.
 *
 * This exists because the server-side link call was failing to open the checkout
 * on some devices — talking to Cashfree directly is reliable on-device.
 */
export async function createDirectPaymentLink({ amount, name, phone, email, purpose, linkId }) {
  const id = linkId || `rc_${Date.now()}_${Math.floor(1000 + Math.random() * 8999)}`;
  const body = {
    link_id: String(id),
    link_amount: Number(amount),
    link_currency: 'INR',
    link_purpose: String(purpose || 'reconnct experience').slice(0, 100),
    customer_details: {
      customer_phone: normalizePhone(phone),
      customer_name: name || 'Guest',
      customer_email: email || 'guest@reconnct.app',
    },
    link_notify: { send_sms: false, send_email: false },
  };
  const res = await fetch(`${CASHFREE.API_BASE}/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': CASHFREE.API_VERSION,
      'x-client-id': CASHFREE.APP_ID,
      'x-client-secret': CASHFREE.APP_SECRET,
    },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch (_) { /* non-JSON */ }
  if (!res.ok || !json || !json.link_url) {
    const msg = (json && (json.message || json.error_description)) || `Cashfree link failed (${res.status})`;
    throw new Error(msg);
  }
  return { linkId: json.link_id || id, linkUrl: json.link_url };
}
