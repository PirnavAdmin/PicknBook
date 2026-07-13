import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import { getAccountProfile } from "../../services/accountProfileService";
import "../../STYLES/myAccount.css";

const accountCards = [
  {
    id: "booking",
    icon: "BK",
    title: "Booking",
    desc: "Manage and access the history of your bookings.",
    action: "booking",
  },
  {
    id: "Dashboard",
    icon: "DB",
    title: "Dashboard",
    desc: "Manage and add markups in items.",
    action: "dashboard",
  },
  {
    id: "Traveler List",
    icon: "PD",
    title: "Traveler Details",
    desc: "Manage and add passenger details.",
    action: "passenger",
  },
  {
    id: "Change Password",
    icon: "CP",
    title: "Change Password",
    desc: "Update your password and secure your account.",
    action: "security",
  },
];

const MyAccount = () => {
  const { userData, updateUserData } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const isB2B = location.pathname.startsWith("/b2b");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError("");

      try {
        const profile = await getAccountProfile();
        if (isMounted && Object.keys(profile).length > 0) {
          updateUserData(profile);
        }
      } catch {
        if (isMounted) {
          setProfileError("Unable to refresh profile details.");
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [updateUserData]);

  const readValue = (value) => (String(value || "").trim() ? String(value).trim() : "Not Added");

  const hydratedUserData = useMemo(() => {
    if (typeof window === "undefined") {
      return userData;
    }

    try {
      const key = isB2B ? "b2b_user" : "user";
      const storedUser = JSON.parse(window.localStorage.getItem(key) || "{}");
      return { ...storedUser, ...userData };
    } catch {
      return userData;
    }
  }, [userData, isB2B]);

  const userName =
    hydratedUserData.agencyName ||
    hydratedUserData.companyName ||
    hydratedUserData.businessName ||
    [hydratedUserData.firstName, hydratedUserData.lastName].filter(Boolean).join(" ") ||
    hydratedUserData.name ||
    hydratedUserData.fullName ||
    (hydratedUserData.email ? hydratedUserData.email.split("@")[0] : "User");

  const userLocation = hydratedUserData.location || hydratedUserData.city || "India";
  const profileInitial = userName?.trim()?.charAt(0)?.toUpperCase() || "U";

  const personalDetails = [
    { label: "First Name", value: readValue(hydratedUserData.firstName) },
    { label: "Last Name", value: readValue(hydratedUserData.lastName) },
    { label: "Email", value: readValue(hydratedUserData.email) },
    { label: "Mobile", value: readValue(hydratedUserData.phoneNumber || hydratedUserData.phone || hydratedUserData.mobile) },
    { label: "Location", value: userLocation },
  ];

  const handleCardClick = (action) => {
    if (isB2B) {
      if (action === "booking") {
        navigate("/b2b/dashboard/bus-bookings");
        return;
      }
      if (action === "passenger") {
        navigate("/b2b/dashboard/traveler-list");
        return;
      }
      if (action === "security") {
        navigate("/b2b/dashboard/change-password");
        return;
      }
      navigate("/b2b/dashboard");
      return;
    }

    if (action === "booking") {
      navigate("/dashboard/bus-bookings");
      return;
    }

    if (action === "passenger") {
      navigate("/dashboard/traveler-list");
      return;
    }

    if (action === "security") {
      navigate("/change-password");
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="account-page">
      <div className="account-shell">
        <aside className="account-sidebar">
          <div className="account-profile-card">
            <div className="account-profile-image">
              {hydratedUserData.profileImage ? (
                <img src={hydratedUserData.profileImage} className="account-profile-image-img" alt="Profile" />
              ) : (
                <span className="account-profile-placeholder">{profileInitial}</span>
              )}
            </div>

            <h3 className="account-user-name">{userName}</h3>
            {profileLoading && <p className="account-profile-status">Refreshing profile...</p>}
            {profileError && <p className="account-profile-status is-error">{profileError}</p>}

            <div className="account-personal-info">
              <div className="account-info-head">
                <h4>Personal Information</h4>
              </div>

              {personalDetails.map((item) => (
                <div className="account-info-row" key={item.label}>
                  <span className="account-info-label">{item.label}</span>
                  <span className="account-info-value">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="account-profile-actions">
              {!isB2B && (
                <button type="button" className="account-primary-btn" onClick={() => navigate("/edit-profile")}>
                  Edit Profile
                </button>
              )}
              <button
                type="button"
                className={isB2B ? "account-primary-btn" : "account-secondary-btn"}
                onClick={() => navigate(isB2B ? "/b2b/dashboard/change-password" : "/change-password")}
              >
                Change Password
              </button>
            </div>
          </div>
        </aside>

        <main className="account-main">
          <div className="account-header">
            <h1>Your Account</h1>
            <p>Manage your account and settings here.</p>
          </div>

          <div className="account-grid">
            {accountCards.map((card) => (
              <button
                key={card.id}
                type="button"
                className="account-card"
                onClick={() => handleCardClick(card.action)}
              >
                <div className="account-card-icon">{card.icon}</div>
                <h3 className="account-card-title">{card.title}</h3>
                <p className="account-card-desc">{card.desc}</p>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyAccount;
