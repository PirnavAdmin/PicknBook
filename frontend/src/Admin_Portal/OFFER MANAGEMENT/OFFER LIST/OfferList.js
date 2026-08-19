/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Filter, Pencil, Plus, RefreshCw, Trash2, X, Eye, Sliders } from "lucide-react";
import "./OfferList.css";
import {
  getAdminFeaturedOffers,
  getAdminFeaturedOfferById,
  updateAdminFeaturedOffer,
  deleteAdminFeaturedOffer,
  getOfferConditions,
  addOfferCondition,
  updateOfferCondition,
  deleteOfferCondition,
} from "../../../services/adminFeaturedOffersService";
import { toApiUrl } from "../../../services/apiClient";
import AdminPagination from "../../../components/AdminPagination";
import AdminDynamicModal from "../../../components/AdminDynamicModal";

const BOOKING_TYPE_OPTIONS = [
  { value: "Bus", label: "Bus" },
  { value: "Flight", label: "Flight" },
  { value: "Hotel", label: "Hotel" },
];

const DEFAULT_FILTERS = {
  query: "",
  bookingType: "all",
  status: "all",
};

const DEFAULT_EDIT_FORM = {
  title: "",
  offerCode: "",
  displayOrder: "0",
  bookingType: "Bus",
  isActive: true,
  startDateUtc: "",
  endDateUtc: "",
  imageUrl: "",
  shortDescription: "",
  longDescription: "",
  discountType: "Flat",
  isPercentageDiscount: false,
  discountValue: "",
  maxUsage: "",
  maxDiscountAmount: "",
  minBookingAmount: "0",
  couponUsedCount: 0,
};

const COL_WIDTHS = ["6%", "16%", "10%", "24%", "14%", "12%", "18%"];
const HEADERS = ["SN", "Offer Ends", "Image", "Name", "Booking Type", "Status", "Action"];

function getField(source, camelName, pascalName, fallback = "") {
  return source?.[camelName] ?? source?.[pascalName] ?? fallback;
}

function normalizeBookingType(value) {
  const norm = String(value || "").trim().toLowerCase();
  if (norm === "flight") return "Flight";
  if (norm === "hotel") return "Hotel";
  return "Bus";
}

function formatBookingType(value) {
  return BOOKING_TYPE_OPTIONS.find((option) => option.value.toLowerCase() === String(value || "").toLowerCase())?.label || "Bus";
}

function formatStatusLabel(isActive) {
  return isActive ? "Active" : "Inactive";
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return String(value).trim().toLowerCase() === "true";
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "");
}

function toDatetimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toUtcIso(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeOffer(raw) {
  return {
    id: getField(raw, "id", "Id"),
    title: getField(raw, "title", "Title"),
    offerCode: getField(raw, "offerCode", "OfferCode"),
    couponId: getField(raw, "couponId", "CouponId"),
    couponCode: getField(raw, "couponCode", "CouponCode"),
    promotionId: getField(raw, "promotionId", "PromotionId"),
    displayOrder: getField(raw, "displayOrder", "DisplayOrder", 0),
    bookingType: normalizeBookingType(getField(raw, "bookingType", "BookingType", "Bus")),
    isActive: toBoolean(getField(raw, "isActive", "IsActive", false), false),
    couponExpiresAtUtc: getField(raw, "couponExpiresAtUtc", "CouponExpiresAtUtc", null),
    startDateUtc: getField(raw, "startDateUtc", "StartDateUtc", null),
    endDateUtc: getField(raw, "endDateUtc", "EndDateUtc", null),
    imageUrl: getField(raw, "imageUrl", "ImageUrl"),
    shortDescription: getField(raw, "subtitle", "Subtitle"),
    longDescription: getField(raw, "description", "Description"),
    basePrice: getField(raw, "basePrice", "BasePrice"),
    discountType: getField(raw, "discountType", "DiscountType", "Flat"),
    isPercentageDiscount: getField(raw, "discountType", "DiscountType", "") === "Percentage" || toBoolean(getField(raw, "isPercentageDiscount", "IsPercentageDiscount", false), false),
    discountValue: getField(raw, "discountValue", "DiscountValue"),
    maxDiscountAmount: getField(raw, "maxDiscountAmount", "MaxDiscountAmount", null),
    minBookingAmount: getField(raw, "minBookingAmount", "MinBookingAmount", null),
    maxUsage: getField(raw, "maxUsage", "MaxUsage", null) ?? getField(raw, "maxCouponUsage", "MaxCouponUsage", null),
    couponUsedCount: getField(raw, "usedCount", "UsedCount", 0) ?? getField(raw, "couponUsedCount", "CouponUsedCount", 0),
    createdAtUtc: getField(raw, "createdAtUtc", "CreatedAtUtc", null),
    updatedAtUtc: getField(raw, "updatedAtUtc", "UpdatedAtUtc", null),
  };
}

function buildOfferFormData(formValues, fileInputObject) {
  const formData = new FormData();
  formData.append("Title", String(formValues.title || "").trim());
  formData.append("BookingType", normalizeBookingType(formValues.bookingType));
  formData.append("IsActive", Boolean(formValues.isActive));

  if (formValues.offerCode) {
    formData.append("OfferCode", String(formValues.offerCode).trim());
  } else {
    const generatedCode = `OFFER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    formData.append("OfferCode", generatedCode);
  }

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

  if (formValues.minBookingAmount !== undefined && formValues.minBookingAmount !== null && formValues.minBookingAmount !== "") {
    formData.append("MinBookingAmount", Number(formValues.minBookingAmount));
  }

  if (formValues.maxUsage !== undefined && formValues.maxUsage !== null && formValues.maxUsage !== "") {
    formData.append("MaxUsage", Number(formValues.maxUsage));
    formData.append("MaxCouponUsage", Number(formValues.maxUsage));
  }

  formData.append("UsedCount", Number(formValues.couponUsedCount) || 0);
  formData.append("CouponUsedCount", Number(formValues.couponUsedCount) || 0);

  if (fileInputObject) {
    formData.append("Image", fileInputObject);
  }

  return formData;
}

export default function AdminOfferListPage({ onAddOffer }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [imageOffer, setImageOffer] = useState(null);
  const [detailsOffer, setDetailsOffer] = useState(null);
  const [editOffer, setEditOffer] = useState(null);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editError, setEditError] = useState("");
  const [deleteOffer, setDeleteOffer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reusable popup modal state
  const [modalState, setModalState] = useState({ isOpen: false, mode: null, data: null });

  const offerSchema = useMemo(() => [
    { name: "title", label: "Offer Title", type: "text", required: true },
    { name: "offerCode", label: "Offer Code", type: "text", required: true },
    { name: "bookingType", label: "Booking Type", type: "select", options: BOOKING_TYPE_OPTIONS, required: true },
    { name: "isActive", label: "Is Active", type: "boolean" },
    { name: "displayOrder", label: "Display Order", type: "number" },
    { name: "startDateUtc", label: "Start Date", type: "datetime-local" },
    { name: "endDateUtc", label: "End Date", type: "datetime-local" },
    { name: "discountType", label: "Discount Type", type: "select", options: ["Flat", "Percentage"] },
    { name: "discountValue", label: "Discount Value", type: "number" },
    { name: "minBookingAmount", label: "Min Booking Amount (INR)", type: "number" },
    { name: "maxDiscountAmount", label: "Max Discount Amount (INR)", type: "number" },
    { name: "maxUsage", label: "Max Usage", type: "number" },
    { name: "imageUrl", label: "Image", type: "image" },
    { name: "shortDescription", label: "Short Description", type: "textarea" },
    { name: "longDescription", label: "Long Description", type: "textarea" },
  ], []);

  const handleSaveOffer = async (updatedData) => {
    try {
      const formValues = {
        title: updatedData.title,
        bookingType: updatedData.bookingType,
        isActive: updatedData.isActive,
        offerCode: updatedData.offerCode,
        displayOrder: updatedData.displayOrder,
        shortDescription: updatedData.shortDescription,
        longDescription: updatedData.longDescription,
        startDateUtc: updatedData.startDateUtc,
        endDateUtc: updatedData.endDateUtc,
        discountType: updatedData.discountType,
        discountValue: updatedData.discountValue,
        maxDiscountAmount: updatedData.maxDiscountAmount,
        minBookingAmount: updatedData.minBookingAmount,
        maxUsage: updatedData.maxUsage,
        couponUsedCount: modalState.data.couponUsedCount || 0,
      };

      const fileToUpload = updatedData.imageUrl instanceof File ? updatedData.imageUrl : null;
      const formData = buildOfferFormData(formValues, fileToUpload);
      await updateAdminFeaturedOffer(modalState.data.id, formData);
      setModalState({ isOpen: false, mode: null, data: null });
      await loadOffers();
    } catch (requestError) {
      console.error("Failed to update offer", requestError);
      setError(requestError.message || "Failed to update offer.");
    }
  };

  const handleDeleteOfferConfirm = async () => {
    try {
      await deleteAdminFeaturedOffer(modalState.data.id);
      setModalState({ isOpen: false, mode: null, data: null });
      await loadOffers();
    } catch (requestError) {
      console.error("Failed to delete offer", requestError);
      setError(requestError.message || "Failed to delete offer.");
    }
  };

  // Condition Management State
  const [conditionsOffer, setConditionsOffer] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [isLoadingConditions, setIsLoadingConditions] = useState(false);
  const [conditionsError, setConditionsError] = useState("");
  const [editCondition, setEditCondition] = useState(null);
  const [conditionForm, setConditionForm] = useState({
    conditionType: "BusType",
    value1: "",
    value2: "",
    isActive: true,
  });

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await getAdminFeaturedOffers();
      const rows = Array.isArray(payload) ? payload : payload?.items || payload?.Items || [];
      setOffers(rows.map(normalizeOffer));
    } catch (requestError) {
      setError(requestError.message || "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const filteredOffers = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return offers.filter((offer) => {
      const matchesQuery =
        !query ||
        String(offer.title || "").toLowerCase().includes(query) ||
        String(offer.bookingType || "").toLowerCase().includes(query);
      const matchesBookingType =
        filters.bookingType === "all" || offer.bookingType === filters.bookingType;
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "active" ? offer.isActive : !offer.isActive);

      return matchesQuery && matchesBookingType && matchesStatus;
    });
  }, [filters, offers]);

  const paginatedOffers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOffers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOffers, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredOffers.length]);

  const handleFilterChange = (field) => (event) => {
    setFilters((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setShowFilters(false);
  };

  const handleToggleStatus = async (offer) => {
    setBusyId(offer.id);
    setError("");

    try {
      // Step 1: Get full details by ID first
      const fullOffer = await getAdminFeaturedOfferById(offer.id);
      const normalized = normalizeOffer(fullOffer);

      // Step 2: Toggle state and save via PUT
      normalized.isActive = !offer.isActive;
      const formData = buildOfferFormData(normalized, null);

      await updateAdminFeaturedOffer(offer.id, formData);
      await loadOffers();
      setDetailsOffer((previous) =>
        previous?.id === offer.id ? { ...previous, isActive: !previous.isActive } : previous
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to update offer status.");
    } finally {
      setBusyId(null);
    }
  };

  const openEditModal = async (offer) => {
    setEditError("");
    setBusyId(offer.id);
    setSelectedFile(null);

    try {
      // Step 1: GET /api/AdminFeaturedOffers/{id} to get fresh details
      const fullOffer = await getAdminFeaturedOfferById(offer.id);
      const normalized = normalizeOffer(fullOffer);

      setEditOffer(normalized);
      setEditForm({
        title: normalized.title || "",
        offerCode: normalized.offerCode || "",
        displayOrder: normalized.displayOrder !== null && normalized.displayOrder !== undefined ? normalized.displayOrder : "0",
        bookingType: normalizeBookingType(normalized.bookingType),
        isActive: Boolean(normalized.isActive),
        startDateUtc: toDatetimeLocal(normalized.startDateUtc),
        endDateUtc: toDatetimeLocal(normalized.endDateUtc),
        imageUrl: normalized.imageUrl || "",
        shortDescription: normalized.shortDescription || "",
        longDescription: normalized.longDescription || "",
        discountType: normalized.discountType || (normalized.isPercentageDiscount ? "Percentage" : "Flat"),
        isPercentageDiscount: Boolean(normalized.isPercentageDiscount),
        discountValue: normalized.discountValue !== null && normalized.discountValue !== undefined ? normalized.discountValue : "",
        maxDiscountAmount: normalized.maxDiscountAmount !== null && normalized.maxDiscountAmount !== undefined ? normalized.maxDiscountAmount : "",
        minBookingAmount: normalized.minBookingAmount !== null && normalized.minBookingAmount !== undefined ? normalized.minBookingAmount : "",
        maxUsage: normalized.maxUsage !== null && normalized.maxUsage !== undefined ? normalized.maxUsage : "",
        couponUsedCount: normalized.couponUsedCount || 0,
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to load offer details for editing.");
    } finally {
      setBusyId(null);
    }
  };

  const loadConditions = useCallback(async (offerId) => {
    setIsLoadingConditions(true);
    setConditionsError("");
    try {
      const data = await getOfferConditions(offerId);
      setConditions(Array.isArray(data) ? data : []);
    } catch (err) {
      setConditionsError(err.message || "Failed to load conditions.");
    } finally {
      setIsLoadingConditions(false);
    }
  }, []);

  const handleConditionTypeChange = (type) => {
    let defaultVal = "";
    if (type === "BusType" || type === "SeatType") {
      defaultVal = "Sleeper";
    } else if (type === "OperatorName") {
      defaultVal = "APSRTC";
    } else if (type === "DayOfWeek") {
      defaultVal = "Monday";
    } else if (type === "TravelDate") {
      defaultVal = new Date().toISOString().split("T")[0];
    } else if (type === "SourceCity") {
      defaultVal = "Hyderabad";
    } else if (type === "DestinationCity") {
      defaultVal = "Bangalore";
    }

    setConditionForm((prev) => ({
      ...prev,
      conditionType: type,
      value1: defaultVal,
      value2: "",
    }));
  };

  const openConditionsModal = (offer) => {
    setConditionsOffer(offer);
    setConditions([]);
    setEditCondition(null);
    setConditionForm({
      conditionType: "SourceCity",
      value1: "Hyderabad",
      value2: "",
      isActive: true,
    });
    loadConditions(offer.id);
  };

  const handleConditionEditClick = (condition) => {
    setEditCondition(condition);
    setConditionForm({
      conditionType: condition.conditionType || "SourceCity",
      value1: condition.value1 || "",
      value2: condition.value2 || "",
      isActive: condition.isActive !== false,
    });
  };

  const handleCancelConditionEdit = () => {
    setEditCondition(null);
    setConditionForm({
      conditionType: "SourceCity",
      value1: "Hyderabad",
      value2: "",
      isActive: true,
    });
  };

  const handleSaveCondition = async (e) => {
    if (e) e.preventDefault();
    if (!conditionForm.value1.trim()) {
      setConditionsError("Condition value is required.");
      return;
    }
    setConditionsError("");
    try {
      if (editCondition) {
        await updateOfferCondition(conditionsOffer.id, editCondition.id, {
          conditionType: conditionForm.conditionType,
          value1: conditionForm.value1.trim(),
          value2: conditionForm.value2 ? conditionForm.value2.trim() : null,
          isActive: conditionForm.isActive,
        });
      } else {
        await addOfferCondition(conditionsOffer.id, {
          conditionType: conditionForm.conditionType,
          value1: conditionForm.value1.trim(),
          value2: conditionForm.value2 ? conditionForm.value2.trim() : null,
          isActive: conditionForm.isActive,
        });
      }
      handleCancelConditionEdit();
      await loadConditions(conditionsOffer.id);
    } catch (err) {
      setConditionsError(err.message || "Failed to save condition.");
    }
  };

  const handleDeleteCondition = async (conditionId) => {
    if (!window.confirm("Are you sure you want to delete this condition?")) {
      return;
    }
    setConditionsError("");
    try {
      await deleteOfferCondition(conditionsOffer.id, conditionId);
      await loadConditions(conditionsOffer.id);
    } catch (err) {
      setConditionsError(err.message || "Failed to delete condition.");
    }
  };

  const renderConditionValueInput = () => {
    const { conditionType, value1 } = conditionForm;

    if (conditionType === "BusType") {
      return (
        <select
          value={value1 || "Sleeper"}
          onChange={(e) => setConditionForm((prev) => ({ ...prev, value1: e.target.value }))}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #cbd5e1" }}
        >
          <option value="Sleeper">Sleeper</option>
          <option value="Seater">Seater</option>
          <option value="AC">AC</option>
          <option value="Non-AC">Non-AC</option>
          <option value="AC Sleeper">AC Sleeper</option>
          <option value="AC Seater">AC Seater</option>
        </select>
      );
    }

    if (conditionType === "SeatType") {
      return (
        <select
          value={value1 || "Sleeper"}
          onChange={(e) => setConditionForm((prev) => ({ ...prev, value1: e.target.value }))}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #cbd5e1" }}
        >
          <option value="Sleeper">Sleeper</option>
          <option value="Seater">Seater</option>
          <option value="Upper Berth">Upper Berth</option>
          <option value="Lower Berth">Lower Berth</option>
        </select>
      );
    }

    if (conditionType === "OperatorName") {
      return (
        <select
          value={value1 || "APSRTC"}
          onChange={(e) => setConditionForm((prev) => ({ ...prev, value1: e.target.value }))}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #cbd5e1" }}
        >
          <option value="SURESH TRAVELS">SURESH TRAVELS</option>
          <option value="APSRTC">APSRTC</option>
          <option value="TGSRTC">TGSRTC</option>
          <option value="KSRTC">KSRTC</option>
          <option value="Kerala RTC">Kerala RTC</option>
          <option value="GSRTC">GSRTC</option>
        </select>
      );
    }

    if (conditionType === "DayOfWeek") {
      return (
        <select
          value={value1 || "Monday"}
          onChange={(e) => setConditionForm((prev) => ({ ...prev, value1: e.target.value }))}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #cbd5e1" }}
        >
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
        </select>
      );
    }

    if (conditionType === "TravelDate") {
      return (
        <input
          type="date"
          value={value1 || ""}
          onChange={(e) => setConditionForm((prev) => ({ ...prev, value1: e.target.value }))}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #cbd5e1" }}
          required
        />
      );
    }

    return (
      <input
        type="text"
        placeholder={
          conditionType === "SourceCity"
            ? "e.g. Hyderabad"
            : conditionType === "DestinationCity"
              ? "e.g. Bangalore"
              : "Compare value"
        }
        value={value1 || ""}
        onChange={(e) => setConditionForm((prev) => ({ ...prev, value1: e.target.value }))}
        style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #cbd5e1" }}
        required
      />
    );
  };

  const handleEditSave = async () => {
    const title = String(editForm.title || "").trim();
    const bookingType = normalizeBookingType(editForm.bookingType);

    if (!title || !bookingType) {
      setEditError("Offer name and booking type are required.");
      return;
    }

    if (
      editForm.startDateUtc &&
      editForm.endDateUtc &&
      new Date(editForm.startDateUtc).getTime() > new Date(editForm.endDateUtc).getTime()
    ) {
      setEditError("Offer end date should be after start date.");
      return;
    }

    setBusyId(editOffer.id);
    setEditError("");
    setError("");

    try {
      // Step 2: PUT /api/AdminFeaturedOffers/{id}
      const formData = buildOfferFormData(editForm, selectedFile);
      await updateAdminFeaturedOffer(editOffer.id, formData);
      setEditOffer(null);
      await loadOffers();
    } catch (requestError) {
      setEditError(requestError.message || "Unable to save offer.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteOffer) {
      return;
    }

    setBusyId(deleteOffer.id);
    setError("");

    try {
      await deleteAdminFeaturedOffer(deleteOffer.id);
      setDeleteOffer(null);
      setImageOffer((previous) => (previous?.id === deleteOffer.id ? null : previous));
      setDetailsOffer((previous) => (previous?.id === deleteOffer.id ? null : previous));
      await loadOffers();
    } catch (requestError) {
      setError(requestError.message || "Unable to delete offer.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
        <section className="flight-markup-panel" style={{ padding: "16px 24px" }}>
          <header className="flight-markup-toolbar">
            <div className="flight-markup-title">
              <h1 className="offer-list-title-heading">OFFER List</h1>
            </div>

            <div className="admin-markup-coupon-actions">
              <button
                type="button"
                className={`admin-markup-coupon-btn filter ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters((previous) => !previous)}
              >
                <Filter size={16} />
                <span>Filter</span>
              </button>
              {onAddOffer && (
                <button type="button" className="admin-markup-coupon-btn generate" onClick={onAddOffer}>
                  <Plus size={16} />
                  <span>Add Offer</span>
                </button>
              )}
            </div>
          </header>

          {showFilters && (
            <section className="flight-destination-filter-panel">
              <div className="flight-destination-filter-grid">
                <label>
                  <span>Search</span>
                  <input
                    type="text"
                    value={filters.query}
                    onChange={handleFilterChange("query")}
                    placeholder="Search offers..."
                  />
                </label>
                <label>
                  <span>Booking Type</span>
                  <select value={filters.bookingType} onChange={handleFilterChange("bookingType")}>
                    <option value="all">All</option>
                    {BOOKING_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select value={filters.status} onChange={handleFilterChange("status")}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </section>
          )}

          {error && <p className="admin-markup-form-error">{error}</p>}

          <section className="admin-markup-table-wrap">
            <table className="admin-markup-table">
              <colgroup>
                {COL_WIDTHS.map((width, index) => (
                  <col key={`${width}-${index}`} style={{ width }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {HEADERS.map((header) => (
                    <th key={header} className={header === "Action" ? "action-col" : undefined}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={HEADERS.length}>
                      <p className="admin-markup-empty">Loading offers...</p>
                    </td>
                  </tr>
                ) : filteredOffers.length === 0 ? (
                  <tr>
                    <td colSpan={HEADERS.length}>
                      <p className="admin-markup-empty">No offer records found.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedOffers.map((offer, index) => (
                    <tr key={offer.id}>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td style={{ verticalAlign: "middle" }}>{formatDateTime(offer.endDateUtc)}</td>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                        {offer.imageUrl ? (
                          <div className="offer-list-thumbnail-box">
                            <img
                              src={toApiUrl(offer.imageUrl)}
                              alt={offer.title}
                              className="offer-list-thumbnail"
                              onClick={() => setModalState({ isOpen: true, mode: "view", data: offer })}
                            />
                          </div>
                        ) : (
                          <div className="offer-list-thumbnail-box" style={{ borderStyle: 'dashed', opacity: 0.6, background: '#f8fafc', cursor: 'default' }}>
                            <span className="offer-list-no-image" style={{ fontStyle: 'normal', fontWeight: 600, fontSize: '0.72rem', color: '#94a3b8' }}>No Image</span>
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, verticalAlign: "middle" }}>{offer.title}</td>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>{formatBookingType(offer.bookingType)}</td>
                      <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                        <button
                          type="button"
                          className={`status-active-badge ${
                            offer.isActive ? "active" : "inactive"
                          }`}
                          onClick={() => handleToggleStatus(offer)}
                          aria-label={`Set offer ${offer.id} status to ${offer.isActive ? "inactive" : "active"
                            }`}
                          style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          {offer.isActive ? <Check size={14} /> : <X size={14} />}
                          <span>{formatStatusLabel(offer.isActive)}</span>
                        </button>
                      </td>
                      <td className="action-col" style={{ verticalAlign: "middle" }}>
                        <div className="admin-actions-cell-row">
                          <button
                            type="button"
                            className="admin-action-btn view"
                            title="View Details"
                            aria-label={`Open details for ${offer.title}`}
                            onClick={() => setModalState({ isOpen: true, mode: "view", data: offer })}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn conditions"
                            title="Manage Conditions"
                            aria-label={`Manage conditions for ${offer.title}`}
                            onClick={() => openConditionsModal(offer)}
                          >
                            <Sliders size={18} />
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn edit"
                            title="Edit"
                            aria-label={`Edit ${offer.title}`}
                            onClick={() => setModalState({ isOpen: true, mode: "edit", data: offer })}
                            disabled={busyId === offer.id}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            className="admin-action-btn delete"
                            title="Delete"
                            aria-label={`Delete ${offer.title}`}
                            onClick={() => setModalState({ isOpen: true, mode: "delete", data: offer })}
                            disabled={busyId === offer.id}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div style={{ marginTop: "16px", padding: "0 24px 24px" }}>
              <AdminPagination
                currentPage={currentPage}
                totalItems={filteredOffers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemName="offers"
              />
            </div>
          </section>
        </section>

      {/* Reusable Dynamic Modal System */}
      <AdminDynamicModal
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          moduleName="Offer"
          data={modalState.data}
          schema={offerSchema}
          onClose={() => setModalState({ isOpen: false, mode: null, data: null })}
          onSave={handleSaveOffer}
          onDelete={handleDeleteOfferConfirm}
      />

      {conditionsOffer && (
        <div className="admin-markup-modal-backdrop" onClick={() => setConditionsOffer(null)}>
          <section
            className="admin-markup-modal conditions-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Manage conditions"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "960px", width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
          >
            <header>
              <h2>Manage Offer Conditions</h2>
              <button type="button" onClick={() => setConditionsOffer(null)} aria-label="Close conditions modal">
                <X size={16} />
              </button>
            </header>

            <div className="conditions-offer-info" style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1e293b", fontWeight: "700" }}>{conditionsOffer.title}</h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                Define constraints under which this offer will be valid.
              </p>
            </div>

            <div className="conditions-modal-body" style={{ display: "flex", gap: "24px", padding: "20px", flexWrap: "wrap", overflowY: "auto", flex: 1 }}>
              {/* Left Column: Form to Add/Edit Condition */}
              <section className="condition-form-panel" style={{ flex: "1 1 380px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#334155" }}>
                    {editCondition ? "Edit Condition" : "Add New Condition"}
                  </h4>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                    Define the condition parameters below.
                  </p>
                </div>

                <form onSubmit={handleSaveCondition} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <label className="field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Condition Type</span>
                    <select
                      value={conditionForm.conditionType}
                      onChange={(e) => handleConditionTypeChange(e.target.value)}
                      style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                    >
                      <option value="SourceCity">Source City</option>
                      <option value="DestinationCity">Destination City</option>
                      <option value="BusType">Bus Type</option>
                      <option value="SeatType">Seat Type</option>
                      <option value="OperatorName">Operator Name</option>
                      <option value="DayOfWeek">Day of Week</option>
                      <option value="TravelDate">Travel Date</option>
                    </select>
                  </label>

                  <label className="field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</span>
                    <select
                      value={conditionForm.isActive ? "active" : "inactive"}
                      onChange={(e) => setConditionForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}
                      style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>

                  <label className="field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Constraint Value (Value 1) *</span>
                    {renderConditionValueInput()}
                  </label>

                  <label className="field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Secondary Constraint Value (Value 2 - Optional)</span>
                    <input
                      type="text"
                      placeholder="e.g. End date or secondary value"
                      value={conditionForm.value2 || ""}
                      onChange={(e) => setConditionForm((prev) => ({ ...prev, value2: e.target.value }))}
                      style={{ padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                    />
                  </label>

                  {conditionsError && (
                    <p style={{ color: "#dc2626", fontSize: "13px", margin: "4px 0 0 0", fontWeight: "500" }}>{conditionsError}</p>
                  )}

                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                    {editCondition && (
                      <button
                        type="button"
                        onClick={handleCancelConditionEdit}
                        style={{
                          padding: "10px 16px", borderRadius: "10px", border: "1px solid #cbd5e1",
                          background: "#fff", color: "#475569", cursor: "pointer", fontWeight: "600", fontSize: "13px"
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      style={{
                        padding: "10px 16px", borderRadius: "10px", border: "none",
                        background: "var(--admin-primary, #a73434)", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px"
                      }}
                    >
                      {editCondition ? "Update Condition" : "Add Condition"}
                    </button>
                  </div>
                </form>
              </section>

              {/* Right Column: List of Active Conditions */}
              <section className="condition-list-panel" style={{ flex: "1.2 1 450px", display: "flex", flexDirection: "column", gap: "16px", minWidth: "0" }}>
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#334155" }}>
                    Active Condition Rules
                  </h4>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                    Rules currently applied to this featured offer.
                  </p>
                </div>

                {isLoadingConditions ? (
                  <p style={{ textAlign: "center", padding: "40px", color: "#64748b", fontSize: "14px" }}>Loading conditions...</p>
                ) : conditions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafc", borderRadius: "12px", border: "2px dashed #e2e8f0" }}>
                    <p style={{ margin: "0 0 6px 0", color: "#475569", fontWeight: "600", fontSize: "14px" }}>No conditions set yet.</p>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                      This offer will apply globally to all bookings of the corresponding Booking Type.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingRight: "4px" }}>
                    {conditions.map((cond) => (
                      <div
                        key={cond.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 16px",
                          backgroundColor: "#f8fafc",
                          borderRadius: "12px",
                          border: editCondition?.id === cond.id ? "2px solid var(--admin-primary, #a73434)" : "1px solid #e2e8f0",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.01)"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                            Condition: <strong style={{ color: "var(--admin-primary, #a73434)" }}>{cond.conditionType}</strong>
                            <span style={{
                              padding: "2px 6px", borderRadius: "12px", fontSize: "10px", fontWeight: "700",
                              background: cond.isActive ? "#dcfce7" : "#fee2e2",
                              color: cond.isActive ? "#15803d" : "#b91c1c"
                            }}>
                              {cond.isActive ? "Active" : "Inactive"}
                            </span>
                          </span>
                          <span style={{ fontSize: "13px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Value: <strong style={{ color: "#0f172a" }}>{cond.value1}</strong>
                            {cond.value2 && (
                              <>
                                {" | "}Secondary: <strong style={{ color: "#0f172a" }}>{cond.value2}</strong>
                              </>
                            )}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "6px", marginLeft: "12px" }}>
                          <button
                            type="button"
                            onClick={() => handleConditionEditClick(cond)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #cbd5e1",
                              background: "#fff", color: "#475569", cursor: "pointer"
                            }}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCondition(cond.id)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: "32px", height: "32px", borderRadius: "8px", border: "1px solid rgba(220,38,38,0.2)",
                              background: "rgba(220,38,38,0.05)", color: "#dc2626", cursor: "pointer"
                            }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="admin-markup-modal-actions" style={{ borderTop: "1px solid #e2e8f0", padding: "15px 20px" }}>
              <button type="button" className="secondary" onClick={() => setConditionsOffer(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
