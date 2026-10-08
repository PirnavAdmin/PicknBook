import { getTravelerName } from "./travelerName";

export const emptyTravelerFilters = () => ({ name: "", type: "", gender: "" });

export function filterTravelers(travelers, filters) {
  const name = filters.name.trim().toLowerCase();
  return travelers.filter((traveler) => {
    if (name && !getTravelerName(traveler.name || [traveler.firstName, traveler.lastName].filter(Boolean).join(" ")).toLowerCase().includes(name)) return false;
    if (filters.type && String(traveler.type || "Adult").toLowerCase() !== filters.type.toLowerCase()) return false;
    if (filters.gender && String(traveler.gender || "").toLowerCase() !== filters.gender.toLowerCase()) return false;
    return true;
  });
}
