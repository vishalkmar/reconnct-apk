import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

/**
 * Host-side state for the "Switch to Hosting" flow. Everything is backed by the
 * real backend (/api/host/*): listings are Experiences owned by the signed-in
 * user, so what the app shows matches the website for the same account. A new
 * listing created through the wizard is persisted (draft or pending review) and
 * appears under My Listings immediately. The in-progress wizard draft is still
 * kept in memory so the form survives navigating away until submitted.
 */
const HostContext = createContext(null);

const EMPTY_STATS = {
  listingCount: 0, activeCount: 0, pendingCount: 0, draftCount: 0,
  bookings: 0, earnedTotal: 0, earnedMonth: 0, pendingTotal: 0, rating: 0,
  recentBookings: [],
};

export function HostProvider({ children }) {
  const { token, user, isAuthed, patchUser } = useAuth();
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Host profile is the user's profile (name/company/phone/address/photo) so it
  // tallies with the website. Kept as a derived object over the AuthContext user.
  const profile = useMemo(() => ({
    name: (user && user.name) || '',
    company: (user && user.company) || '',
    email: (user && user.email) || '',
    phone: (user && user.phone) || '',
    address: (user && (user.address || user.addressLine)) || '',
    photo: (user && (user.photo || user.avatarUrl)) || '',
  }), [user]);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [l, s, t] = await Promise.all([
        api.hostListings(token).catch(() => null),
        api.hostSummary(token).catch(() => null),
        api.hostTransactions(token).catch(() => null),
      ]);
      if (l && Array.isArray(l.listings)) setListings(l.listings);
      if (s && s.stats) setStats(s.stats);
      if (t && Array.isArray(t.transactions)) setTransactions(t.transactions);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthed) { setListings([]); setStats(EMPTY_STATS); setTransactions([]); return; }
    reload();
  }, [isAuthed, reload]);

  // In-progress Create-Listing draft — kept in memory so the wizard survives
  // navigating away / device back until the host submits or saves it.
  const [listingDraft, setListingDraft] = useState(null);
  const saveListingDraft = useCallback((d) => setListingDraft(d), []);
  const clearListingDraft = useCallback(() => setListingDraft(null), []);

  // Create a listing from the wizard form. submit=true → "Submit for Review"
  // (stored as pending), otherwise saved as a draft. Returns the new id.
  const addListing = useCallback(async (form, submit = false) => {
    const d = await api.hostCreateListing(token, form, submit);
    const listing = (d && d.listing) || null;
    if (listing) setListings((prev) => [listing, ...prev]);
    reload();
    return listing ? listing.id : null;
  }, [token, reload]);

  const removeListing = useCallback(async (id) => {
    setListings((prev) => prev.filter((x) => x.id !== id));
    try { await api.hostDeleteListing(token, id); } catch { /* keep optimistic */ }
    reload();
  }, [token, reload]);

  const setProfile = useCallback(async (p) => {
    // Optimistically reflect locally, then persist to the backend.
    patchUser(p);
    try {
      const d = await api.updateProfile(token, {
        name: p.name, phone: p.phone, company: p.company,
        addressLine: p.address, avatarUrl: p.photo,
      });
      const u = (d && d.user) || d;
      if (u) patchUser({ name: u.name, phone: u.phone, company: u.company, address: u.addressLine, photo: u.avatarUrl });
    } catch { /* local patch stands */ }
  }, [token, patchUser]);

  const bookingsForListing = useCallback((id) => (listings.find((l) => l.id === id) || {}).bookings || [], [listings]);

  const value = useMemo(() => ({
    token, listings, loading, reload, addListing, removeListing, bookingsForListing,
    profile, setProfile, transactions, stats,
    listingDraft, saveListingDraft, clearListingDraft,
  }), [token, listings, loading, reload, addListing, removeListing, bookingsForListing, profile, setProfile, transactions, stats, listingDraft, saveListingDraft, clearListingDraft]);

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}

export const useHost = () => useContext(HostContext) || {
  token: null, listings: [], loading: false, reload: () => {}, addListing: () => {}, removeListing: () => {}, bookingsForListing: () => [],
  profile: {}, setProfile: () => {}, transactions: [], stats: EMPTY_STATS,
  listingDraft: null, saveListingDraft: () => {}, clearListingDraft: () => {},
};
