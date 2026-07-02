import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Auth store with a persisted session. The token + user are saved to device
 * storage on sign-in and restored on launch, so closing/re-opening the app
 * keeps the user signed in for SESSION_MS (3 days). After that — or on
 * sign-out — the login screen returns. The backend JWT itself lives 7 days, so
 * a restored token (≤3 days old) is always still valid server-side.
 */
const AuthContext = createContext(null);
const KEY = 'reconnct.auth.v1';
const SESSION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // Restore a saved session on launch (fast — no network round-trip).
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.token && saved.expiresAt && Date.now() < saved.expiresAt) {
            setToken(saved.token);
            setUser(saved.user || null);
          } else {
            await AsyncStorage.removeItem(KEY);
          }
        }
      } catch { /* corrupt/no storage — fall through to login */ }
      finally { setBooting(false); }
    })();
  }, []);

  const persist = (t, u) => {
    AsyncStorage.setItem(KEY, JSON.stringify({ token: t, user: u, expiresAt: Date.now() + SESSION_MS })).catch(() => {});
  };

  const value = useMemo(() => ({
    token,
    user,
    booting,
    isAuthed: !!token,
    signIn: (t, u) => { setToken(t); setUser(u); persist(t, u); },
    signOut: () => { setToken(null); setUser(null); AsyncStorage.removeItem(KEY).catch(() => {}); },
    patchUser: (patch) => setUser((prev) => {
      const nu = { ...(prev || {}), ...patch };
      if (token) persist(token, nu);
      return nu;
    }),
  }), [token, user, booting]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
