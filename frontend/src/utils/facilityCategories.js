/**
 * Facility Categorization Utility
 * Maps flat facility names into specific UI tabs (amenities, dining, safety).
 * Any unmapped item falls back to 'amenities'.
 */

// Dictionary mapping known keywords/phrases to their categories.
// We keep it flat and flexible.
const FACILITY_MAP = {
  // Dining
  "restaurant": "dining",
  "breakfast": "dining",
  "dining": "dining",
  "bar": "dining",
  "coffee": "dining",
  "cafe": "dining",
  "food": "dining",
  "lounge": "dining",
  "kitchen": "dining",
  "tea": "dining",
  "meal": "dining",
  "chef": "dining",
  "buffet": "dining",

  // Safety
  "smoke": "safety",
  "fire": "safety",
  "extinguisher": "safety",
  "security": "safety",
  "safe": "safety",
  "cctv": "safety",
  "alarm": "safety",
  "first aid": "safety",
  "medical": "safety",
  "emergency": "safety",
  
  // Views
  "view": "views",
  "balcony": "views",
  "terrace": "views",
  "garden": "views",
  "window": "views",
  "exterior": "views",
  "skyline": "views",
  "patio": "views",
  "pool with a view": "views"
};

/**
 * Categorizes an array of facility objects or strings into specific groups.
 * @param {Array} facilitiesArray - Array of strings or objects { name: string }
 * @returns {Object} { views: [], dining: [], safety: [], amenities: [] }
 */
export const categorizeFacilities = (facilitiesArray) => {
  const result = {
    views: [],
    dining: [],
    safety: [],
    amenities: [],
  };

  if (!Array.isArray(facilitiesArray)) return result;

  facilitiesArray.forEach((item) => {
    if (!item) return;

    // Extract the string name
    let val = "";
    if (typeof item === "object") {
      val = String(item.name || item.Name || item.title || "").trim();
    } else {
      val = String(item).trim();
    }

    if (!val || val === "[object Object]") return;

    const lowerVal = val.toLowerCase();
    
    // Find if it matches any known category keyword
    let category = "amenities"; // Default fallback
    for (const [keyword, cat] of Object.entries(FACILITY_MAP)) {
      if (lowerVal.includes(keyword)) {
        category = cat;
        break; // Stop at first match
      }
    }

    // Push the ORIGINAL unmutated value into the respective category
    result[category].push(val);
  });

  return result;
};
