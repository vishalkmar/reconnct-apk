import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

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
  const [mode, setMode] = useState('traveller'); // 'traveller' | 'host'
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

  const value = useMemo(() => ({
    mode, switchMode, tab, stack, push, pop, navigateTab, goBack,
    top: stack.length ? stack[stack.length - 1] : null,
  }), [mode, switchMode, tab, stack, push, pop, navigateTab, goBack]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export const useNav = () => useContext(NavContext);
