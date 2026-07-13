import { getAuthToken, getAuthUser, getAuthUserId, setAuthUser } from "./authSession";
import { toApiUrl, withNgrokSkipWarningHeader } from "./apiClient";

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function pickFirst(source, keys, fallback = "") {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      const text = normalizeText(value);
      if (text) {
        return text;
      }
    }
  }

  return fallback;
}

function getStoredUserProfile() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem("user");
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getNestedProfile(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return (
    payload.user ||
    payload.User ||
    payload.profile ||
    payload.Profile ||
    payload.data?.user ||
    payload.data?.User ||
    payload.data?.profile ||
    payload.data?.Profile ||
    payload.data ||
    payload.Data ||
    payload
  );
}

function normalizeProfile(payload = {}) {
  const profile = getNestedProfile(payload);
  const firstName = pickFirst(profile, ["firstName", "FirstName", "givenName", "GivenName"]);
  const lastName = pickFirst(profile, ["lastName", "LastName", "surname", "Surname"]);
  const email = pickFirst(profile, ["email", "Email", "emailAddress", "EmailAddress"]);
  const mobile = pickFirst(profile, [
    "mobile",
    "Mobile",
    "phone",
    "Phone",
    "phoneNo",
    "PhoneNo",
    "phoneNumber",
    "PhoneNumber",
  ]);
  const name = pickFirst(
    profile,
    ["name", "Name", "fullName", "FullName"],
    [firstName, lastName].filter(Boolean).join(" ")
  );

  return {
    userId: pickFirst(profile, ["userId", "UserId", "id", "Id", "uid", "Uid"]),
    firstName,
    lastName,
    name,
    email,
    mobile,
    location: pickFirst(profile, ["location", "Location", "country", "Country"], "India"),
    profileImage: pickFirst(profile, [
      "profileImage",
      "ProfileImage",
      "profileImageUrl",
      "ProfileImageUrl",
      "avatarUrl",
      "AvatarUrl",
      "imageUrl",
      "ImageUrl",
    ]),
    walletBalance: pickFirst(profile, ["walletBalance", "WalletBalance"], 0.00),
    walletStatus: pickFirst(profile, ["walletStatus", "WalletStatus"], "Active"),
  };
}

function mergeProfiles(...profiles) {
  return profiles.reduce(
    (merged, profile) => ({
      ...merged,
      ...Object.fromEntries(
        Object.entries(profile || {}).filter(([, value]) => normalizeText(value))
      ),
    }),
    {}
  );
}

async function requestProfile(path) {
  const token = getAuthToken();
  const headers = withNgrokSkipWarningHeader(path, {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const response = await fetch(toApiUrl(path), { headers });

  if (!response.ok) {
    throw new Error(`Profile endpoint failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.toLowerCase().includes("json")) {
    return response.json();
  }

  return {};
}

export async function getAccountProfile() {
  const storedProfile = normalizeProfile(getStoredUserProfile());
  const sessionProfile = normalizeProfile(getAuthUser());
  const userId = getAuthUserId() || storedProfile.userId || sessionProfile.userId;
  const candidatePaths = [
    "/api/Profile",
    "/api/Auth/me",
    "/api/Auth/profile",
    "/api/Auth/user",
    userId ? `/api/Auth/users/${encodeURIComponent(userId)}` : "",
    userId ? `/api/Users/${encodeURIComponent(userId)}` : "",
  ].filter(Boolean);

  for (const path of candidatePaths) {
    try {
      const backendProfile = normalizeProfile(await requestProfile(path));
      const mergedProfile = mergeProfiles(storedProfile, sessionProfile, backendProfile);

      if (Object.keys(backendProfile).length > 0) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("user", JSON.stringify(mergedProfile));
        }
        setAuthUser(mergedProfile);
        return mergedProfile;
      }
    } catch {
      // Try the next known profile endpoint, then fall back to the saved login profile.
    }
  }

  return mergeProfiles(storedProfile, sessionProfile);
}
