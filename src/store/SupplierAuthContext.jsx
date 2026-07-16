import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

/**
 * A Supplier's own login (own account, own password — NOT a User). Mirrors
 * AuthContext's shape/persistence pattern exactly, but a completely separate
 * session: signing in as a supplier never touches (or clears) a traveller/
 * host session that might also be saved on the same device, and vice versa
 * — RootNavigator decides which one is "active" via NavContext's `mode`.
 */
const SupplierAuthContext = createContext(null);
const KEY = 'reconnct.supplierAuth.v1';
const SESSION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days, same as the user session

export function SupplierAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.token && saved.expiresAt && Date.now() < saved.expiresAt) {
            setToken(saved.token);
            setSupplier(saved.supplier || null);
          } else {
            await AsyncStorage.removeItem(KEY);
          }
        }
      } catch { /* corrupt/no storage — fall through */ }
      finally { setBooting(false); }
    })();
  }, []);

  const persist = (t, s) => {
    AsyncStorage.setItem(KEY, JSON.stringify({ token: t, supplier: s, expiresAt: Date.now() + SESSION_MS })).catch(() => {});
  };

  const signIn = async (email, password) => {
    const data = await api.supplierLogin(email, password);
    setToken(data.token);
    setSupplier(data.supplier);
    persist(data.token, data.supplier);
    return data.supplier;
  };

  const signOut = () => {
    setToken(null);
    setSupplier(null);
    AsyncStorage.removeItem(KEY).catch(() => {});
  };

  const value = useMemo(() => ({
    token, supplier, booting, isSupplierAuthed: !!token, signIn, signOut,
  }), [token, supplier, booting]);

  return <SupplierAuthContext.Provider value={value}>{children}</SupplierAuthContext.Provider>;
}

export const useSupplierAuth = () => useContext(SupplierAuthContext);
