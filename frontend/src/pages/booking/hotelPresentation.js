/* eslint-disable */
export function getHotelVisuals(hotelImages = []) {
  const images = Array.isArray(hotelImages) ? hotelImages : [];
  return {
    gallery: images,
    cardImage: images[0] || null,
    thumbImage: images[1] || images[0] || null,
    hostName: "Hotel Host",
    hostYears: 2,
    propertyLabel: "Premium Stay",
    highlightLabel: "Top-rated location",
    avatarStyle: {
      background: `linear-gradient(135deg, hsl(200 80% 92%), hsl(224 86% 84%))`,
      color: `hsl(200 54% 28%)`,
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
 
 