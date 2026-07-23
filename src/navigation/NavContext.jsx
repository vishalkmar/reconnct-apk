import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useSupplierAuth } from '../store/SupplierAuthContext';

/**
 * Dependency-free navigator: a bottom-tab root with a push/pop stack layered
 * on top (for Detail etc.). Keeps the release APK to just the RN boilerplate —
 * no react-navigation / native screens to link.
 */
const NavContext = createContext(null);

export const TABS = ['home', 'search', 'reconnect', 'experiences', 'profile'];
export const HOST_TABS = ['dashboard', 'listings', 'inbox', 'profile'];
export const SUPPLIER_TABS = ['dashboard', 'listings', 'profile'];
const HOME_TAB = { traveller: 'home', host: 'dashboard', supplier: 'dashboard' };

export function NavProvider({ children }) {
  const { isAuthed } = useAuth();
  const { isSupplierAuthed, booting: supplierBooting } = useSupplierAuth();
  const [mode, setMode] = useState('traveller'); // 'traveller' | 'host' | 'supplier'
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]); // [{ name, params }]
  // Guest browsing: skipping login on the Login screen sets this true so
  // RootNavigator shows the main app without a signed-in session. Actions
  // that need an account (Book Now, etc.) go through requireAuth below.
  const [guestMode, setGuestMode] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(null); // { name, params } OR { run } to resume after login

  // A Supplier's own session persists across app restarts (SupplierAuthContext,
  // 3-day AsyncStorage), but `mode` above always boots back to 'traveller'.
  // Without this, a cold start after a supplier login would leave `mode`
  // stuck on 'traveller' while RootNavigator's `browsing` gate still treats
  // the lingering supplier session as "logged in" — showing traveller
  // screens whose guest-login redirects (Book Now, Wishlist, Profile's Sign
  // In) then silently no-op since nothing ever flips `browsing` to false.
  // Restoring `mode` the moment the session is known to still be active
  // fixes this at the source instead of chasing it in every screen.
  useEffect(() => {
    if (supplierBooting) return;
    if (isSupplierAuthed) {
      setMode((m) => (m === 'traveller' ? 'supplier' : m));
    } else {
      // Signing out of the Supplier Portal (or a session simply expiring)
      // must fall back to 'traveller' just as reliably — otherwise `mode`
      // is stuck on 'supplier' with no session behind it, and the main
      // shell keeps rendering Supplier screens (with empty/default data)
      // instead of dropping into the traveller/guest flow.
      setMode((m) => (m === 'supplier' ? 'traveller' : m));
    }
  }, [supplierBooting, isSupplierAuthed]);

  const push = useCallback((name, params = {}) => {
    setStack((s) => [...s, { name, params }]);
  }, []);

  const pop = useCallback(() => {
    setStack((s) => s.slice(0, -1));
  }, []);

  const navigateTab = useCallback((next) => {
    setStack([]); // tab switch clears any pushed screens
    setTab(next);
  }, []);

  // Switch the whole app between traveller and host modes — clears the stack
  // and lands on that mode's home tab.
  const switchMode = useCallback((next) => {
    setStack([]);
    setMode(next);
    setTab(HOME_TAB[next] || 'home');
  }, []);

  // One logical "step back" for the hardware/system back button:
  //   pushed screen → pop it; on a non-home tab → go to mode home; else exit.
  // Returns true when handled (so the OS doesn't close the app).
  const goBack = useCallback(() => {
    if (stack.length > 0) { setStack((s) => s.slice(0, -1)); return true; }
    const home = HOME_TAB[mode] || 'home';
    if (tab !== home) { setTab(home); return true; }
    return false;
  }, [stack.length, tab, mode]);

  // Once sign-in completes, resume whatever action was gated behind it
  // (e.g. Book Now tapped as a guest) by pushing straight to it.
  useEffect(() => {
    if (isAuthed && pendingAuth) {
      if (pendingAuth.run) pendingAuth.run();
      else push(pendingAuth.name, pendingAuth.params);
      setPendingAuth(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  // Gate an action behind login: run it immediately if already signed in;
  // otherwise stash the destination and drop into the login flow (exiting
  // guest mode) — signing in resumes it via the effect above.
  const requireAuth = useCallback((name, params) => {
    if (isAuthed) { push(name, params); return; }
    setPendingAuth({ name, params });
    setGuestMode(false);
  }, [isAuthed, push]);

  // Same gate, but for an arbitrary callback instead of a screen push — used
  // by things like the wishlist heart (toggling isn't a navigation).
  const requireAuthAction = useCallback((run) => {
    if (isAuthed) { run(); return; }
    setPendingAuth({ run });
    setGuestMode(false);
  }, [isAuthed]);

  const value = useMemo(() => ({
    mode, switchMode, tab, stack, push, pop, navigateTab, goBack,
    top: stack.length ? stack[stack.length - 1] : null,
    guestMode, setGuestMode, requireAuth, requireAuthAction,
  }), [mode, switchMode, tab, stack, push, pop, navigateTab, goBack, guestMode, requireAuth, requireAuthAction]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export const useNav = () => useContext(NavContext);
