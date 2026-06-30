import { api } from '../api/client';

/**
 * Starts a Cashfree payment and returns the hosted checkout URL.
 *
 * The link is created by OUR backend (which holds the Cashfree keys in its
 * .env and calls Cashfree server-to-server). The app only talks to our API —
 * this is reliable on-device and keeps the secret out of the APK. The amount
 * and customer details are passed through dynamically per booking.
 */
export async function createPaymentLink({ amount, name, phone, email, purpose }) {
  const data = await api.cashfreeLink({ amount, name, phone, email, purpose });
  if (!data || !data.linkUrl) {
    throw new Error('Could not start the payment. Please try again.');
  }
  return data.linkUrl;
}
