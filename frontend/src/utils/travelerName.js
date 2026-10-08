export function getTravelerName(name) {
  return String(name ?? "")
    .trim()
    .replace(/^(?:(?:mr|mrs|ms|miss|mx|dr|prof|sir|madam)\.?\s+)+/i, "");
}

export function getTravelerDisplayName(traveler) {
  const name = getTravelerName(traveler?.name || traveler?.Name) ||
    getTravelerName([traveler?.firstName || traveler?.FirstName, traveler?.lastName || traveler?.LastName].filter(Boolean).join(" "));
  const title = String(traveler?.title ?? traveler?.Title ?? "").trim();
  return [title, name].filter(Boolean).join(" ");
}
