import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Holds bookings confirmed in-app (after Cashfree payment) so they show up
 * immediately under Profile → My Bookings, merged with any server bookings.
 * In-memory for now (matches the demo auth which is also in-memory).
 */
const BookingsContext = createContext(null);

export function BookingsProvider({ children }) {
  const [bookings, setBookings] = useState([]);

  const addBooking = useCallback((b) => {
    setBookings((prev) => (prev.some((x) => x.bookingCode === b.bookingCode) ? prev : [b, ...prev]));
  }, []);

  const value = useMemo(() => ({ bookings, addBooking }), [bookings, addBooking]);
  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export const useBookings = () => useContext(BookingsContext) || { bookings: [], addBooking: () => {} };
