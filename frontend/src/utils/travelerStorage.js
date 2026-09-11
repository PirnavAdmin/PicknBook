/* eslint-disable */
const TRAVELER_STORAGE_KEY = "my_traveler_data";

function readTravelerStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TRAVELER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTravelerStorage(travelers) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(TRAVELER_STORAGE_KEY, JSON.stringify(travelers));
  } catch {
    // Ignore storage write failures.
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function calculateAge(dob) {
  const value = normalizeText(dob);
  if (!value) {
    return "";
  }

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    return "";
  }

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : "";
}

function buildTravelerRecord(passenger, contact, index) {
  const title = normalizeText(passenger?.title);
  const firstName = normalizeText(passenger?.firstName);
  const lastName = normalizeText(passenger?.lastName);
  const fullName = normalizeText(
    `${title} ${firstName} ${lastName}` || passenger?.name || passenger?.fullName
  );

  return {
    id: Date.now() + index,
    name: fullName || `Passenger ${index + 1}`,
    email: normalizeText(passenger?.email) || normalizeText(contact?.email),
    mobile: normalizeText(passenger?.mobile) || normalizeText(passenger?.phone) || normalizeText(contact?.mobile),
    gender: normalizeText(passenger?.gender),
    age: calculateAge(passenger?.dob),
  };
}

export function saveBookingPassengersToTravelers(passengers, contact) {
  const nextTravelers = (Array.isArray(passengers) ? passengers : [])
    .map((passenger, index) => buildTravelerRecord(passenger, contact, index))
    .filter((traveler) => traveler.name);

  if (nextTravelers.length === 0) {
    return;
  }

  const existingTravelers = readTravelerStorage();
  const dedupedExisting = Array.isArray(existingTravelers) ? existingTravelers : [];

  const merged = [...dedupedExisting];

  nextTravelers.forEach((traveler) => {
    const alreadyPresent = merged.some((item) => {
      const sameName =
        normalizeText(item?.name).toLowerCase() === normalizeText(traveler.name).toLowerCase();
      const sameEmail =
        normalizeText(item?.email).toLowerCase() === normalizeText(traveler.email).toLowerCase();
      const sameMobile = normalizeText(item?.mobile) === normalizeText(traveler.mobile);

      if (traveler.email && traveler.mobile) {
        return sameName && sameEmail && sameMobile;
      }

      if (traveler.email) {
        return sameName && sameEmail;
      }

      if (traveler.mobile) {
        return sameName && sameMobile;
      }

      return sameName;
    });

    if (!alreadyPresent) {
      merged.push(traveler);
    }
  });

  writeTravelerStorage(merged);
}
