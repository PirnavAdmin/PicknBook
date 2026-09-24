/**
 * Amenity Icon Mapping Utility
 * Returns both an IcoFont class and a contextual color per amenity.
 */

const AMENITY_MAP = [
  // WiFi / Internet
  { keywords: ["wi-fi", "wifi", "wireless", "internet", "broadband", "hotspot", "wi fi"], icon: "icofont-ui-wifi", color: "#0ea5e9" },

  // TV / Television / Entertainment screen
  { keywords: ["tv", "television", "flat-screen", "flatscreen", "cable tv", "satellite tv", "lcd", "screen"], icon: "icofont-ui-music-player", color: "#6366f1" },

  // Entertainment / Music / Show
  { keywords: ["entertainment", "on-site entertainment", "music", "show", "theatre", "theater", "lounge entertainment"], icon: "icofont-music-note", color: "#8b5cf6" },

  // Bed / Bedroom
  { keywords: ["bed", "bedroom", "number of bedroom", "double bed", "single bed", "king bed", "queen bed", "twin bed", "sofa bed"], icon: "icofont-bed", color: "#8b5cf6" },

  // Duvet / Blanket / Linen
  { keywords: ["duvet", "blanket", "pillow", "quilt", "linen", "bedsheet", "comforter", "hot water linen"], icon: "icofont-bed", color: "#a78bfa" },

  // Bathtub / Shower / Washroom
  { keywords: ["bathtub", "bath tub", "shower", "attached washroom", "en-suite", "ensuite", "washroom"], icon: "icofont-bathtub", color: "#06b6d4" },

  // Air Conditioning / Cooling
  { keywords: ["air condition", "air-condition", "cooling", "climate control", "air conditioning"], icon: "icofont-snow-flake", color: "#38bdf8" },

  // Swimming Pool
  { keywords: ["pool", "swim", "swimming"], icon: "icofont-swimmer", color: "#0284c7" },

  // Gym / Fitness
  { keywords: ["gym", "fitness", "workout", "exercise", "health club"], icon: "icofont-gym", color: "#10b981" },

  // Restaurant / Dining
  { keywords: ["restaurant", "dining", "buffet", "food court", "in-house dining"], icon: "icofont-restaurant", color: "#f59e0b" },

  // Coffee / Cafe
  { keywords: ["coffee", "cafe", "coffee shop", "barista", "espresso"], icon: "icofont-coffee-cup", color: "#92400e" },

  // Tea
  { keywords: ["tea"], icon: "icofont-coffee-mug", color: "#78350f" },

  // Happy Hour / Bar / Lounge / Drinks
  { keywords: ["happy hour", "bar", "pub", "cocktail", "drinks", "wine", "beer", "lounge"], icon: "icofont-coffee-alt", color: "#b45309" },

  // Breakfast / Meal
  { keywords: ["breakfast", "brunch", "morning meal", "meal"], icon: "icofont-food-basket", color: "#d97706" },

  // Laundry / Dry Cleaning / Washing / Ironing
  { keywords: ["laundry", "dry cleaning", "washing", "ironing", "iron", "laundry washing"], icon: "icofont-washing-machine", color: "#14b8a6" },

  // Water Bottle / Drinking Water
  { keywords: ["water bottle", "mineral water", "drinking water", "bottled water"], icon: "icofont-water-bottle", color: "#0ea5e9" },

  // Fan
  { keywords: ["fan", "ceiling fan", "table fan"], icon: "icofont-energy-air", color: "#7dd3fc" },

  // Charging / Power
  { keywords: ["charging", "power point", "socket", "electrical outlet", "power outlet", "charging point"], icon: "icofont-charging", color: "#fbbf24" },

  // Elevator / Lift / Accessible by elevator
  { keywords: ["elevator", "lift", "accessible by elevator", "escalator"], icon: "icofont-long-arrow-up", color: "#64748b" },

  // Wheelchair / Disability
  { keywords: ["wheelchair", "disability", "handicap"], icon: "icofont-wheelchair", color: "#64748b" },

  // Hanger / Wardrobe / Clothes Rack / Closet
  { keywords: ["hanger", "clothes rack", "coat hook", "cloth rack", "wardrobe", "closet"], icon: "icofont-hanger", color: "#a78bfa" },

  // Lamp / Light / Bulb
  { keywords: ["lamp", "light", "bulb", "reading light"], icon: "icofont-lamp", color: "#fcd34d" },

  // Desk / Workspace
  { keywords: ["desk", "workspace", "work area", "writing desk", "study table"], icon: "icofont-chair", color: "#94a3b8" },

  // Phone / Telephone
  { keywords: ["phone", "telephone", "call"], icon: "icofont-phone", color: "#22d3ee" },

  // Camera / CCTV / Surveillance
  { keywords: ["cctv", "security camera", "surveillance"], icon: "icofont-cc-camera", color: "#ef4444" },

  // Smoke Alarm / Fire Extinguisher / Sprinkler
  { keywords: ["smoke alarm", "smoke detector", "fire alarm", "fire extinguisher", "sprinkler"], icon: "icofont-fire-extinguisher", color: "#ef4444" },

  // No Smoking / Smoke-Free / Non-Smoking
  { keywords: ["no smoking", "non-smoking", "smoke-free", "smoke free", "non smoking", "smoke-complimentary", "smoke complimentary"], icon: "icofont-no-smoking", color: "#ef4444" },

  // Smoking Area
  { keywords: ["smoking area", "smoking room"], icon: "icofont-fire-alt", color: "#64748b" },

  // Smoke Alarms (separate from general smoke detection)
  { keywords: ["smoke alarms", "smoke alarm"], icon: "icofont-fire-extinguisher", color: "#ef4444" },

  // Medical / First Aid / Doctor / Nurse
  { keywords: ["first aid", "first aid kit", "doctor", "nurse on call", "nurse", "doctor/nurse"], icon: "icofont-first-aid", color: "#ef4444" },

  // Medical Sign / General Medical
  { keywords: ["medical", "pharmacy"], icon: "icofont-medical-sign", color: "#ef4444" },

  // Face Masks / Mask
  { keywords: ["face mask", "face masks", "free face mask", "mask"], icon: "icofont-medical-sign-alt", color: "#06b6d4" },

  // Sanitization / Hygiene / Disinfect / Cleaning products
  { keywords: ["sanitiz", "disinfect", "anti-viral", "anti viral", "cleaning product", "hygiene", "sanitiser", "sanitizer", "hand sanitizer", "seal after sanitization", "sanitized", "sanitizing service"], icon: "icofont-water-drop", color: "#0ea5e9" },

  // Physical Distancing
  { keywords: ["physical distancing", "social distancing", "distancing"], icon: "icofont-people", color: "#64748b" },

  // Allergy-free / Allergy
  { keywords: ["allergy", "allergen"], icon: "icofont-medicine", color: "#10b981" },

  // Safe / Locker / Safety Deposit
  { keywords: ["safe", "in-room safe", "safety box", "safety deposit", "safety deposit box", "locker"], icon: "icofont-key", color: "#f59e0b" },

  // Lock / Security
  { keywords: ["security", "lock", "deadbolt", "door lock"], icon: "icofont-lock", color: "#f59e0b" },

  // Security [24-hour]
  { keywords: ["security [24", "24-hour security", "24 hour security", "staff trained in safety", "safety protocol", "safety feature", "security feature"], icon: "icofont-ssl-security", color: "#f59e0b" },

  // Pet Friendly / Pets Allowed / Pet
  { keywords: ["pet friendly", "pet-friendly", "pets allowed", "pets", "pet ", "dog allowed", "cat allowed"], icon: "icofont-dog", color: "#f97316" },

  // Family Room / Family
  { keywords: ["family room", "family"], icon: "icofont-children-care", color: "#f97316" },

  // Meeting / Banquet / Conference
  { keywords: ["meeting", "banquet", "conference", "seminar", "board room"], icon: "icofont-people", color: "#6366f1" },

  // Luggage Storage / Baggage
  { keywords: ["luggage", "baggage", "bag storage", "left luggage"], icon: "icofont-luggage", color: "#94a3b8" },

  // Ticket Services / Tours
  { keywords: ["ticket service", "ticket", "tours", "tour desk"], icon: "icofont-ticket", color: "#f59e0b" },

  // Cashless / Payment / Card
  { keywords: ["cashless", "card payment", "payment service", "pay by card"], icon: "icofont-credit-card", color: "#10b981" },

  // Invoice / Bill / Receipt
  { keywords: ["invoice", "bill", "receipt"], icon: "icofont-bill", color: "#64748b" },

  // Xerox / Fax / Photocopier / Business Center
  { keywords: ["xerox", "fax", "photocopy", "scanner", "business center", "print"], icon: "icofont-printer", color: "#475569" },

  // Room Service / Daily Housekeeping
  { keywords: ["room service", "daily housekeeping", "housekeeping", "daily cleaning", "turndown"], icon: "icofont-hotel-boy", color: "#f97316" },

  // Check-In / Check-Out / Reception / Concierge / Front Desk
  { keywords: ["check-in", "check in", "check-out", "checkout", "reception", "concierge", "front desk", "bell boy", "bellboy"], icon: "icofont-5-star-hotel", color: "#f59e0b" },

  // Trash / Bin
  { keywords: ["trash", "bin", "dustbin", "garbage", "trash can"], icon: "icofont-trash", color: "#94a3b8" },

  // Newspaper
  { keywords: ["newspaper", "news"], icon: "icofont-newspaper", color: "#475569" },

  // Alarm / Wake Up
  { keywords: ["wake up", "wake-up", "alarm", "morning call", "wakeup service"], icon: "icofont-alarm", color: "#f97316" },

  // Soap / Shampoo / Toiletries / Towel
  { keywords: ["toiletries", "soap", "shampoo", "towel", "body wash", "conditioner", "body soap", "bathrobe"], icon: "icofont-water-drop", color: "#38bdf8" },

  // Parking / Car
  { keywords: ["parking", "valet", "car park"], icon: "icofont-car", color: "#64748b" },

  // Bicycle
  { keywords: ["bicycle", "bike", "cycling"], icon: "icofont-bicycle", color: "#22c55e" },

  // Minibar / Fridge / Kettle / Microwave
  { keywords: ["minibar", "mini bar", "mini-bar", "refrigerator", "fridge", "kettle", "electric kettle", "microwave"], icon: "icofont-coffee-pot", color: "#f97316" },

  // Terrace / Garden / Balcony / Outdoor
  { keywords: ["garden", "outdoor", "terrace", "balcony", "lawn", "courtyard"], icon: "icofont-tree-alt", color: "#22c55e" },

  // Spa / Massage / Sauna / Grooming / Beauty
  { keywords: ["spa", "massage", "sauna", "steam", "jacuzzi", "beauty", "salon", "grooming", "barber"], icon: "icofont-leaf", color: "#16a34a" },

  // Stationery / Office Supplies
  { keywords: ["stationery", "shared stationery"], icon: "icofont-bill-alt", color: "#94a3b8" },

  // Luggage (hotel boy with luggage)
  { keywords: ["hotel boy", "bellhop", "porter"], icon: "icofont-hotel-boy-alt", color: "#f97316" },
];

/**
 * Returns the best icon class and contextual color for a given amenity.
 * @param {object|string} amenity
 * @returns {{ icon: string, color: string }}
 */
export function getAmenityIcon(amenity) {
  const name = typeof amenity === "object"
    ? (amenity.name || amenity.Name || "")
    : String(amenity || "");

  const lower = name.toLowerCase().trim();

  for (const entry of AMENITY_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { icon: entry.icon, color: entry.color };
    }
  }

  return { icon: "icofont-ui-check", color: "#10b981" };
}

/**
 * Returns the display name of an amenity.
 * @param {object|string} amenity
 * @returns {string}
 */
export function getAmenityName(amenity) {
  if (typeof amenity === "object") return amenity.name || amenity.Name || "";
  return String(amenity || "");
}
