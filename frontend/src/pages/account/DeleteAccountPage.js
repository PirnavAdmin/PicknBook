/* eslint-disable */
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  KeyRound,
  ReceiptText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { UserContext } from "../../contexts/UserContext";
import { deleteAccount } from "../../services/accountProfileService";
import { clearAuthSession } from "../../services/authSession";
import "../../STYLES/deleteAccount.css";

const REASONS = [
  { value: "no-longer-needed", label: "I no longer need this account" },
  { value: "duplicate-account", label: "I have another account" },
  { value: "privacy", label: "Privacy concerns" },
  { value: "experience", label: "I had an issue with my experience" },
  { value: "switching", label: "I am switching to another service" },
  { value: "other", label: "Other" },
];

function getStoredUser() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export default function DeleteAccountPage() {
  const { userData } = useContext(UserContext);
  const navigate = useNavigate();
  const profile = { ...getStoredUser(), ...userData };
  const email = String(profile.email || profile.Email || "").trim();
  const fullName = [profile.firstName || profile.FirstName, profile.lastName || profile.LastName]
    .filter(Boolean)
    .join(" ") || profile.name || profile.fullName || email.split("@")[0] || "Pick&book customer";
  const phoneNo = String(profile.mobile || profile.phoneNumber || profile.phone || "").trim();

  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!reason) {
      setError("Choose a reason for your request.");
      return;
    }
    if (reason === "other" && !otherReason.trim()) {
      setError("Please tell us why you want to close your account.");
      return;
    }
    if (!email) {
      setError("We could not find the email linked to your account. Please contact support.");
      return;
    }
    if (!acknowledged) {
      setError("Please confirm that you understand the account closure information.");
      return;
    }

    const reasonLabel = REASONS.find((item) => item.value === reason)?.label || reason;
    const message = [
      "Account deletion request submitted from the signed-in customer dashboard.",
      `Reason: ${reasonLabel}`,
      reason === "other" ? `Additional details: ${otherReason.trim()}` : "",
      `Account email: ${email}`,
      `Account user ID: ${profile.userId || profile.id || "Not available"}`,
    ].filter(Boolean).join("\n\n");

    setIsSubmitting(true);
    try {
      await deleteAccount({
        reason: reasonLabel,
        additionalDetails: reason === "other" ? otherReason.trim() : "",
        email,
      });
      clearAuthSession();
      setRequestId("DELETED");
    } catch (submitError) {
      const responseMessage = submitError?.response?.data?.message || submitError?.message;
      setError(typeof responseMessage === "string" ? responseMessage : "We could not delete your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (requestId) {
    return (
      <main className="delete-account-page">
        <div className="delete-account-container">
          <section className="delete-success-panel" aria-live="polite">
            <span className="delete-success-icon"><CheckCircle2 size={28} /></span>
            <p className="delete-eyebrow">ACCOUNT DELETED</p>
            <h1>Your account has been deleted</h1>
            <p className="delete-success-copy">
              We're sorry to see you go. Your account has been permanently deleted and all your sessions have been logged out.
            </p>
            <button type="button" className="delete-secondary-button" onClick={() => {
              navigate("/");
              window.location.reload();
            }}>
              <ArrowLeft size={16} /> Go to Home
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="delete-account-page">
      <div className="delete-account-container">
        <button type="button" className="delete-back-link" onClick={() => navigate("/dashboard/my-account")}>
          <ArrowLeft size={16} /> My Account
        </button>

        <header className="delete-page-header">
          <p className="delete-eyebrow">ACCOUNT SETTINGS</p>
          <h1>Delete your account</h1>
          <p>We’re sorry to see you go. This action is permanent and cannot be undone.</p>
        </header>

        <div className="delete-account-layout">
          <section className="delete-information" aria-labelledby="delete-info-heading">
            <div className="delete-notice">
              <AlertTriangle size={20} />
              <div>
                <h2 id="delete-info-heading">Before you continue</h2>
                <p>This will instantly and permanently close your account. All your personal data will be removed.</p>
              </div>
            </div>

            <ul className="delete-consequences">
              <li>
                <span><KeyRound size={18} /></span>
                <div><strong>Account access</strong><p>You will be immediately logged out and lose access to all account features.</p></div>
              </li>
              <li>
                <span><ReceiptText size={18} /></span>
                <div><strong>Bookings and payments</strong><p>Booking and transaction records may be retained where required for legal, accounting, or service obligations.</p></div>
              </li>
              <li>
                <span><Clock3 size={18} /></span>
                <div><strong>Open activity</strong><p>If you have upcoming travel, a pending refund, or wallet balance, mention it so support can review it before closure.</p></div>
              </li>
            </ul>
          </section>

          <form className="delete-request-form" onSubmit={handleSubmit}>
            <div className="delete-form-heading">
              <h2>Request account deletion</h2>
              <p>Account: <strong>{email || "Email unavailable"}</strong></p>
            </div>

            <label className="delete-field-label" htmlFor="delete-reason">Reason for leaving</label>
            <select
              id="delete-reason"
              className="delete-field-control"
              value={reason}
              onChange={(event) => { setReason(event.target.value); setError(""); }}
              required
            >
              <option value="" disabled>Select a reason</option>
              {REASONS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
            </select>

            {reason === "other" && (
              <>
                <label className="delete-field-label" htmlFor="delete-other-reason">Tell us more</label>
                <textarea
                  id="delete-other-reason"
                  className="delete-field-control delete-reason-textarea"
                  value={otherReason}
                  onChange={(event) => { setOtherReason(event.target.value); setError(""); }}
                  placeholder="Share any details that could help us improve."
                  maxLength={1000}
                  required
                />
                <span className="delete-character-count">{otherReason.length}/1000</span>
              </>
            )}

            <label className="delete-confirmation-check">
              <input type="checkbox" checked={acknowledged} onChange={(event) => { setAcknowledged(event.target.checked); setError(""); }} />
              <span>I understand that my account will be instantly and permanently deleted.</span>
            </label>

            {error && <p className="delete-form-error" role="alert">{error}</p>}

            <button type="submit" className="delete-submit-button" disabled={isSubmitting}>
              <Send size={16} /> {isSubmitting ? "Deleting account..." : "Permanently delete account"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}