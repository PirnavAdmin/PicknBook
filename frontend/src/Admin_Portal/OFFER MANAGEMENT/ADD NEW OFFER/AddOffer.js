/* eslint-disable */
import React, { useState, useRef, useEffect } from "react";
import { 
  List, Info, Calendar, Tag, UploadCloud, ChevronDown, Check, 
  Globe, FileText, Bus, Plane, Hotel, AlertCircle 
} from "lucide-react";
import "./AddOffer.css";
import { createAdminFeaturedOffer } from "../../../services/adminFeaturedOffersService";

const BOOKING_TYPE_OPTIONS = [
  { value: "Bus", label: "Bus", icon: Bus },
  { value: "Flight", label: "Flight", icon: Plane },
  { value: "Hotel", label: "Hotel", icon: Hotel },
  { value: "All", label: "All", icon: Globe },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active", dotClass: "active" },
  { value: "inactive", label: "Inactive", dotClass: "inactive" },
  { value: "scheduled", label: "Scheduled", dotClass: "scheduled" },
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "Flat", label: "Flat Discount" },
  { value: "Percentage", label: "Percentage Discount" },
];

const DEFAULT_FORM = {
  title: "",
  bookingType: "Bus",
  isActive: true,
  status: "active",
  startDateUtc: "",
  endDateUtc: "",
  noEndDate: false,
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
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildOfferFormData(formValues, fileInputObject) {
  const formData = new FormData();
  formData.append("Title", String(formValues.title || "").trim());
  formData.append("BookingType", formValues.bookingType);
  formData.append("IsActive", formValues.status === "active");
  
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
  if (!formValues.noEndDate && formValues.endDateUtc) {
    formData.append("EndDateUtc", toUtcIso(formValues.endDateUtc));
  }
  
  const finalDiscountType = formValues.discountType;
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
  const [filePreview, setFilePreview] = useState(null);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown States
  const [bookingTypeOpen, setBookingTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [discountTypeOpen, setDiscountTypeOpen] = useState(false);

  const bookingRef = useRef(null);
  const statusRef = useRef(null);
  const discountRef = useRef(null);

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (bookingRef.current && !bookingRef.current.contains(event.target)) {
        setBookingTypeOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
      if (discountRef.current && !discountRef.current.contains(event.target)) {
        setDiscountTypeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFieldChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (file) => {
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleReset = () => {
    setFormValues(DEFAULT_FORM);
    setSelectedFile(null);
    setFilePreview(null);
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
      !formValues.noEndDate &&
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
      handleReset();
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

  // Get currently selected booking option details
  const currentBookingOpt = BOOKING_TYPE_OPTIONS.find(o => o.value === formValues.bookingType) || BOOKING_TYPE_OPTIONS[0];
  const BookingIcon = currentBookingOpt.icon;

  // Get currently selected status details
  const currentStatusOpt = STATUS_OPTIONS.find(o => o.value === formValues.status) || STATUS_OPTIONS[0];

  // Get currently selected discount details
  const currentDiscountOpt = DISCOUNT_TYPE_OPTIONS.find(o => o.value === formValues.discountType) || DISCOUNT_TYPE_OPTIONS[0];

  return (
    <section className="offer-add-page">
      {/* Top Header */}
      <div className="offer-add-header-wrapper">
        <div className="offer-add-title-box">
          <h1>Add New Offer / Discount</h1>
          <p>Create a new discount offer for your customers</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="offer-new-badge"># NEW</span>
          {onBack && (
            <button
              type="button"
              className="offer-btn-cancel"
              style={{ height: '36px', padding: '0 16px' }}
              onClick={onBack}
            >
              <List size={16} /> Back to Offers
            </button>
          )}
        </div>
      </div>

      <form className="offer-form-layout" onSubmit={handleSubmit}>
        
        {/* 1. Basic Information */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">1</span>
            <h2>Basic Information</h2>
          </div>
          <div className="form-grid-4">
            <div className="form-field-wrapper">
              <label htmlFor="offer-title">Offer Name (Title) <span>*</span></label>
              <input
                id="offer-title"
                type="text"
                placeholder="Enter offer name"
                value={formValues.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                required
              />
            </div>

            <div className="form-field-wrapper" ref={bookingRef}>
              <label>Booking Type <span>*</span></label>
              <div 
                className={`custom-select-trigger ${bookingTypeOpen ? "active" : ""}`}
                onClick={() => setBookingTypeOpen(!bookingTypeOpen)}
              >
                <div className="trigger-value-box">
                  <BookingIcon size={16} />
                  <span>{currentBookingOpt.label}</span>
                </div>
                <ChevronDown size={16} />
              </div>
              {bookingTypeOpen && (
                <div className="custom-select-options">
                  {BOOKING_TYPE_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon;
                    const isSelected = opt.value === formValues.bookingType;
                    return (
                      <div
                        key={opt.value}
                        className={`custom-select-option ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          handleFieldChange("bookingType", opt.value);
                          setBookingTypeOpen(false);
                        }}
                      >
                        <div className="option-value-box">
                          <OptIcon size={15} />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check size={14} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-field-wrapper" ref={statusRef}>
              <label>Status <span>*</span></label>
              <div 
                className={`custom-select-trigger ${statusOpen ? "active" : ""}`}
                onClick={() => setStatusOpen(!statusOpen)}
              >
                <div className="trigger-value-box">
                  <span className={`status-dot ${currentStatusOpt.dotClass}`} />
                  <span>{currentStatusOpt.label}</span>
                </div>
                <ChevronDown size={16} />
              </div>
              {statusOpen && (
                <div className="custom-select-options">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = opt.value === formValues.status;
                    return (
                      <div
                        key={opt.value}
                        className={`custom-select-option ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          handleFieldChange("status", opt.value);
                          setStatusOpen(false);
                        }}
                      >
                        <div className="option-value-box">
                          <span className={`status-dot ${opt.dotClass}`} />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check size={14} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="display-order">Display Order <span>*</span></label>
              <input
                id="display-order"
                type="number"
                min="0"
                placeholder="Enter display order"
                value={formValues.displayOrder}
                onChange={(e) => handleFieldChange("displayOrder", e.target.value)}
                required
              />
              <span className="form-field-subtext">Display sequence on the list (0, 1, 2...)</span>
            </div>
          </div>
        </div>

        {/* 2. Offer Duration */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">2</span>
            <h2>Offer Duration</h2>
          </div>
          <div className="form-grid-2">
            <div className="form-field-wrapper">
              <label htmlFor="offer-starts">Offer Starts <span>*</span></label>
              <input
                id="offer-starts"
                type="datetime-local"
                value={formValues.startDateUtc}
                onChange={(e) => handleFieldChange("startDateUtc", e.target.value)}
                required
              />
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="offer-ends">Offer Ends {!formValues.noEndDate && <span>*</span>}</label>
              <input
                id="offer-ends"
                type="datetime-local"
                value={formValues.endDateUtc}
                onChange={(e) => handleFieldChange("endDateUtc", e.target.value)}
                disabled={formValues.noEndDate}
                required={!formValues.noEndDate}
              />
            </div>
          </div>

          <div className="toggle-field-wrapper">
            <div className="toggle-info">
              <span className="toggle-title">No End Date</span>
              <span className="toggle-desc">Enable if this offer has no expiry date</span>
            </div>
            <div 
              className={`toggle-switch-input ${formValues.noEndDate ? "checked" : ""}`}
              onClick={() => handleFieldChange("noEndDate", !formValues.noEndDate)}
            >
              <span className="toggle-switch-handle" />
            </div>
          </div>
        </div>

        {/* 3. Discount Details */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">3</span>
            <h2>Discount Details</h2>
          </div>
          <div className="form-grid-2">
            <div className="form-field-wrapper" ref={discountRef}>
              <label>Discount Type <span>*</span></label>
              <div 
                className={`custom-select-trigger ${discountTypeOpen ? "active" : ""}`}
                onClick={() => setDiscountTypeOpen(!discountTypeOpen)}
              >
                <div className="trigger-value-box">
                  <span>{currentDiscountOpt.label}</span>
                </div>
                <ChevronDown size={16} />
              </div>
              {discountTypeOpen && (
                <div className="custom-select-options">
                  {DISCOUNT_TYPE_OPTIONS.map((opt) => {
                    const isSelected = opt.value === formValues.discountType;
                    return (
                      <div
                        key={opt.value}
                        className={`custom-select-option ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          handleFieldChange("discountType", opt.value);
                          setDiscountTypeOpen(false);
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check size={14} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="discount-val">Discount Value <span>*</span></label>
              <input
                id="discount-val"
                type="number"
                placeholder="e.g. 50 or 10"
                value={formValues.discountValue}
                onChange={(e) => handleFieldChange("discountValue", e.target.value)}
                required
              />
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="min-booking-amount">Minimum Booking Amount (INR) <span>*</span></label>
              <input
                id="min-booking-amount"
                type="number"
                placeholder="e.g. 500"
                value={formValues.minBookingAmount}
                onChange={(e) => handleFieldChange("minBookingAmount", e.target.value)}
                required
              />
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="max-discount-amount">Maximum Discount Amount (INR)</label>
              <input
                id="max-discount-amount"
                type="number"
                placeholder="e.g. 100"
                value={formValues.maxDiscountAmount}
                onChange={(e) => handleFieldChange("maxDiscountAmount", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 4. Usage Limits */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">4</span>
            <h2>Usage Limits</h2>
          </div>
          <div className="form-grid-3">
            <div className="form-field-wrapper">
              <label htmlFor="max-usage">Maximum Usage <span>*</span></label>
              <input
                id="max-usage"
                type="number"
                placeholder="1000"
                value={formValues.maxUsage}
                onChange={(e) => handleFieldChange("maxUsage", e.target.value)}
                required
              />
              <span className="form-field-subtext">Total times this offer can be used</span>
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="usage-per-customer">Usage Per Customer</label>
              <input
                id="usage-per-customer"
                type="number"
                placeholder="2"
                value="2"
                readOnly
              />
              <span className="form-field-subtext">Times a single customer can use</span>
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="used-count">Used Count (Auto)</label>
              <input
                id="used-count"
                type="number"
                placeholder="0"
                value="0"
                readOnly
              />
              <span className="form-field-subtext">Automatically updated</span>
            </div>
          </div>
        </div>

        {/* 5. Applicable Details */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">5</span>
            <h2>Applicable Details</h2>
          </div>
          <div className="form-grid-2">
            <div className="form-field-wrapper">
              <label>Applicable On <span>*</span></label>
              <div className="custom-select-trigger">
                <span>All Routes</span>
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="form-field-wrapper">
              <label>Applicable Days <span>*</span></label>
              <div className="custom-select-trigger">
                <span>All Days</span>
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="min-seats">Minimum Seats</label>
              <input
                id="min-seats"
                type="number"
                placeholder="1"
                value="1"
                readOnly
              />
            </div>

            <div className="form-field-wrapper">
              <label htmlFor="max-seats">Maximum Seats</label>
              <input
                id="max-seats"
                type="number"
                placeholder="50"
                value="50"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* 6. Offer Image */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">6</span>
            <h2>Offer Image</h2>
          </div>
          <div className="offer-image-section-body">
            {filePreview && (
              <div className="current-image-preview-card">
                <img src={filePreview} alt="Offer Preview" />
                <button 
                  type="button" 
                  className="remove-image-badge"
                  onClick={handleRemoveFile}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div 
              className="drag-drop-upload-zone"
              onClick={() => document.getElementById("hidden-file-input").click()}
            >
              <div className="upload-icon-box">
                <UploadCloud size={28} />
              </div>
              <span className="upload-prompt-text">Click to upload or drag and drop</span>
              <span className="upload-hint-text">PNG, JPG, WEBP up to 2MB</span>
              
              <input
                id="hidden-file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* 7. Description / Terms & Conditions */}
        <div className="form-section-card">
          <div className="section-card-header">
            <span className="section-number-badge">7</span>
            <h2>Description / Terms & Conditions</h2>
          </div>
          <div className="form-field-wrapper">
            <label htmlFor="long-desc">Description</label>
            <div className="textarea-count-wrapper">
              <textarea
                id="long-desc"
                placeholder="Enter offer description, terms and conditions..."
                rows={5}
                maxLength={1000}
                value={formValues.longDescription}
                onChange={(e) => handleFieldChange("longDescription", e.target.value)}
              />
              <span className="textarea-char-counter">
                {formValues.longDescription ? formValues.longDescription.length : 0} / 1000
              </span>
            </div>
          </div>
        </div>

        {/* Error / Success logs */}
        {formError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 600, fontSize: '0.9rem', padding: '0 8px' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}
        {saved && (
          <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem', padding: '0 8px' }}>
            Offer saved successfully to backend.
          </div>
        )}

        {/* Form Actions Footer */}
        <div className="offer-form-actions-bar">
          <button 
            type="button" 
            className="offer-btn-cancel"
            onClick={onBack || handleReset}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="offer-btn-save"
            disabled={submitting}
          >
            {submitting ? "Saving Offer..." : "Save Offer"}
          </button>
        </div>

      </form>
    </section>
  );
}
