import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { toast } from '../utils/toast';

/**
 * Wishlist that works instantly and visibly:
 *   - keeps the hearted items in memory (key → item) so the heart stays filled
 *     and the Wishlist screen can render them WITHOUT waiting on the backend
 *   - still syncs to /api/wishlist in the background (best-effort) so it
 *     persists server-side once that endpoint is live
 * We intentionally do NOT revert the heart if the API call fails — the user's
 * intent is respected locally regardless.
 */
const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { token, isAuthed } = useAuth();
  const [map, setMap] = useState(() => new Map()); // key → item

  // Load any server-side saved keys on sign-in (best-effort).
  useEffect(() => {
    if (!isAuthed) { setMap(new Map()); return; }
    let alive = true;
    api.wishlist(token)
      .then((d) => {
        if (!alive || !d || !Array.isArray(d.items)) return;
        setMap((prev) => {
          const next = new Map(prev);
          d.items.forEach((it) => {
            const type = it.type || 'experience';
            next.set(`${type}:${it.id}`, it);
          });
          return next;
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [isAuthed, token]);

  const isWished = useCallback((type, id) => map.has(`${type}:${id}`), [map]);

  const toggle = useCallback((type, id, item) => {
    const key = `${type}:${id}`;
    const wished = map.has(key);
    // Optimistic flip for snappy UI…
    setMap((prev) => {
      const next = new Map(prev);
      if (wished) next.delete(key);
      else next.set(key, item || { id, type });
      return next;
    });
    if (!isAuthed) return;
    // …then persist. If the server call fails, revert so the local heart always
    // matches the database (this is what makes the app + website tally).
    (wished ? api.wishlistRemove(token, type, id) : api.wishlistAdd(token, type, id))
      .catch((e) => {
        setMap((prev) => {
          const next = new Map(prev);
          if (wished) next.set(key, item || { id, type });
          else next.delete(key);
          return next;
        });
        toast(e.message || 'Could not update wishlist');
      });
  }, [map, token, isAuthed]);

  const items = useMemo(() => Array.from(map.values()), [map]);

  const value = useMemo(() => ({ isWished, toggle, items, count: map.size }), [isWished, toggle, items, map]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext) || { isWished: () => false, toggle: () => {}, items: [], count: 0 };
