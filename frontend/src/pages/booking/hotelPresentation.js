/* eslint-disable */
const HOTEL_GALLERY_SETS = [
  [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?auto=format&fit=crop&w=900&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=900&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?auto=format&fit=crop&w=900&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
  ],
];
 
const HOST_NAMES = [
  "Aarav",
  "Meera",
  "Kabir",
  "Sana",
  "Ishita",
  "Rahul",
  "Tanya",
  "Vihaan",
];
 
const PROPERTY_LABELS = [
  "Guest favourite stay",
  "Boutique city stay",
  "Design-forward suite",
  "Family-ready apartment",
  "Work-and-weekend home",
  "Premium urban retreat",
];
 
const HIGHLIGHT_LABELS = [
  "Fast self check-in",
  "Peaceful neighborhood",
  "Great for longer stays",
  "Loved for room comfort",
  "Top-rated location",
  "Clean, modern interiors",
];
 
function hashString(value) {
  const input = String(value || "hotel").trim() || "hotel";
  let hash = 0;
 
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
 
  return hash;
}
 
function pickBySeed(collection, seedValue) {
  if (!Array.isArray(collection) || collection.length === 0) {
    return null;
  }
 
  return collection[hashString(seedValue) % collection.length];
}
 
export function getHotelVisuals(seedValue) {
  const seed = String(seedValue || "hotel");
  const gallery = pickBySeed(HOTEL_GALLERY_SETS, seed) || HOTEL_GALLERY_SETS[0];
  const hostName = pickBySeed(HOST_NAMES, `${seed}-host`) || HOST_NAMES[0];
  const propertyLabel = pickBySeed(PROPERTY_LABELS, `${seed}-property`) || PROPERTY_LABELS[0];
  const highlightLabel = pickBySeed(HIGHLIGHT_LABELS, `${seed}-highlight`) || HIGHLIGHT_LABELS[0];
  const hostYears = 2 + (hashString(`${seed}-years`) % 5);
  const avatarHue = hashString(`${seed}-avatar`) % 360;
 
  return {
    gallery,
    cardImage: gallery[0],
    thumbImage: gallery[1] || gallery[0],
    hostName,
    hostYears,
    propertyLabel,
    highlightLabel,
    avatarStyle: {
      background: `linear-gradient(135deg, hsl(${avatarHue} 80% 92%), hsl(${(avatarHue + 24) % 360} 86% 84%))`,
      color: `hsl(${avatarHue} 54% 28%)`,
    },
  };
}
 
export function formatNightLabel(nights) {
  const totalNights = Math.max(1, Number(nights) || 1);
  return `${totalNights} night${totalNights > 1 ? "s" : ""}`;
}
 
export function buildGuestSummary(searchContext = {}) {
  const rooms = Math.max(1, Number(searchContext?.rooms) || 1);
  const adults = Math.max(1, Number(searchContext?.adults) || 1);
  const children = Math.max(0, Number(searchContext?.children) || 0);
  const roomText = `${rooms} room${rooms > 1 ? "s" : ""}`;
  const adultText = `${adults} adult${adults > 1 ? "s" : ""}`;
  const childText = children > 0 ? `, ${children} child${children > 1 ? "ren" : ""}` : "";
 
  return `${roomText} · ${adultText}${childText}`;
}
 
export function buildStayFacts(hotel = {}, offer = {}, searchContext = {}) {
  const facts = [];
 
  if (hotel?.city) {
    facts.push(`Stay in ${hotel.city}`);
  }
 
  if (offer?.roomCategory) {
    facts.push(String(offer.roomCategory).replace(/_/g, " "));
  }
 
  if (offer?.bedType) {
    facts.push(`${offer.bedType} bed`);
  }
 
  if (searchContext?.adults) {
    facts.push(`${searchContext.adults} guest${Number(searchContext.adults) > 1 ? "s" : ""}`);
  }
 
  return facts.slice(0, 4);
}
 
export function buildStayHighlights(hotel = {}, offer = {}, nights = 1) {
  const hotelAmenities = Array.isArray(hotel?.amenities) ? hotel.amenities.filter(Boolean) : [];
  const highlights = [];
 
  if (hotelAmenities[0]) {
    highlights.push({
      title: hotelAmenities[0],
      text: "Frequently chosen by guests booking city stays.",
    });
  }
 
  highlights.push({
    title: `${formatNightLabel(nights)} ready`,
    text: "Dates and room pricing are already synced from the hotel API.",
  });
 
  if (offer?.cancellationPolicy) {
    highlights.push({
      title: "Policy clarity",
      text: String(offer.cancellationPolicy),
    });
  }
 
  highlights.push({
    title: hotel?.tag || "Great for planning",
    text: hotel?.address || hotel?.area || hotel?.city || "Central location",
  });
 
  return highlights.slice(0, 4);
}
 
 