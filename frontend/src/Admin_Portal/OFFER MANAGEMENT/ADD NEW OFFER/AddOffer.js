import React, { useState } from "react";
import { List } from "lucide-react";
import "./AddOffer.css";
import { createAdminFeaturedOffer } from "../../../services/adminFeaturedOffersService";

const BOOKING_TYPE_OPTIONS = [
  { value: "Bus", label: "Bus" },
  { value: "Flight", label: "Flight" },
  { value: "Hotel", label: "Hotel" },
];

const DEFAULT_FORM = {
  title: "",
  bookingType: "Bus",
  isActive: true,
  startDateUtc: "",
  endDateUtc: "",
  shortDescription: "",
  longDescription: "",
  displayOrder: "0",
  discountType: "Flat",
  isPercentageDiscount: false,
  discountValue: "",
  maxUsage: "",
  maxDiscountAmount: "",
  minBookingAmount: "0",
};

function toUtcIso(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildOfferFormData(formValues, fileInputObject) {
  const formData = new FormData();
  formData.append("Title", String(formValues.title || "").trim());
  formData.append("BookingType", formValues.bookingType);
  formData.append("IsActive", Boolean(formValues.isActive));
  
  // Generate unique code to satisfy the DB constraint (IX_FeaturedOffers_OfferCode)
  const generatedCode = `OFFER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  formData.append("OfferCode", generatedCode);
  
  if (formValues.displayOrder !== undefined && formValues.displayOrder !== null && formValues.displayOrder !== "") {
    formData.append("DisplayOrder", Number(formValues.displayOrder));
  }
  if (formValues.shortDescription !== undefined && formValues.shortDescription !== null) {
    formData.append("Subtitle", String(formValues.shortDescription).trim());
  }
  if (formValues.longDescription !== undefined && formValues.longDescription !== null) {
    formData.append("Description", String(formValues.longDescription).trim());
  }
  
  if (formValues.startDateUtc) {
    formData.append("StartDateUtc", toUtcIso(formValues.startDateUtc));
  }
  if (formValues.endDateUtc) {
    formData.append("EndDateUtc", toUtcIso(formValues.endDateUtc));
  }
  
  const finalDiscountType = formValues.discountType || (formValues.isPercentageDiscount ? "Percentage" : "Flat");
  formData.append("DiscountType", finalDiscountType);
  formData.append("IsPercentageDiscount", finalDiscountType === "Percentage");
  
  if (formValues.discountValue !== undefined && formValues.discountValue !== null && formValues.discountValue !== "") {
    formData.append("DiscountValue", Number(formValues.discountValue));
  }
  
  if (formValues.maxDiscountAmount !== undefined && formValues.maxDiscountAmount !== null && formValues.maxDiscountAmount !== "") {
    formData.append("MaxDiscountAmount", Number(formValues.maxDiscountAmount));
  }
  
  if (formValues.maxUsage !== undefined && formValues.maxUsage !== null && formValues.maxUsage !== "") {
    formData.append("MaxUsage", Number(formValues.maxUsage));
    formData.append("MaxCouponUsage", Number(formValues.maxUsage));
  }
  
  if (formValues.minBookingAmount !== undefined && formValues.minBookingAmount !== null && formValues.minBookingAmount !== "") {
    formData.append("MinBookingAmount", Number(formValues.minBookingAmount));
  }
  
  formData.append("UsedCount", 0);
  formData.append("CouponUsedCount", 0);
  
  if (fileInputObject) {
    formData.append("Image", fileInputObject);
  }
  
  return formData;
}

export default function AdminAddOfferPage({ onBack }) {
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    const value = field === "isActive" ? event.target.value === "active" : event.target.value;
    setFormValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleReset = () => {
    setFormValues(DEFAULT_FORM);
    setSelectedFile(null);
    setFormError("");
    setSaved(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    setFormError("");

    const title = String(formValues.title || "").trim();
    if (!title) {
      setFormError("Offer name is required.");
      return;
    }

    if (
      formValues.startDateUtc &&
      formValues.endDateUtc &&
      new Date(formValues.startDateUtc).getTime() > new Date(formValues.endDateUtc).getTime()
    ) {
      setFormError("Offer end date should be after start date.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = buildOfferFormData(formValues, selectedFile);
      await createAdminFeaturedOffer(formData);
      setFormValues(DEFAULT_FORM);
      setSelectedFile(null);
      setSaved(true);
      if (onBack) {
        onBack();
      }
    } catch (requestError) {
      setFormError(requestError.message || "Unable to create offer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flight-markup-panel offer-add-page">
      <section className="menu-form-shell offer-add-shell">
        {/* ── Header inside container ── */}
        <div className="offer-add-header">
          <h1 className="offer-add-heading">Add Offer</h1>
          {onBack && (
            <button
              type="button"
              className="offer-add-list-btn"
              onClick={onBack}
            >
              <List size={16} />
              Offer List
            </button>
          )}
        </div>

        <form className="offer-add-form" onSubmit={handleSubmit}>
          <div className="offer-add-grid">
            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="offer-name">
                Offer Name (Title) <span aria-hidden="true">*</span>
              </label>
              <div className="offer-add-control">
                <input
                  id="offer-name"
                  type="text"
                  placeholder="Enter offer name"
                  value={formValues.title}
                  onChange={handleChange("title")}
                  required
                />
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="booking-type">
                Booking Type <span aria-hidden="true">*</span>
              </label>
              <div className="offer-add-control">
                <select
                  id="booking-type"
                  value={formValues.bookingType}
                  onChange={handleChange("bookingType")}
                  required
                >
                  {BOOKING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="offer-status">
                Status
              </label>
              <div className="offer-add-control">
                <select
                  id="offer-status"
                  value={formValues.isActive ? "active" : "inactive"}
                  onChange={handleChange("isActive")}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="display-order">
                Display Order
              </label>
              <div className="offer-add-control">
                <input
                  id="display-order"
                  type="number"
                  min="0"
                  placeholder="e.g. 1"
                  value={formValues.displayOrder}
                  onChange={handleChange("displayOrder")}
                />
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="offer-start">
                Offer Starts
              </label>
              <div className="offer-add-control">
                <input
                  id="offer-start"
                  type="datetime-local"
                  value={formValues.startDateUtc}
                  onChange={handleChange("startDateUtc")}
                />
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="offer-end">
                Offer Ends
              </label>
              <div className="offer-add-control">
                <input
                  id="offer-end"
                  type="datetime-local"
                  value={formValues.endDateUtc}
                  onChange={handleChange("endDateUtc")}
                />
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="discount-type">
                Discount Type
              </label>
              <div className="offer-add-control">
                <select
                  id="discount-type"
                  value={formValues.discountType}
                  onChange={(event) => {
                    const val = event.target.value;
                    setFormValues((previous) => ({
                      ...previous,
                      discountType: val,
                      isPercentageDiscount: val === "Percentage",
                    }));
                  }}
                >
                  <option value="Flat">Flat Discount</option>
                  <option value="Percentage">Percentage Discount</option>
                </select>
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="discount-value">
                Discount Value
              </label>
              <div className="offer-add-control">
                <input
                  id="discount-value"
                  type="number"
                  placeholder="e.g. 50 or 500"
                  value={formValues.discountValue}
                  onChange={handleChange("discountValue")}
                />
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="min-booking-amount">
                Min Booking Amount (INR)
              </label>
              <div className="offer-add-control">
                <input
                  id="min-booking-amount"
                  type="number"
                  placeholder="e.g. 500"
                  value={formValues.minBookingAmount}
                  onChange={handleChange("minBookingAmount")}
                />
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="max-discount-amount">
                Max Discount Amount (INR)
              </label>
              <div className="offer-add-control">
                <input
                  id="max-discount-amount"
                  type="number"
                  placeholder="e.g. 150"
                  value={formValues.maxDiscountAmount}
                  onChange={handleChange("maxDiscountAmount")}
                />
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="max-coupon-usage">
                Max Usage
              </label>
              <div className="offer-add-control">
                <input
                  id="max-coupon-usage"
                  type="number"
                  placeholder="e.g. 500"
                  value={formValues.maxUsage}
                  onChange={handleChange("maxUsage")}
                />
              </div>
            </div>

            <div className="offer-add-field">
              <label className="offer-add-label" htmlFor="offer-image-file">
                Image Upload
              </label>
              <div className="offer-add-control">
                <input
                  id="offer-image-file"
                  type="file"
                  accept="image/*"
                  key={selectedFile ? selectedFile.name : "empty"}
                  onChange={(event) => {
                    if (event.target.files && event.target.files[0]) {
                      setSelectedFile(event.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="offer-add-section-bar">
            <span>Short Description (Subtitle)</span>
          </div>
          <textarea
            className="offer-add-short-textarea"
            placeholder="Write the short description..."
            value={formValues.shortDescription}
            onChange={handleChange("shortDescription")}
          />

          <div className="offer-add-section-bar">
            <span>Long Description (Description)</span>
          </div>
          <textarea
            className="offer-add-short-textarea"
            placeholder="Write the long description / terms and conditions..."
            value={formValues.longDescription}
            onChange={handleChange("longDescription")}
            style={{ minHeight: "120px" }}
          />

          {formError && <p className="admin-markup-form-error">{formError}</p>}
          {saved && <p className="menu-form-success">Offer saved to backend.</p>}

          <div className="admin-markup-modal-actions menu-form-actions offer-add-actions">
            <button type="button" className="secondary" onClick={handleReset}>
              Reset
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
