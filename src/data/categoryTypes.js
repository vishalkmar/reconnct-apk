// Auto-generated from backend seedReconnctTaxonomy.js — category slug → type names.
// Embedded fallback so the host wizard's Type step works before the backend
// /public/types endpoint is deployed. Keep in sync with the seeder.
export const CATEGORY_TYPES = {
  "adventure": [
    "Trekking",
    "Camping",
    "Rafting",
    "Ziplining",
    "Rock Climbing",
    "ATV Experiences"
  ],
  "adventure-and-play": [
    "Theme Parks",
    "Water Parks",
    "Trampoline Parks",
    "Indoor Play Zones",
    "Adventure Parks",
    "Zipline Experiences"
  ],
  "adventure-together": [
    "Scuba Diving",
    "Trekking",
    "Kayaking",
    "Sailing",
    "Road Trips",
    "Camping",
    "Wildlife Safaris",
    "Adventure Parks"
  ],
  "community-events": [
    "Local Festivals",
    "Cultural Gatherings",
    "Community Markets",
    "Neighbourhood Events"
  ],
  "creative-activities": [
    "Art Workshops",
    "Craft Workshops",
    "Pottery Classes",
    "Music Classes",
    "Dance Classes",
    "Theatre Workshops",
    "Storytelling Sessions"
  ],
  "creativity": [
    "Pottery Workshops",
    "Painting Workshops",
    "Art Therapy",
    "Photography Workshops",
    "Music Workshops",
    "Dance Workshops",
    "Creative Writing Retreats",
    "Floral Arrangement Workshops"
  ],
  "entertainment": [
    "Theme Parks",
    "Water Parks",
    "Interactive Museums",
    "Festivals",
    "Live Shows"
  ],
  "family-experiences": [
    "Cooking Together",
    "Baking Workshops",
    "Treasure Hunts",
    "DIY Workshops",
    "Family Photoshoots"
  ],
  "family-holidays": [
    "Family Staycations",
    "Family Vacations",
    "Family Retreats",
    "Multi-Generational Travel"
  ],
  "fitness-and-adventure": [
    "Hiking Retreats",
    "Cycling Tours",
    "Fitness Bootcamps",
    "Marathon Camps",
    "Swimming Clinics",
    "Martial Arts Workshops"
  ],
  "food-and-nightlife": [
    "Food Trails",
    "Brewery Tours",
    "Wine Tastings",
    "Rooftop Experiences",
    "Brunch Experiences"
  ],
  "group-travel": [
    "Weekend Getaways",
    "Backpacking Trips",
    "Road Trips",
    "Group Retreats"
  ],
  "heritage-and-culture": [
    "Heritage Walks",
    "Museum Tours",
    "Cultural Festivals",
    "Classical Music Concerts",
    "Local Cultural Experiences"
  ],
  "learning-and-development": [
    "Leadership Retreats",
    "Innovation Workshops",
    "Strategy Offsites",
    "Skill Development Programs"
  ],
  "learning-and-discovery": [
    "Science Workshops",
    "Robotics Classes",
    "Coding Classes",
    "STEM Camps",
    "Astronomy Experiences",
    "Museum Visits",
    "Educational Tours"
  ],
  "learning-together": [
    "Cooking Classes",
    "Dance Classes",
    "Wine Appreciation",
    "Pottery Workshops",
    "Art Workshops",
    "Gardening Workshops",
    "Cooking Workshops",
    "Music Workshops",
    "Cultural Workshops"
  ],
  "leisure-travel": [
    "Luxury Train Journeys",
    "River Cruises",
    "Scenic Rail Trips",
    "Tea Estate Stays",
    "Houseboat Experiences",
    "Slow Travel Holidays"
  ],
  "nature-experiences": [
    "Camping",
    "Farm Visits",
    "Nature Trails",
    "Wildlife Safaris",
    "Bird Watching"
  ],
  "networking": [
    "Startup Meetups",
    "Entrepreneur Circles",
    "Industry Networking Events"
  ],
  "personal-growth": [
    "Life Coaching",
    "Executive Coaching",
    "Mindfulness Workshops",
    "Emotional Intelligence Workshops",
    "Confidence Building Workshops",
    "Leadership Retreats",
    "Journaling Workshops",
    "Vision Board Workshops",
    "Goal Setting Retreats"
  ],
  "recognition-and-celebration": [
    "Team Outings",
    "Annual Celebrations",
    "Reward Trips",
    "Employee Appreciation Events"
  ],
  "romantic-experiences": [
    "Couple Retreats",
    "Luxury Staycations",
    "Glamping",
    "Sunset Cruises",
    "Candlelight Dinners",
    "Private Dining",
    "Stargazing",
    "Hot Air Balloon Rides"
  ],
  "social-experiences": [
    "Escape Rooms",
    "Karaoke Nights",
    "Board Game Cafes",
    "Trivia Nights",
    "Comedy Shows"
  ],
  "social-impact": [
    "Sustainability Programs",
    "Tree Plantation Drives",
    "Beach Cleanups",
    "Environmental Campaigns"
  ],
  "spiritual-experiences": [
    "Pilgrimages",
    "Ashram Retreats",
    "Spiritual Retreats",
    "Temple Tours",
    "Meditation Retreats"
  ],
  "team-building": [
    "Outdoor Team Challenges",
    "Adventure Team Activities",
    "Corporate Retreats",
    "Offsites"
  ],
  "volunteering": [
    "NGO Volunteering",
    "Animal Shelter Programs",
    "Rural Tourism",
    "Community Projects"
  ],
  "wellness": [
    "Corporate Wellness Retreats",
    "Stress Management Workshops",
    "Mindfulness Sessions",
    "Yoga Programs"
  ],
  "wellness-and-healing": [
    "Yoga Retreats",
    "Meditation Retreats",
    "Silent Retreats",
    "Ayurveda Retreats",
    "Detox Retreats",
    "Panchakarma Programs",
    "Sound Healing",
    "Reiki Healing",
    "Breathwork Sessions",
    "Energy Healing",
    "Spa Retreats",
    "Wellness Weekends"
  ],
  "wellness-and-relaxation": [
    "Senior Wellness Retreats",
    "Ayurveda Retreats",
    "Spa Retreats",
    "Yoga Programs",
    "Nature Retreats"
  ],
  "wellness-together": [
    "Couple Yoga",
    "Couple Meditation",
    "Couple Spa",
    "Couple Sound Healing",
    "Relationship Retreats"
  ]
};

export function typesForCategorySlug(slug) {
  return CATEGORY_TYPES[slug] || [];
}
