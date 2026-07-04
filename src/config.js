/**
 * App configuration.
 *
 * API_BASE points at the LIVE backend on Render, so the phase-1 APK works on
 * any phone with internet (no same-Wi-Fi requirement). All data is real —
 * served by the backend's /api/public/* surface from the shared database.
 *
 * Other options if you ever need them:
 *   - Local backend on same Wi-Fi : http://192.168.1.8:5001/api
 *   - Android emulator → localhost: http://10.0.2.2:5001/api
 */
export const API_BASE = 'https://reconnct-again-backend.onrender.com/api';

// Origin (no /api) used to resolve relative /uploads/... image paths.
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

// Phase-1 demo sign-in (handled by the backend's userAuth backdoor).
export const DEMO_EMAIL = 'demo@reconnct.app';
export const DEMO_OTP = '123456';

/**
 * Cashfree — SANDBOX / TEST credentials only (phase-1). These are TEST keys, so
 * no real money moves. The app creates the hosted payment LINK directly against
 * Cashfree's sandbox so the checkout always opens on-device (the server round
 * trip was failing for some phones), then registers the link id with our backend
 * so the booking still auto-confirms on payment.
 *
 * ⚠️ NEVER put a production/live Cashfree secret in the app — it ships inside the
 * APK and can be extracted. Live keys must stay on the backend only.
 */
export const CASHFREE = {
  MODE: 'TEST',
  APP_ID: '__CASHFREE_APP_ID_REDACTED__',
  APP_SECRET: '__CASHFREE_APP_SECRET_REDACTED__',
  API_BASE: 'https://sandbox.cashfree.com/pg',
  API_VERSION: '2025-01-01',
};
