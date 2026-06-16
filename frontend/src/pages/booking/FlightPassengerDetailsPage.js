import React, { useMemo, useState, useEffect } from "react";
import { Info, Ticket, Tag, Mail, Phone, Check, X, Shield, ArrowRight, ShieldCheck, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../STYLES/FlightBookingFlow.css";
import {
  readFlightBookingFlowState,
  writeFlightBookingFlowState,
} from "./flightBookingFlowStore";
import { openAuthModal } from "../../utils/authModalEvents";
import { isTokenExpired } from "../../services/authSession";
import { getFlightPricingPreview, getFlightPromotions } from "../../services/flightBookingService";
import { toApiUrl } from "../../services/apiClient";
import { listTravelers, normalizeTraveler } from "../../services/travelerService";

const TRAVELER_STORAGE_KEY = "my_traveler_data";

function readLocalTravelers() {
  try {
    const raw = localStorage.getItem(TRAVELER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((t) => normalizeTraveler(t));
  } catch {
    return [];
  }
}

function formatCurrency(amount) {
  return `₹ ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount) || 0))}`;
}

function parseTravellerSummary(summary) {
  const text = String(summary || "");
  const adults = Number((text.match(/(\d+)\s*Adult/i) || [])[1] || 1);
  const children = Number((text.match(/(\d+)\s*Child/i) || [])[1] || 0);
  const infants = Number((text.match(/(\d+)\s*Infant/i) || [])[1] || 0);

  return {
    adults,
    children,
    infants,
  };
}

function buildPassengerSeed(selectedSeats, travellerCounts, existingPassengers) {
  if (Array.isArray(existingPassengers) && existingPassengers.length > 0) {
    return existingPassengers;
  }

  const seatLabels = Array.isArray(selectedSeats)
    ? selectedSeats.map((seat) => seat?.label || "")
    : [];

  const passengers = [];
  let seatIndex = 0;

  for (let index = 0; index < travellerCounts.adults; index += 1) {
    passengers.push({
      id: `adult-${index + 1}`,
      passengerType: "Adult",
      title: "Mr",
      firstName: "",
      lastName: "",
      gender: "Male",
      dob: "",
      seatLabel: seatLabels[seatIndex] || "",
      frequentFlyer: "",
    });
    seatIndex += 1;
  }

  for (let index = 0; index < travellerCounts.children; index += 1) {
    passengers.push({
      id: `child-${index + 1}`,
      passengerType: "Child",
      title: "Ms",
      firstName: "",
      lastName: "",
      gender: "Female",
      dob: "",
      seatLabel: seatLabels[seatIndex] || "",
      frequentFlyer: "",
    });
    seatIndex += 1;
  }

  for (let index = 0; index < travellerCounts.infants; index += 1) {
    passengers.push({
      id: `infant-${index + 1}`,
      passengerType: "Infant",
      title: "Ms",
      firstName: "",
      lastName: "",
      gender: "Female",
      dob: "",
      seatLabel: "",
      frequentFlyer: "",
    });
  }

  return passengers;
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(String(email || "").trim());
}

function isValidMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function isPassengerValid(passenger) {
  return (
    passenger.title &&
    String(passenger.firstName || "").trim() &&
    String(passenger.lastName || "").trim() &&
    passenger.gender &&
    String(passenger.dob || "").trim()
  );
}

export default function FlightPassengerDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const persistedState = readFlightBookingFlowState();
  const incomingState = location.state || {};
  const flowState = incomingState.flight ? incomingState : persistedState || {};

  const flight = flowState.flight || null;
  const selectedSeats = flowState.selectedSeats || [];
  const searchContext = flowState.searchContext || null;
  const travellers = parseTravellerSummary(searchContext?.travellers);

  const [passengers, setPassengers] = useState(() =>
    buildPassengerSeed(selectedSeats, travellers, flowState.passengers)
  );

  const filledPassengers = useMemo(() => {
    return passengers.filter(p => p.firstName.trim() || p.lastName.trim());
  }, [passengers]);
  const [contact, setContact] = useState(() => ({
    email: flowState.contact?.email || "",
    mobile: flowState.contact?.mobile || "",
    whatsappUpdates: Boolean(flowState.contact?.whatsappUpdates),
    whatsappNumber: flowState.contact?.whatsappNumber || "",
  }));

  const [couponCode, setCouponCode] = useState(flowState.couponCode || "");
  const [selectedFeaturedOfferId, setSelectedFeaturedOfferId] = useState(flowState.selectedFeaturedOfferId || null);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const [specialAssistance, setSpecialAssistance] = useState(
    flowState.specialAssistance || ""
  );
  const [agreedToTerms, setAgreedToTerms] = useState(Boolean(flowState.agreedToTerms));
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAssuredModal, setShowAssuredModal] = useState(false);

  const [passengerModes, setPassengerModes] = useState(() =>
    passengers.map(() => false)
  );
  const [savedTravelers, setSavedTravelers] = useState([]);
  const [travelerLoadError, setTravelerLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const localList = readLocalTravelers();
      if (isMounted && localList.length > 0) {
        setSavedTravelers(localList);
      }
      try {
        const apiList = await listTravelers();
        if (!isMounted) return;
        if (Array.isArray(apiList) && apiList.length > 0) {
          const apiById = new Map(apiList.map((t) => [String(t.id), t]));
          const merged = [...apiList];
          for (const local of localList) {
            if (!apiById.has(String(local.id))) {
              merged.push(local);
            }
          }
          setSavedTravelers(merged);
          setTravelerLoadError("");
        } else if (apiList.length === 0 && localList.length > 0) {
          setSavedTravelers(localList);
        }
      } catch (err) {
        if (!isMounted) return;
        setTravelerLoadError("Using locally saved travelers.");
        console.warn("listTravelers API error:", err.message);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const setPassengerMode = (index, isExisting) => {
    setPassengerModes((prev) =>
      prev.map((mode, i) => (i === index ? isExisting : mode))
    );
    setPassengers((prev) =>
      prev.map((passenger, i) => {
        if (i !== index) return passenger;
        return {
          ...passenger,
          selectedTravelerId: "",
          title: "Mr",
          firstName: "",
          lastName: "",
          gender: "Male",
          dob: "",
        };
      })
    );
  };

  const handleSelectExistingTraveler = (index, travelerId) => {
    if (!travelerId) {
      setPassengers((prev) =>
        prev.map((passenger, i) =>
          i === index
            ? {
                ...passenger,
                selectedTravelerId: "",
                firstName: "",
                lastName: "",
                dob: "",
              }
            : passenger
        )
      );
      return;
    }

    const found = savedTravelers.find((t) => String(t.id) === travelerId);
    if (!found) return;

    setPassengers((prev) =>
      prev.map((passenger, i) =>
        i === index
          ? {
              ...passenger,
              selectedTravelerId: travelerId,
              title: found.title || "Mr",
              firstName: found.firstName || "",
              lastName: found.lastName || "",
              gender: found.gender || "Male",
              dob: found.dobInput || "",
            }
          : passenger
      )
    );
  };

  // Load available coupons and featured offers on mount
  useEffect(() => {
    async function loadPromoData() {
      try {
        const promos = await getFlightPromotions();
        setAvailableCoupons(promos.filter(p => !p.isActiveAutoApply && !p.isAutoApply) || []);
        
        const response = await fetch(toApiUrl("/api/FeaturedOffers"), {
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true"
          }
        });
        const offersData = await response.json();
        if (offersData && Array.isArray(offersData.offers)) {
          setFeaturedOffers(offersData.offers.filter(o => o.bookingType === "Flight" && o.isActive));
        }
      } catch (err) {
        console.error("Failed to load flight coupons and offers", err);
      }
    }
    loadPromoData();
  }, []);

  // Sync pricing preview from backend
  const loadPricing = async (code = "", offerId = null) => {
    if (!flight) return;
    setIsApplying(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const passengerCount = travellers.adults + travellers.children;
      const payload = {
        flightId: flight.id,
        travelClass: flight.className || searchContext?.cabinClass || "Economy",
        tripType: searchContext?.tripType || "OneWay",
        passengerCount,
        couponCode: code || null,
        selectedFeaturedOfferId: offerId || null
      };

      const pricing = await getFlightPricingPreview(payload);
      setPricingBreakdown(pricing);

      if (code) {
        if (pricing.couponDiscount > 0) {
          setCouponSuccess(`Coupon "${code}" applied! Discount: ${formatCurrency(pricing.couponDiscount)}`);
          setCouponCode(code);
          setSelectedFeaturedOfferId(null);
        } else {
          setCouponError("Coupon is valid but offers no discount for this booking.");
        }
      } else if (offerId) {
        const disc = pricing.couponDiscount > 0 ? pricing.couponDiscount : pricing.promotionDiscount;
        if (disc > 0) {
          setCouponSuccess(`Offer applied successfully! Discount: ${formatCurrency(disc)}`);
          setSelectedFeaturedOfferId(offerId);
          setCouponCode("");
        } else {
          setCouponError("Offer is valid but offers no discount for this booking.");
        }
      }
    } catch (err) {
      console.error(err);
      setCouponError(err.message || "Unable to validate coupon / offer.");
      setCouponCode("");
      setSelectedFeaturedOfferId(null);
      // fallback calculation
      setPricingBreakdown(null);
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    loadPricing(couponCode.trim().toUpperCase(), null);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponSuccess("");
    setCouponError("");
    setPricingBreakdown(null);
  };

  const handleSelectOffer = (offerId) => {
    loadPricing("", offerId);
  };

  const handleRemoveOffer = () => {
    setSelectedFeaturedOfferId(null);
    setCouponSuccess("");
    setCouponError("");
    setPricingBreakdown(null);
  };

  if (!flight) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Flight selection missing</h2>
            <p>Select a flight before filling traveller details.</p>
            <button type="button" onClick={() => navigate("/search/flights")}>Back to Flight Search</button>
          </section>
        </div>
      </main>
    );
  }

  const updatePassenger = (index, field, value) => {
    setPassengers((previous) =>
      previous.map((passenger, passengerIndex) =>
        passengerIndex === index ? { ...passenger, [field]: value } : passenger
      )
    );
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[`passenger_${index}_${field}`];
      return copy;
    });
  };

  const preservedFareSummary = flowState.fareSummary || {};
  const baseFare = Number(preservedFareSummary.baseFare || 0);
  const tax = Number(preservedFareSummary.tax || 0);
  const convenienceFee = Number(preservedFareSummary.convenienceFee || 0);
  const markup = Number(preservedFareSummary.markup || 0);
  const totalDiscount = pricingBreakdown
    ? Number(pricingBreakdown.promotionDiscount || 0) +
      Number(pricingBreakdown.couponDiscount || 0)
    : Number(preservedFareSummary.discount || flowState.couponDiscount || 0);
  const preservedTotal =
    Number(preservedFareSummary.totalFare || 0) ||
    baseFare + tax + convenienceFee + markup;
  const finalPayable = Math.max(0, preservedTotal - totalDiscount);
  const isPassengerValid = (p) => p.title && p.firstName && p.lastName && p.gender && p.dob;
  const allPassengersValid = passengers.every(isPassengerValid);

  const validateForm = () => {
    const newErrors = {};
    passengers.forEach((p, idx) => {
      if (!p.title) newErrors[`passenger_${idx}_title`] = "Required";
      if (!p.firstName || !p.firstName.trim()) newErrors[`passenger_${idx}_firstName`] = "Required";
      if (!p.lastName || !p.lastName.trim()) newErrors[`passenger_${idx}_lastName`] = "Required";
      if (!p.gender) newErrors[`passenger_${idx}_gender`] = "Required";
      if (!p.dob) newErrors[`passenger_${idx}_dob`] = "Required";
    });

    if (!contact.email || !contact.email.trim()) {
      newErrors.contact_email = "Required";
    } else if (!isValidEmail(contact.email)) {
      newErrors.contact_email = "Invalid";
    }

    if (!contact.mobile || !contact.mobile.trim()) {
      newErrors.contact_mobile = "Required";
    } else if (!isValidMobile(contact.mobile)) {
      newErrors.contact_mobile = "Invalid";
    }

    if (contact.whatsappUpdates) {
      const waNum = contact.whatsappNumber || contact.mobile;
      if (!waNum || !waNum.trim()) {
        newErrors.contact_whatsappNumber = "Required";
      } else if (!isValidMobile(waNum)) {
        newErrors.contact_whatsappNumber = "Invalid";
      }
    }

    if (!agreedToTerms) {
      newErrors.agreedToTerms = "Required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    const isValid = validateForm();
    if (!isValid) {
      setFormError("Please correct the errors in the form to proceed.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      openAuthModal("login");
      return;
    }

    setFormError("");
    setShowReviewModal(true);
  };

  const handleConfirmReview = () => {
    setShowReviewModal(false);
    setShowAssuredModal(true);
  };

  const handleSelectAssured = (secured) => {
    setShowAssuredModal(false);
    
    const count = passengers.length;
    const assuredFee = secured ? 1649 * count : 0;
    
    const finalFareSummary = {
      baseFare,
      seatSurcharge: flowState.fareSummary?.seatSurcharge || 0,
      mealFee: flowState.fareSummary?.mealFee || 0,
      baggageFee: flowState.fareSummary?.baggageFee || 0,
      tax,
      markup,
      convenienceFee,
      discount: totalDiscount,
      assuredFee,
      totalFare: finalPayable + assuredFee,
    };
    
    const payload = {
      ...flowState,
      passengers,
      contact,
      specialAssistance,
      couponCode: couponCode.trim().toUpperCase(),
      selectedFeaturedOfferId,
      couponDiscount: totalDiscount,
      agreedToTerms,
      payableAmount: finalPayable + assuredFee,
      fareSummary: finalFareSummary,
      assuredSecured: secured,
    };

    writeFlightBookingFlowState(payload);
    navigate("/flight/seats", { state: payload });
  };

  const renderPassengerFields = (passenger, index) => (
    <div className="passenger-fields flight-passenger-fields">
      <label className="passenger-field">
        <span>Title *</span>
        <select
          value={passenger.title || ""}
          onChange={(event) => updatePassenger(index, "title", event.target.value)}
          className={errors[`passenger_${index}_title`] ? "field-has-error" : ""}
        >
          <option value="">Title *</option>
          <option value="Mr">Mr</option>
          <option value="Mrs">Mrs</option>
          <option value="Ms">Ms</option>
        </select>
        {errors[`passenger_${index}_title`] && (
          <span className="field-error-text">{errors[`passenger_${index}_title`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>First Name *</span>
        <input
          type="text"
          placeholder="First Name *"
          value={passenger.firstName}
          onChange={(event) =>
            updatePassenger(index, "firstName", event.target.value)
          }
          className={errors[`passenger_${index}_firstName`] ? "field-has-error" : ""}
        />
        {errors[`passenger_${index}_firstName`] && (
          <span className="field-error-text">{errors[`passenger_${index}_firstName`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Last Name *</span>
        <input
          type="text"
          placeholder="Last Name *"
          value={passenger.lastName}
          onChange={(event) =>
            updatePassenger(index, "lastName", event.target.value)
          }
          className={errors[`passenger_${index}_lastName`] ? "field-has-error" : ""}
        />
        {errors[`passenger_${index}_lastName`] && (
          <span className="field-error-text">{errors[`passenger_${index}_lastName`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Gender *</span>
        <select
          value={passenger.gender || ""}
          onChange={(event) => updatePassenger(index, "gender", event.target.value)}
          className={errors[`passenger_${index}_gender`] ? "field-has-error" : ""}
        >
          <option value="">Gender *</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        {errors[`passenger_${index}_gender`] && (
          <span className="field-error-text">{errors[`passenger_${index}_gender`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Date of Birth *</span>
        <input
          type={passenger.dob ? "date" : "text"}
          placeholder="Date of Birth *"
          value={passenger.dob || ""}
          onFocus={(e) => (e.target.type = "date")}
          onBlur={(e) => {
            if (!e.target.value) e.target.type = "text";
          }}
          onChange={(event) => updatePassenger(index, "dob", event.target.value)}
          className={errors[`passenger_${index}_dob`] ? "field-has-error" : ""}
        />
        {errors[`passenger_${index}_dob`] && (
          <span className="field-error-text">{errors[`passenger_${index}_dob`]}</span>
        )}
      </label>

      <label className="passenger-field">
        <span>Frequent Flyer (Optional)</span>
        <input
          type="text"
          placeholder="Frequent Flyer"
          value={passenger.frequentFlyer || ""}
          onChange={(event) =>
            updatePassenger(index, "frequentFlyer", event.target.value)
          }
        />
      </label>
    </div>
  );  // Sidebar helpers

  return (
    <main className="flight-flow-page">
      {/* ── STEPPER PROGRESS HEADER ── */}
      <div className="flight-stepper-header">
        <div className="step-item completed">
          <span className="step-circle">✓</span>
          <span>Flight Selection</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step-item active">
          <span className="step-circle">2</span>
          <span>Review & Traveller Details</span>
        </div>
        <div className="step-line"></div>
        <div className="step-item">
          <span className="step-circle">3</span>
          <span>Add-ons</span>
        </div>
        <div className="step-line"></div>
        <div className="step-item">
          <span className="step-circle">4</span>
          <span>Payment</span>
        </div>
      </div>

      <div className="flight-booking-container">
        {/* ── LEFT COLUMN SIDEBAR ── */}
        <aside className="flight-checkout-sidebar">
          {/* Your Flight Details */}
          <div className="sidebar-card your-flight-card">
            <h3 className="sidebar-card-title">Your Flight</h3>
            <div className="flight-segment">
              <div className="flight-city-info">
                <span className="flight-city-code">{flight.sourceCode || "--"}</span>
                <span className="flight-city-name">{searchContext?.source || "--"}</span>
              </div>
              <div className="flight-stops-indicator">
                <span className="stops-text">{Number(flight.stops || 0) > 0 ? `${flight.stops} stop` : "Non stop"}</span>
                <div className="stops-line"></div>
              </div>
              <div className="flight-city-info" style={{ alignItems: "flex-end" }}>
                <span className="flight-city-code">{flight.destinationCode || "--"}</span>
                <span className="flight-city-name">{searchContext?.destination || "--"}</span>
              </div>
            </div>
            <div className="flight-meta-info">
              <span>{flight.airlineName} ({flight.flightNumber})</span>
              <span className="flight-date-badge">{flight.departDate || "--"}</span>
            </div>
          </div>

          {/* Travellers Details */}
          {filledPassengers.length > 0 && (
            <div className="sidebar-card travellers-card">
              <h3 className="sidebar-card-title">Travellers</h3>
              {filledPassengers.map((p, idx) => (
                <div key={p.id} className="traveller-item">
                  {idx + 1}. {p.title} {p.firstName} {p.lastName}
                </div>
              ))}
            </div>
          )}

          {/* Fare Summary */}
          <div className="sidebar-card fare-summary-card">
            <h3 className="sidebar-card-title">Fare Summary</h3>
            <div className="fare-row">
              <span>Fare Type</span>
              <span className="refundable-tag">{flight.isRefundable ? "Refundable" : "Non-Refundable"}</span>
            </div>
            <div className="fare-row">
              <span>Base Fare</span>
              <span>₹ {baseFare.toLocaleString("en-IN")}</span>
            </div>
            {tax > 0 && (
              <div className="fare-row">
                <span>Taxes & Fees</span>
                <span>₹ {tax.toLocaleString("en-IN")}</span>
              </div>
            )}
            {markup > 0 && (
              <div className="fare-row">
                <span>Service Markup</span>
                <span>₹ {markup.toLocaleString("en-IN")}</span>
              </div>
            )}
            {convenienceFee > 0 && (
              <div className="fare-row">
                <span>Convenience Fee</span>
                <span>₹ {convenienceFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {totalDiscount > 0 && (
              <div className="fare-row">
                <span>Instant Discount</span>
                <span className="discount-value">-₹ {totalDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="fare-row total-amount-row">
              <span>Total Amount</span>
              <span>₹ {finalPayable.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </aside>

        {/* ── RIGHT COLUMN MAIN CONTENT ── */}
        <section className="flight-checkout-main">
          {/* Passenger Details input */}
          <div className="flight-main-card">
            <h2 className="flight-main-card-title">
              <User size={20} className="header-icon" />
              Enter Traveller Details
            </h2>
            
            {passengers.map((passenger, index) => {
              const isExisting = passengerModes[index];
              return (
                <div key={passenger.id} className="flight-passenger-row" style={{ marginBottom: 20 }}>
                  <header>
                    <h4 style={{ margin: 0, fontWeight: 700 }}>
                      Passenger {index + 1} ({passenger.passengerType})
                    </h4>
                    
                    <div className="passenger-mode-toggle" style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className={`btn-action-outline ${isExisting ? "active" : ""}`}
                        style={{ padding: "4px 8px", fontSize: "0.75rem", height: "auto" }}
                        onClick={() => setPassengerMode(index, true)}
                      >
                        Existing Traveler
                      </button>
                      <button
                        type="button"
                        className={`btn-action-outline ${!isExisting ? "active" : ""}`}
                        style={{ padding: "4px 8px", fontSize: "0.75rem", height: "auto" }}
                        onClick={() => setPassengerMode(index, false)}
                      >
                        Add New
                      </button>
                    </div>
                  </header>

                  <div style={{ marginTop: 12 }}>
                    {isExisting ? (
                      <div className="passenger-existing-wrap" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {travelerLoadError && (
                          <p className="pmode-warn" style={{ color: "orange", margin: 0, fontSize: "0.75rem" }}>{travelerLoadError}</p>
                        )}
                        <select
                          className="input-control"
                          value={passenger.selectedTravelerId || ""}
                          onChange={(e) => handleSelectExistingTraveler(index, e.target.value)}
                        >
                          <option value="">-- Select Existing Traveler --</option>
                          {savedTravelers.length === 0 ? (
                            <option disabled>No saved travelers found</option>
                          ) : (
                            savedTravelers.map((t) => (
                              <option key={t.id} value={String(t.id)}>
                                {[t.title, t.firstName, t.lastName].filter(Boolean).join(" ")}
                              </option>
                            ))
                          )}
                        </select>

                        {passenger.selectedTravelerId && renderPassengerFields(passenger, index)}
                      </div>
                    ) : (
                      renderPassengerFields(passenger, index)
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contact Details */}
          <div className="flight-main-card">
            <h2 className="flight-main-card-title">
              <Mail size={20} className="header-icon" />
              Contact Details
            </h2>
            <p style={{ fontSize: "0.813rem", color: "var(--text-muted)", marginTop: "-12px", marginBottom: 16 }}>
              Your ticket and flight information will be sent here
            </p>

            <div className="form-grid-2">
              <div className="input-group">
                <label>Email Address *</label>
                <input
                  className={`input-control ${errors.contact_email ? "error-state" : ""}`}
                  type="email"
                  placeholder="Email ID"
                  value={contact.email}
                  onChange={(e) => {
                    setContact(prev => ({ ...prev, email: e.target.value }));
                    setErrors(prev => { const c = { ...prev }; delete c.contact_email; return c; });
                  }}
                />
                {errors.contact_email && <span className="input-error-msg">{errors.contact_email}</span>}
              </div>

              <div className="input-group">
                <label>Mobile Number *</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <select
                    style={{
                      width: "80px",
                      minWidth: "80px",
                      flexShrink: 0,
                      height: "42px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontFamily: "inherit",
                      fontSize: "0.875rem",
                      color: "var(--text-main)",
                      backgroundColor: "var(--bg-card)",
                      cursor: "not-allowed"
                    }}
                    disabled
                  >
                    <option>+91</option>
                  </select>
                  <input
                    className={`input-control ${errors.contact_mobile ? "error-state" : ""}`}
                    style={{ flexGrow: 1, minWidth: 0 }}
                    type="text"
                    placeholder="Mobile Number"
                    value={contact.mobile}
                    onChange={(e) => {
                      setContact(prev => ({ ...prev, mobile: e.target.value }));
                      setErrors(prev => { const c = { ...prev }; delete c.contact_mobile; return c; });
                    }}
                  />
                </div>
                {errors.contact_mobile && <span className="input-error-msg">{errors.contact_mobile}</span>}
              </div>
            </div>

            <div style={{ marginTop: "16px", marginBottom: "16px" }}>
              <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={contact.whatsappUpdates}
                  onChange={(e) => {
                    setContact(prev => ({
                      ...prev,
                      whatsappUpdates: e.target.checked,
                      whatsappNumber: e.target.checked ? prev.whatsappNumber || prev.mobile : ""
                    }));
                    setErrors(prev => { const c = { ...prev }; delete c.contact_whatsappNumber; return c; });
                  }}
                  style={{ width: "16px", height: "16px", margin: 0, padding: 0, cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--text-main)", marginLeft: "8px", fontWeight: "normal" }}>
                  Send updates on WhatsApp
                </span>
              </label>
              {contact.whatsappUpdates && (
                <div style={{ marginTop: "8px" }}>
                  <input
                    className="input-control"
                    type="text"
                    placeholder="WhatsApp number (defaults to mobile)"
                    value={contact.whatsappNumber}
                    onChange={(e) => setContact(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Special Requests & Terms */}
          <div className="flight-main-card">
            <h2 className="flight-main-card-title">Additional Details</h2>
            <div className="input-group">
              <label>Special Requests / Assistance (Optional)</label>
              <input
                className="input-control"
                type="text"
                value={specialAssistance}
                onChange={(e) => setSpecialAssistance(e.target.value)}
                placeholder="Wheelchair, diabetic meal, etc."
              />
            </div>

            <div className="input-group" style={{ marginTop: 16 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    setErrors(prev => { const c = { ...prev }; delete c.agreedToTerms; return c; });
                  }}
                  style={{ width: 16, height: 16, marginTop: 3 }}
                />
                <span style={{ fontSize: "0.813rem", color: "var(--text-muted)", lineBreak: "auto" }}>
                  I agree to the flight cancellation rules, booking terms & policies. <span style={{ color: "red" }}>*</span>
                </span>
              </label>
              {errors.agreedToTerms && <span className="input-error-msg">{errors.agreedToTerms}</span>}
            </div>

            {formError && (
              <p style={{ color: "var(--danger-color)", fontSize: "0.813rem", fontWeight: 700, margin: "12px 0 0 0" }}>
                {formError}
              </p>
            )}
          </div>

          {/* Coupons & Offers */}
          <div className="flight-main-card">
            <h2 className="flight-main-card-title">
              <Tag size={20} className="header-icon" />
              Apply Coupons & Offers
            </h2>

            <div style={{ display: "flex", gap: 12 }}>
              <input
                className="input-control"
                style={{ textTransform: "uppercase" }}
                type="text"
                placeholder="Enter promo code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={isApplying || selectedFeaturedOfferId !== null}
              />
              {couponCode && pricingBreakdown?.couponDiscount > 0 ? (
                <button type="button" className="btn-secondary" onClick={handleRemoveCoupon}>Remove</button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleApplyCoupon}
                  disabled={isApplying || selectedFeaturedOfferId !== null}
                >
                  {isApplying ? "Applying..." : "Apply"}
                </button>
              )}
            </div>

            {couponError && <p style={{ color: "var(--danger-color)", fontSize: "0.75rem", marginTop: 6, marginBottom: 0 }}>{couponError}</p>}
            {couponSuccess && <p style={{ color: "var(--success-color)", fontSize: "0.75rem", marginTop: 6, marginBottom: 0 }}>{couponSuccess}</p>}

            {/* Coupons list */}
            {availableCoupons.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.875rem" }}>Available Coupons</h4>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10 }}>
                  {availableCoupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      style={{
                        minWidth: 200,
                        border: "1px dashed var(--border-color)",
                        borderRadius: 8,
                        padding: 10,
                        backgroundColor: "#f8fafc",
                        position: "relative"
                      }}
                    >
                      <strong style={{ display: "block", fontSize: "0.875rem", color: "var(--secondary-color)" }}>{coupon.name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{coupon.discountValue}% Off</span>
                      <button
                        type="button"
                        className="btn-action-outline"
                        style={{ width: "100%", height: 30, padding: 0, marginTop: 8, fontSize: "0.75rem" }}
                        onClick={() => loadPricing(coupon.name, null)}
                        disabled={isApplying || selectedFeaturedOfferId !== null}
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Featured offers list */}
            {featuredOffers.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.875rem" }}>Featured Offers</h4>
                <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 10 }}>
                  {featuredOffers.map((offer) => (
                    <div
                      key={offer.id}
                      style={{
                        minWidth: 200,
                        border: "1px solid var(--border-color)",
                        borderRadius: 8,
                        padding: 10,
                        backgroundColor: "#fff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                      }}
                    >
                      <strong style={{ display: "block", fontSize: "0.875rem" }}>{offer.title}</strong>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0" }}>{offer.subtitle}</p>
                      <button
                        type="button"
                        className="btn-action-outline"
                        style={{ width: "100%", height: 30, padding: 0, marginTop: 4, fontSize: "0.75rem" }}
                        onClick={() => handleSelectOffer(offer.id)}
                        disabled={isApplying || couponCode !== ""}
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── BOTTOM STICKY ACTION BAR ── */}
      <div className="bottom-action-bar">
        <div className="bottom-price-info">
          <span className="bottom-price-label">Total Fare</span>
          <span className="bottom-price-amount">₹ {finalPayable.toLocaleString("en-IN")}</span>
        </div>

        <button type="button" className="btn-primary" onClick={handleContinue}>
          Continue <ArrowRight size={16} />
        </button>
      </div>

      {/* ── MODAL 1: REVIEW DETAILS POPUP ── */}
      {showReviewModal && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <div className="modal-header">
              <h3 className="modal-title">Review Details</h3>
              <p className="modal-subtitle">
                Please ensure that your name matches your govt. ID such as Aadhaar, Passport or Driver's License
              </p>
            </div>
            <div className="modal-body">
              {passengers.map((passenger, index) => (
                <div
                  key={passenger.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-color)"
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: "rgba(37,99,235,0.1)",
                      color: "var(--secondary-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                      {passenger.passengerType}
                    </span>
                    <strong style={{ display: "block", fontSize: "0.95rem", marginTop: 2 }}>
                      {passenger.title} {passenger.firstName} {passenger.lastName}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)}>
                Edit
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirmReview}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: FREE CANCELLATION (ASSURED) POPUP ── */}
      {showAssuredModal && (
        <div className="modal-overlay">
          <div className="modal-content-card" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--secondary-color)" }}>
                <ShieldCheck size={26} />
                PickNBook
              </h3>
              <p className="modal-subtitle">Free Cancellation protection, only @ ₹1,649/traveller</p>
            </div>
            <div className="modal-body">
              <table className="assured-comparison-table">
                <thead>
                  <tr>
                    <th>Benefit</th>
                    <th className="highlight-col">With PickNBook</th>
                    <th>Without PickNBook</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Refund on cancellation</td>
                    <td className="highlight-col" style={{ color: "var(--success-color)", fontWeight: 800 }}>
                      ₹ {Math.round(finalPayable).toLocaleString("en-IN")} (Full Refund)
                    </td>
                    <td>₹ {Math.round(finalPayable * 0.5).toLocaleString("en-IN")} (Standard Refund)</td>
                  </tr>
                  <tr>
                    <td>Instant Refund</td>
                    <td className="highlight-col">
                      <span className="check-icon-green">✓ Yes</span>
                    </td>
                    <td>
                      <span className="cross-icon-red">✗ No</span>
                    </td>
                  </tr>
                  <tr>
                    <td>24x7 Priority Support</td>
                    <td className="highlight-col">
                      <span className="check-icon-green">✓ Yes</span>
                    </td>
                    <td>
                      <span className="cross-icon-red">✗ No</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "16px 0 0 0" }}>
                By securing your trip, you agree to the Terms of Service for PickNBook cancellation.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ border: "none", color: "var(--text-muted)" }}
                onClick={() => handleSelectAssured(false)}
              >
                No, Thanks
              </button>
              <button type="button" className="btn-primary" onClick={() => handleSelectAssured(true)}>
                Secure My Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
