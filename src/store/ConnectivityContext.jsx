import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../api/client';

/**
 * App-wide connectivity powered by the NATIVE connectivity listener
 * (@react-native-community/netinfo) — exactly what Amazon / Flipkart / Zomato
 * use. It fires the instant the device gains or loses its network, so the
 * full-screen offline state appears the moment the net drops (anywhere in the
 * app, not just at launch) and disappears + refreshes the moment it returns —
 * no polling, no manual retry needed.
 *
 * `reconnectNonce` bumps on every offline→online flip; screens depend on it to
 * re-run their loaders automatically once connectivity is back.
 */
const ConnectivityContext = createContext(null);

export function ConnectivityProvider({ children }) {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const onlineRef = useRef(true);

  const apply = useCallback((isOnline) => {
    if (isOnline === onlineRef.current) return; // no change → nothing to do
    onlineRef.current = isOnline;
    setOnline(isOnline);
    if (isOnline) setReconnectNonce((n) => n + 1); // → screens auto-refresh
  }, []);

  // A device is "offline" for us when it has no active interface, or the OS has
  // determined the internet isn't actually reachable (captive portal, etc.).
  // `isInternetReachable` can be null (still checking) — treat that as online to
  // avoid a false flash of the offline screen.
  const evalState = useCallback((s) => {
    const off = s.isConnected === false || s.isInternetReachable === false;
    apply(!off);
  }, [apply]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(evalState); // instant on every change
    NetInfo.fetch().then(evalState).catch(() => {}); // initial state on mount
    return () => unsub();
  }, [evalState]);

  // Manual "Retry now" — re-read the native state and confirm the server is
  // reachable. (The listener normally handles recovery on its own.)
  const retry = useCallback(async () => {
    setChecking(true);
    try {
      const s = await NetInfo.fetch();
      if (s.isConnected === false) { apply(false); return; }
      await api.ping();
      apply(true);
    } catch { /* still down */ } finally { setChecking(false); }
  }, [apply]);

  const value = useMemo(() => ({
    online, checking, reconnectNonce, retry,
  }), [online, checking, reconnectNonce, retry]);

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export const useConnectivity = () => useContext(ConnectivityContext) || { online: true, reconnectNonce: 0, retry: () => {} };
