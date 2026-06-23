import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Dependency-free navigator: a bottom-tab root with a push/pop stack layered
 * on top (for Detail etc.). Keeps the release APK to just the RN boilerplate —
 * no react-navigation / native screens to link.
 */
const NavContext = createContext(null);

export const TABS = ['home', 'search', 'experiences', 'inbox', 'profile'];

export function NavProvider({ children }) {
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]); // [{ name, params }]

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

  // One logical "step back" for the hardware/system back button:
  //   pushed screen → pop it; on a non-home tab → go Home; else let the OS exit.
  // Returns true when handled (so the OS doesn't close the app).
  const goBack = useCallback(() => {
    if (stack.length > 0) { setStack((s) => s.slice(0, -1)); return true; }
    if (tab !== 'home') { setTab('home'); return true; }
    return false;
  }, [stack.length, tab]);

  const value = useMemo(() => ({
    tab, stack, push, pop, navigateTab, goBack,
    top: stack.length ? stack[stack.length - 1] : null,
  }), [tab, stack, push, pop, navigateTab, goBack]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export const useNav = () => useContext(NavContext);
