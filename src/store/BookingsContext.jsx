import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Holds bookings confirmed in-app (after Cashfree payment) so they show up
 * immediately under Profile → My Bookings, merged with any server bookings.
 * In-memory for now (matches the demo auth which is also in-memory).
 *
 * Also tracks bookingCodes the user has "deleted" from My Bookings (cancelled
 * bookings only) — there's no backend delete-booking endpoint, so this is
 * purely a per-device hide-list, persisted so it survives app restarts.
 */
const BookingsContext = createContext(null);
const HIDDEN_KEY = 'reconnct.hiddenBookings.v1';

export function BookingsProvider({ children }) {
  const [bookings, setBookings] = useState([]);
  const [hidden, setHidden] = useState(() => new Set());

  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_KEY)
      .then((raw) => { if (raw) setHidden(new Set(JSON.parse(raw))); })
      .catch(() => {});
  }, []);

  const addBooking = useCallback((b) => {
    setBookings((prev) => (prev.some((x) => x.bookingCode === b.bookingCode) ? prev : [b, ...prev]));
  }, []);

  const hideBooking = useCallback((code) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(code);
      AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isHidden = useCallback((code) => hidden.has(code), [hidden]);

  const value = useMemo(() => ({ bookings, addBooking, hideBooking, isHidden }), [bookings, addBooking, hideBooking, isHidden]);
  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export const useBookings = () => useContext(BookingsContext) || { bookings: [], addBooking: () => {}, hideBooking: () => {}, isHidden: () => false };
