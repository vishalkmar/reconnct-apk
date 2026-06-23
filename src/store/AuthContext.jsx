import React, { createContext, useContext, useState, useMemo } from 'react';

/**
 * Minimal auth store. Token is kept in memory for this build (no native
 * storage dependency), so closing the app returns you to the login screen —
 * fine for a test APK. Swap to AsyncStorage later for persistence.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const value = useMemo(() => ({
    token,
    user,
    isAuthed: !!token,
    signIn: (t, u) => { setToken(t); setUser(u); },
    signOut: () => { setToken(null); setUser(null); },
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
