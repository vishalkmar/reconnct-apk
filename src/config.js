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
