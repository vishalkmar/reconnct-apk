// Fallback category-slug → audience-slug[] map (from the Reconnect taxonomy
// sheet). Used to filter broad categories by the selected audience even before
// the backend public taxonomy ships category.audiences. The taxonomy value
// (category.audiences) takes precedence when present.
export const CATEGORY_AUDIENCES = {
  'wellness-and-healing': ['self'],
  'personal-growth': ['self'],
  creativity: ['self'],
  'fitness-and-adventure': ['self'],
  'romantic-experiences': ['partner'],
  'wellness-together': ['partner'],
  'adventure-together': ['partner', 'family'],
  'learning-together': ['partner', 'elders-and-active-seniors', 'family'],
  'learning-and-discovery': ['kids-and-teens'],
  'creative-activities': ['kids-and-teens'],
  'adventure-and-play': ['kids-and-teens'],
  'nature-experiences': ['kids-and-teens'],
  'family-experiences': ['kids-and-teens'],
  'wellness-and-relaxation': ['elders-and-active-seniors'],
  'heritage-and-culture': ['elders-and-active-seniors'],
  'spiritual-experiences': ['elders-and-active-seniors'],
  'leisure-travel': ['elders-and-active-seniors'],
  'family-holidays': ['family'],
  entertainment: ['family'],
  'social-experiences': ['friends'],
  adventure: ['friends'],
  'food-and-nightlife': ['friends'],
  'group-travel': ['friends'],
  volunteering: ['community-and-new-connections'],
  'social-impact': ['community-and-new-connections'],
  'community-events': ['community-and-new-connections'],
  networking: ['community-and-new-connections'],
  'team-building': ['corporate-and-teams'],
  wellness: ['corporate-and-teams'],
  'learning-and-development': ['corporate-and-teams'],
  'recognition-and-celebration': ['corporate-and-teams'],
};

// Audiences a category belongs to: taxonomy value wins, else the fallback map.
export function categoryAudiences(cat) {
  if (Array.isArray(cat.audiences) && cat.audiences.length) return cat.audiences;
  return CATEGORY_AUDIENCES[cat.slug] || [];
}
