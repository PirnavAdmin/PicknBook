/* eslint-disable */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaPlaneDeparture, FaBus } from "react-icons/fa";
import "../../STYLES/ChangePassword.css";
import "../../STYLES/DashboardSidebar.css";
import { readApiMessage, requestAuth } from "../../services/authService";
import { validatePasswordNoSpaces } from "../../utils/authValidation";
import DashboardSidebar from "../../components/layout/DashboardSidebar";
import brandLogo from "../../assets/images/brand/pick-n-book-logo.png";
import { openAuthModal } from "../../utils/authModalEvents";

function ChangePassword() {
  const navigate = useNavigate();
  const oldPasswordInputRef = useRef(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const openLoginPopup = () => {
    openAuthModal("login");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    oldPasswordInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const newErrors = {};

    const currentPasswordError = validatePasswordNoSpaces(
      currentPassword,
      "Old password"
    );
    const newPasswordError = validatePasswordNoSpaces(
      newPassword,
      "New password"
    );
    const confirmPasswordError = validatePasswordNoSpaces(
      confirmPassword,
      "Confirm password"
    );

    if (currentPasswordError) {
      newErrors.currentPassword = currentPasswordError;
    }

    if (newPasswordError) {
      newErrors.newPassword = newPasswordError;
    }

    if (confirmPasswordError) {
      newErrors.confirmPassword = confirmPasswordError;
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSuccess(false);
      setStatusMessage("Please fix the highlighted fields.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setErrors({});
      setIsSuccess(false);
      setStatusMessage("Session expired. Please login again.");
      setTimeout(openLoginPopup, 1200);
      return;
    }

    setLoading(true);
    setStatusMessage("");

    try {
      const payload = await requestAuth(
        "/api/Auth/change-password",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            oldPassword: currentPassword,
            newPassword
          })
        },
        "Unable to change password."
      );
      setErrors({});
      setIsSuccess(true);
      setStatusMessage(readApiMessage(payload, "Password changed successfully."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(openLoginPopup, 1200);
    } catch (error) {
      const message = error?.message || "Something went wrong. Please try again.";
      setIsSuccess(false);
      setStatusMessage(message);

      if (/session expired|unauthorized|invalid token|login again/i.test(message)) {
        setTimeout(openLoginPopup, 1200);
      }
    }

    setLoading(false);
  };

  return (
    <div className="dashboard-layout cp-dashboard-layout">
      <DashboardSidebar />
      <main className="dashboard-main cp-dashboard-main">
        <div className="cp-auth-page">
          <div className="cp-auth-card">
            <aside className="cp-auth-brand">
              <p className="cp-auth-kicker">Welcome to</p>
              <div className="cp-auth-logo">
                <FaPlaneDeparture />
                <FaBus />
              </div>
              <h1 className="cp-auth-brand-name">Travling</h1>
              <p className="cp-auth-brand-copy">
                Plan flights, buses, hotels and holiday trips with one secure traveler account.
              </p>
              <p className="cp-auth-brand-meta">Travel smarter. Manage bookings faster.</p>
            </aside>

            <section className="cp-auth-form-panel">
              <img
                src={brandLogo}
                alt="Pick N Book"
                className="auth-brand-logo auth-brand-logo-form"
              />
              <h2 className="cp-auth-heading">Change Password</h2>
              <p className="cp-auth-subheading">
                Update your account password to keep your trips secure.
              </p>

              <form className="cp-auth-form" onSubmit={handleSubmit}>
                <div className="cp-field">
                  <label htmlFor="old-password">
                    Old Password <span>*</span>
                  </label>
                  <div className={`cp-field-line ${errors.currentPassword ? "has-error" : ""}`}>
                    <input
                      ref={oldPasswordInputRef}
                      id="old-password"
                      className={errors.currentPassword ? "is-error" : ""}
                      type={showCurrent ? "text" : "password"}
                      placeholder="Enter old password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        setErrors((prev) => ({
                          ...prev,
                          currentPassword: /\s/.test(e.target.value)
                            ? "Old password cannot contain spaces"
                            : "",
                        }));
                        setStatusMessage("");
                      }}
                    />
                    <button
                      type="button"
                      className="cp-eye-btn"
                      onClick={() => setShowCurrent(!showCurrent)}
                      aria-label={showCurrent ? "Hide old password" : "Show old password"}
                    >
                      {showCurrent ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <p className="cp-field-error">{errors.currentPassword || "\u00A0"}</p>
                </div>

                <div className="cp-field">
                  <label htmlFor="new-password">
                    New Password <span>*</span>
                  </label>
                  <div className={`cp-field-line ${errors.newPassword ? "has-error" : ""}`}>
                    <input
                      id="new-password"
                      className={errors.newPassword ? "is-error" : ""}
                      type={showNew ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrors((prev) => ({
                          ...prev,
                          newPassword: /\s/.test(e.target.value)
                            ? "New password cannot contain spaces"
                            : "",
                        }));
                        setStatusMessage("");
                      }}
                    />
                    <button
                      type="button"
                      className="cp-eye-btn"
                      onClick={() => setShowNew(!showNew)}
                      aria-label={showNew ? "Hide new password" : "Show new password"}
                    >
                      {showNew ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <p className="cp-field-error">{errors.newPassword || "\u00A0"}</p>
                </div>

                <div className="cp-field">
                  <label htmlFor="confirm-password">
                    Confirm Password <span>*</span>
                  </label>
                  <div className={`cp-field-line ${errors.confirmPassword ? "has-error" : ""}`}>
                    <input
                      id="confirm-password"
                      className={errors.confirmPassword ? "is-error" : ""}
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors((prev) => ({
                          ...prev,
                          confirmPassword: /\s/.test(e.target.value)
                            ? "Confirm password cannot contain spaces"
                            : "",
                        }));
                        setStatusMessage("");
                      }}
                    />
                    <button
                      type="button"
                      className="cp-eye-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <p className="cp-field-error">{errors.confirmPassword || "\u00A0"}</p>
                </div>

                <div className="cp-auth-actions">
                  {statusMessage && statusMessage !== "Please fix the highlighted fields." && (
                    <p className={`cp-auth-status ${isSuccess ? "is-success" : "is-error"}`}>
                      {statusMessage}
                    </p>
                  )}
                  <button type="submit" className="cp-btn cp-btn-primary" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    className="cp-btn cp-btn-secondary"
                    onClick={openLoginPopup}
                  >
                    Back to Sign In
                  </button>
                </div>

                <p className="cp-auth-footnote">
                  Your details are protected with secure authentication.
                </p>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ChangePassword;
