import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';

/**
 * Dependency-free navigator: a bottom-tab root with a push/pop stack layered
 * on top (for Detail etc.). Keeps the release APK to just the RN boilerplate —
 * no react-navigation / native screens to link.
 */
const NavContext = createContext(null);

export const TABS = ['home', 'search', 'experiences', 'inbox', 'profile'];
export const HOST_TABS = ['dashboard', 'listings', 'inbox', 'profile'];
const HOME_TAB = { traveller: 'home', host: 'dashboard' };

export function NavProvider({ children }) {
  const { isAuthed } = useAuth();
  const [mode, setMode] = useState('traveller'); // 'traveller' | 'host'
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]); // [{ name, params }]
  // Guest browsing: skipping login on the Login screen sets this true so
  // RootNavigator shows the main app without a signed-in session. Actions
  // that need an account (Book Now, etc.) go through requireAuth below.
  const [guestMode, setGuestMode] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(null); // { name, params } OR { run } to resume after login

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
