import AsyncStorage from '@react-native-async-storage/async-storage';

/*
  "Something new happened in review" marker for a listing card.

  There is no server-side read flag for review activity, so we fingerprint the
  parts of the round the owner cares about — stage, round number, how many
  sections are approved/objected, and how long each conversation is — and
  remember the fingerprint they last SAW (when they opened the listing's View
  screen). A dot shows whenever the current fingerprint differs.
*/
const key = (id) => `review_seen_${id}`;

export const reviewSignature = (l) => {
  const r = (l && l.review) || {};
  const threadLen = Object.values(r.thread || {})
    .reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);
  return [r.stage || '', r.round || 0, r.approved || 0, r.objection || 0, threadLen].join('|');
};

export const markReviewSeen = (id, listing) =>
  AsyncStorage.setItem(key(id), reviewSignature(listing)).catch(() => {});

// Returns a Set of listing ids that have unseen review activity.
export const loadUnseen = async (listings = []) => {
  const out = new Set();
  await Promise.all(listings.map(async (l) => {
    try {
      const seen = await AsyncStorage.getItem(key(l.id));
      // Never opened → don't nag; only flag a CHANGE they haven't seen.
      if (seen !== null && seen !== reviewSignature(l)) out.add(l.id);
    } catch { /* ignore */ }
  }));
  return out;
};
