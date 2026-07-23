// Generated PNG icons (build-safe — no native icon-font dependency).
export const ICONS = {
  locGray: require('./assets/loc-gray.png'),
  locMuted: require('./assets/loc-muted.png'),
  locWhite: require('./assets/loc-white.png'),
  search: require('./assets/search.png'),
  searchMuted: require('./assets/search-muted.png'),
  filter: require('./assets/filter.png'),
  cardGradient: require('./assets/card-gradient.png'),
  logoWhite: require('./assets/logo-white.png'),
  groups: require('./assets/glyph-groups.png'),
  compass: require('./assets/glyph-compass.png'),
  navHome: require('./assets/nav-home.png'),
  navSearch: require('./assets/nav-search.png'),
  navExp: require('./assets/nav-exp.png'),
  navInbox: require('./assets/nav-inbox.png'),
  navProfile: require('./assets/nav-profile.png'),
  bell: require('./assets/bell.png'),
  clock: require('./assets/clock.png'),
  people: require('./assets/ic-people.png'),
  share: require('./assets/ic-share.png'),
  heart: require('./assets/ic-heart.png'),
  heartFill: require('./assets/ic-heart-fill.png'),
  check: require('./assets/ic-check.png'),
  calendar: require('./assets/ic-calendar.png'),
  card: require('./assets/ic-card.png'),
  globe: require('./assets/ic-globe.png'),
  shield: require('./assets/ic-shield.png'),
  arrowRight: require('./assets/ic-arrowright.png'),
  settings: require('./assets/ic-settings.png'),
  ticket: require('./assets/ic-ticket.png'),
  tag: require('./assets/ic-tag.png'),
  layers: require('./assets/ic-layers.png'),
  rupee: require('./assets/ic-rupee.png'),
  sparkle: require('./assets/ic-sparkle.png'),
  dealFrameBlue: require('./assets/deal-frame-blue.png'),
  dealCardGrad: require('./assets/deal-card-grad.png'),
  partnerGrad: require('./assets/partner-grad.png'),
  brandGrad: require('./assets/brand-grad.png'),
  overlayGrad: require('./assets/overlay-grad.png'),
  scrimGrad: require('./assets/scrim-grad.png'),
  chart: require('./assets/ic-chart.png'),
  dollar: require('./assets/ic-dollar.png'),
  plane: require('./assets/ic-plane.png'),
  star: require('./assets/ic-star.png'),
  plus: require('./assets/ic-plus.png'),
  swap: require('./assets/ic-swap.png'),
  upload: require('./assets/ic-upload.png'),
  trash: require('./assets/ic-trash.png'),
  eye: require('./assets/ic-eye.png'),
  edit: require('./assets/ic-edit.png'),
  signout: require('./assets/ic-signout.png'),
  send: require('./assets/ic-send.png'),
  // Gray category (broad-category) line icons.
  catGlobe: require('./assets/cat-globe.png'),
  catHeart: require('./assets/cat-heart.png'),
  catMountain: require('./assets/cat-mountain.png'),
  catSprout: require('./assets/cat-sprout.png'),
  catPalette: require('./assets/cat-palette.png'),
  catBook: require('./assets/cat-book.png'),
  catDumbbell: require('./assets/cat-dumbbell.png'),
  catFood: require('./assets/cat-food.png'),
  catUsers: require('./assets/cat-users.png'),
  catPlane: require('./assets/cat-plane.png'),
  catSun: require('./assets/cat-sun.png'),
  catBriefcase: require('./assets/cat-briefcase.png'),
  catTree: require('./assets/cat-tree.png'),
  catStar: require('./assets/cat-star.png'),
  catCompass: require('./assets/cat-compass.png'),
  catTag: require('./assets/cat-tag.png'),
};

/*
  Map a category / audience name to a distinct gray icon, most specific first.

  Matching is on WORD STARTS, not bare substrings: a plain `includes` made
  "Partner" match 'art' (p-art-ner) and land on the palette, and "Recognition"
  match 'eco' (r-eco-gnition) and land on the tree. `\b` keeps short keywords
  like art / eco / spa usable without those collisions.
*/
const startsWord = (n, w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(n);

export function iconForCategory(name) {
  const n = (name || '').toLowerCase();
  const has = (...ws) => ws.some((w) => startsWord(n, w));

  // Audiences first — they're the narrower vocabulary and would otherwise be
  // swallowed by the broader category keywords below.
  if (has('yourself', 'solo', 'self')) return ICONS.catSprout;
  if (has('kid', 'teen', 'child', 'little one')) return ICONS.catStar;
  if (has('elder', 'senior')) return ICONS.catUsers;

  if (has('romantic', 'couple', 'love', 'partner')) return ICONS.catHeart;
  if (has('food', 'culinary', 'dining', 'cuisine', 'nightlife')) return ICONS.catFood;
  if (has('fitness', 'gym', 'sport', 'workout')) return ICONS.catDumbbell;
  if (has('nature', 'wildlife', 'eco', 'garden', 'outdoor')) return ICONS.catTree;
  if (has('adventure', 'trek', 'hiking', 'play', 'thrill')) return ICONS.catMountain;
  if (has('art', 'creativ', 'craft', 'paint', 'design')) return ICONS.catPalette;
  if (has('travel', 'getaway', 'trip', 'tour', 'staycation')) return ICONS.catPlane;
  if (has('wellness', 'relax', 'spa', 'health', 'well-being', 'wellbeing', 'spiritual', 'inner', 'meditat', 'mindful', 'yoga')) return ICONS.catSun;
  if (has('corporate', 'team', 'business', 'work', 'professional', 'network')) return ICONS.catBriefcase;
  if (has('learn', 'education', 'knowledge', 'study', 'skill')) return ICONS.catBook;
  if (has('discover', 'explore', 'journey')) return ICONS.catCompass;
  if (has('volunteer', 'impact', 'charity', 'giving')) return ICONS.catHeart;
  if (has('social', 'communit', 'together', 'family', 'group', 'friend', 'connection')) return ICONS.catUsers;
  if (has('entertainment', 'music', 'show', 'celebrat', 'recognition', 'fun')) return ICONS.catStar;
  if (has('growth', 'personal', 'develop')) return ICONS.catSprout;
  if (has('cultur', 'heritage', 'histor')) return ICONS.catGlobe;
  return ICONS.catTag;
}
