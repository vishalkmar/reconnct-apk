import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { api } from '../api/client';
import { useSupplierAuth } from './SupplierAuthContext';

/**
 * Supplier Portal state — same shape as HostContext (listings/stats/
 * transactions/profile/draft), but a completely separate store backed by
 * the Supplier's own login (SupplierAuthContext) and the /api/supplier/*
 * endpoints. Kept as its own file, not a branch inside HostContext, so the
 * Host ("Switch to Hosting") system never changes to support this.
 */
const SupplierContext = createContext(null);

const EMPTY_STATS = {
  listingCount: 0, activeCount: 0, pendingCount: 0, draftCount: 0,
  bookings: 0, earnedTotal: 0, earnedMonth: 0, pendingTotal: 0, rating: 0,
  recentBookings: [],
};

export function SupplierProvider({ children }) {
  const { token, supplier, isSupplierAuthed } = useSupplierAuth();
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const profile = useMemo(() => ({
    name: (supplier && supplier.companyName) || '',
    company: (supplier && supplier.supplierName) || '',
    email: (supplier && supplier.email) || '',
    phone: (supplier && supplier.phone) || '',
    address: '',
    photo: (supplier && supplier.image) || '',
  }), [supplier]);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [l, s, t] = await Promise.all([
        api.supplierListings(token).catch(() => null),
        api.supplierSummary(token).catch(() => null),
        api.supplierTransactions(token).catch(() => null),
      ]);
      if (l && Array.isArray(l.listings)) setListings(l.listings);
      if (s && s.stats) setStats(s.stats);
      if (t && Array.isArray(t.transactions)) setTransactions(t.transactions);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isSupplierAuthed) { setListings([]); setStats(EMPTY_STATS); setTransactions([]); return; }
    reload();
  }, [isSupplierAuthed, reload]);

  const [listingDraft, setListingDraft] = useState(null);
  const saveListingDraft = useCallback((d) => setListingDraft(d), []);
  const clearListingDraft = useCallback(() => setListingDraft(null), []);

  const addListing = useCallback(async (form, submit = false) => {
    const d = await api.supplierCreateListing(token, form, submit);
    const listing = (d && d.listing) || null;
    if (listing) setListings((prev) => [listing, ...prev]);
    reload();
    return listing ? listing.id : null;
  }, [token, reload]);

  const removeListing = useCallback(async (id) => {
    setListings((prev) => prev.filter((x) => x.id !== id));
    try { await api.supplierDeleteListing(token, id); } catch { /* keep optimistic */ }
    reload();
  }, [token, reload]);

  // Self-profile editing isn't built for suppliers yet — kept as a no-op so
  // HostProfileDetailScreen's copy doesn't crash if ever wired to it.
  const setProfile = useCallback(async () => {}, []);

  const bookingsForListing = useCallback((id) => (listings.find((l) => l.id === id) || {}).bookings || [], [listings]);

  const value = useMemo(() => ({
    token, listings, loading, reload, addListing, removeListing, bookingsForListing,
    profile, setProfile, transactions, stats,
    listingDraft, saveListingDraft, clearListingDraft,
  }), [token, listings, loading, reload, addListing, removeListing, bookingsForListing, profile, setProfile, transactions, stats, listingDraft, saveListingDraft, clearListingDraft]);

  return <SupplierContext.Provider value={value}>{children}</SupplierContext.Provider>;
}

export const useSupplier = () => useContext(SupplierContext) || {
  token: null, listings: [], loading: false, reload: () => {}, addListing: () => {}, removeListing: () => {}, bookingsForListing: () => [],
  profile: {}, setProfile: () => {}, transactions: [], stats: EMPTY_STATS,
  listingDraft: null, saveListingDraft: () => {}, clearListingDraft: () => {},
};
