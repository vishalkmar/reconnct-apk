import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Host-side state for the "Switch to Hosting" flow: the host's editable profile,
 * their listings (each with demo bookings), and derived transactions. Everything
 * lives client-side for phase-1; a new listing created through the onboarding
 * wizard is prepended so it shows under My Listings immediately. Wiring to the
 * backend host API comes later.
 */
const HostContext = createContext(null);

const bk = (id, guest, date, guests, amount, status) => ({ id, guest, date, guests, amount, status });

const SEED_LISTINGS = [
  {
    id: 'L-1001', status: 'active', title: 'Goa Coastal Kayaking Adventure',
    price: 1100, priceUnit: 'person', durationLabel: '2 hrs', rating: 4.8,
    image: 'https://images.unsplash.com/photo-1463694775559-8c6f9d76d6c0?w=800&q=80',
    category: 'Adventure', city: 'Goa',
    bookings: [
      bk('B-5001', 'Ravi Patel', '2026-07-22', 2, 2200, 'upcoming'),
      bk('B-5002', 'Sara Lewis', '2026-07-28', 3, 3300, 'upcoming'),
      bk('B-5003', 'Tom Williams', '2026-06-15', 3, 3300, 'completed'),
      bk('B-5004', 'Neha Gupta', '2026-06-02', 2, 2200, 'completed'),
    ],
  },
  {
    id: 'L-1002', status: 'active', title: 'Sunset Dolphin Boat Tour',
    price: 2200, priceUnit: 'person', durationLabel: '2 hrs', rating: 4.8,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    category: 'Nature', city: 'Goa',
    bookings: [
      bk('B-5005', 'Aisha Khan', '2026-07-20', 2, 4400, 'upcoming'),
      bk('B-5006', 'Mark Dsouza', '2026-06-10', 4, 8800, 'completed'),
    ],
  },
  {
    id: 'L-1003', status: 'draft', title: 'Konkan Coastal Trek at Dawn',
    price: 890, priceUnit: 'person', durationLabel: '4 hrs', rating: 4.4,
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80',
    category: 'Adventure', city: 'Maharashtra',
    bookings: [],
  },
];

const SEED_PROFILE = {
  company: '',
  photo: '',
  phone: '+91 98765 43210',
  address: 'Calangute, Goa, India',
};

export function HostProvider({ children }) {
  const [listings, setListings] = useState(SEED_LISTINGS);
  const [profile, setProfileState] = useState(SEED_PROFILE);

  const addListing = useCallback((l) => {
    const id = l.id || 'L-' + Math.floor(1000 + Math.random() * 8999);
    setListings((prev) => [{ id, status: 'pending', rating: 0, bookings: [], ...l }, ...prev]);
    return id;
  }, []);
  const removeListing = useCallback((id) => setListings((prev) => prev.filter((x) => x.id !== id)), []);
  const setProfile = useCallback((p) => setProfileState((prev) => ({ ...prev, ...p })), []);
  const bookingsForListing = useCallback((id) => (listings.find((l) => l.id === id) || {}).bookings || [], [listings]);

  // All bookings flattened into transactions (with their listing's title).
  const transactions = useMemo(() => {
    const out = [];
    listings.forEach((l) => (l.bookings || []).forEach((b) => out.push({
      ...b, listingId: l.id, listingTitle: l.title,
      type: b.status === 'completed' ? 'completed' : 'pending',
    })));
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [listings]);

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.type === 'completed');
    const pending = transactions.filter((t) => t.type === 'pending');
    return {
      earnedMonth: 18400,
      earnedTotal: completed.reduce((n, t) => n + t.amount, 0) || 18400,
      pendingTotal: pending.reduce((n, t) => n + t.amount, 0),
      bookings: transactions.length || 23,
      rating: 4.8,
      activeCount: listings.filter((l) => l.status === 'active').length,
      listingCount: listings.length,
    };
  }, [listings, transactions]);

  const value = useMemo(() => ({
    listings, addListing, removeListing, bookingsForListing,
    profile, setProfile, transactions, stats,
  }), [listings, addListing, removeListing, bookingsForListing, profile, setProfile, transactions, stats]);

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}

export const useHost = () => useContext(HostContext) || {
  listings: [], addListing: () => {}, removeListing: () => {}, bookingsForListing: () => [],
  profile: {}, setProfile: () => {}, transactions: [], stats: {},
};
