import React, { useMemo, useState, useEffect } from "react";
import { Info, Ticket, Tag, Mail, Phone } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../STYLES/BusBookingFlow.css";
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

  // Run initial pricing preview
  useEffect(() => {
    loadPricing(couponCode, selectedFeaturedOfferId);
  }, [flight]);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    loadPricing(couponCode.trim().toUpperCase(), null);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponSuccess("");
    setCouponError("");
    loadPricing("", null);
  };

  const handleSelectOffer = (offerId) => {
    loadPricing("", offerId);
  };

  const handleRemoveOffer = () => {
    setSelectedFeaturedOfferId(null);
    setCouponSuccess("");
    setCouponError("");
    loadPricing("", null);
  };

  if (!flight || selectedSeats.length === 0) {
    return (
      <main className="flight-flow-page">
        <div className="flight-flow-shell">
          <section className="flight-flow-empty">
            <h2>Seat selection data missing</h2>
            <p>Select flight seats before filling passenger details.</p>
            <button type="button" onClick={() => navigate("/flight/seats")}>Back to Seat Selection</button>
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

  const finalPayable = pricingBreakdown ? pricingBreakdown.finalAmount : flowState.fareSummary?.totalFare || 0;
  const convenienceFee = pricingBreakdown ? pricingBreakdown.convenienceFee : flowState.fareSummary?.convenienceFee || 0;
  const baseFare = pricingBreakdown ? pricingBreakdown.supplierTotalFare : flowState.fareSummary?.baseFare || 0;
  const tax = pricingBreakdown ? pricingBreakdown.supplierTaxAmount : flowState.fareSummary?.tax || 0;
  const markup = pricingBreakdown ? pricingBreakdown.markupAmount : 0;
  const totalDiscount = pricingBreakdown ? (pricingBreakdown.promotionDiscount + pricingBreakdown.couponDiscount) : 0;
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

    const payload = {
      ...flowState,
      passengers,
      contact,
      specialAssistance,
      couponCode: couponCode.trim().toUpperCase(),
      selectedFeaturedOfferId,
      couponDiscount: totalDiscount,
      agreedToTerms,
      payableAmount: finalPayable,
      fareSummary: {
        baseFare,
        seatSurcharge: flowState.fareSummary?.seatSurcharge || 0,
        mealFee: flowState.fareSummary?.mealFee || 0,
        baggageFee: flowState.fareSummary?.baggageFee || 0,
        tax,
        markup,
        convenienceFee,
        discount: totalDiscount,
        totalFare: finalPayable,
      },
    };

    writeFlightBookingFlowState(payload);
    navigate("/flight/payment", { state: payload });
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
  );

  return (
    <main className="bus-flow-page">
      <div className="bus-flow-shell">
        <section className="bus-passenger-layout">

          {/* ── LEFT COLUMN ── */}
          <div className="bus-passenger-main">

            {/* Flight Details */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L2 22M17 22H21" />
                  </svg>
                </span>
                Flight Details
              </header>
              <div className="flow-card-body">
                <div className="bus-journey-grid">
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: 'bold', display: 'block' }}>
                      {searchContext?.source} → {searchContext?.destination}
                    </strong>
                    <span className="date-badge">
                      {flight.airlineName} {flight.flightNumber}
                    </span>
                  </div>
                  <div>
                    <small>Depart Time</small>
                    <strong>{flight.departureTime || "10:00"}</strong>
                  </div>
                  <div className="journey-timeline-center">
                    <div className="timeline-line-wrap">
                      <div className="timeline-dot"></div>
                      <div className="timeline-line"></div>
                      <span className="timeline-bus-icon">✈️</span>
                      <div className="timeline-line"></div>
                      <div className="timeline-dot"></div>
                    </div>
                    <span className="timeline-duration">{flight.duration || "2h 30m"}</span>
                  </div>
                  <div>
                    <small>Arrival Time</small>
                    <strong>{flight.arrivalTime || "12:30"}</strong>
                  </div>
                  <div>
                    <small>Seat No</small>
                    <strong>
                      {selectedSeats.map((s) => s.label).join(", ") || "Auto Assign"}
                    </strong>
                  </div>
                </div>
              </div>
            </article>

            {/* Passenger Details */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                Passenger Details
              </header>
              <div className="flow-card-body">
                {passengers.map((passenger, index) => {
                  const isExisting = passengerModes[index];
                  return (
                    <div className="passenger-row" key={passenger.id}>
                      <h4>
                        Passenger {index + 1}
                        <span>({passenger.passengerType}) {passenger.seatLabel ? `— Seat ${passenger.seatLabel}` : ""}</span>
                      </h4>

                      {/* ── Mode Toggle ── */}
                      <div className="passenger-mode-toggle">
                        <button
                          type="button"
                          className={`pmode-btn${isExisting ? " pmode-btn--active" : ""}`}
                          onClick={() => setPassengerMode(index, true)}
                        >
                          Existing Traveler
                        </button>
                        <button
                          type="button"
                          className={`pmode-btn${!isExisting ? " pmode-btn--active" : ""}`}
                          onClick={() => setPassengerMode(index, false)}
                        >
                          Add New Traveler
                        </button>
                      </div>

                      {/* ── Existing Traveler ── */}
                      {isExisting ? (
                        <div className="passenger-existing-wrap">
                          {travelerLoadError && (
                            <p className="pmode-warn">{travelerLoadError}</p>
                          )}

                          <select
                            className="passenger-existing-select"
                            value={passenger.selectedTravelerId || ""}
                            onChange={(e) =>
                              handleSelectExistingTraveler(index, e.target.value)
                            }
                          >
                            <option value="">-- Select Existing Traveler --</option>
                            {savedTravelers.length === 0 ? (
                              <option disabled>No saved travelers found</option>
                            ) : (
                              savedTravelers.map((t) => (
                                <option key={t.id} value={String(t.id)}>
                                  {[t.title, t.firstName, t.lastName]
                                    .filter(Boolean)
                                    .join(" ")}
                                  {t.mobile
                                    ? ` — ${t.mobile}`
                                    : t.email
                                    ? ` — ${t.email}`
                                    : ""}
                                </option>
                              ))
                            )}
                          </select>

                          {passenger.selectedTravelerId &&
                            renderPassengerFields(passenger, index)}
                        </div>
                      ) : (
                        renderPassengerFields(passenger, index)
                      )}
                    </div>
                  );
                })}
              </div>
            </article>

            {/* Contact Details */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                Contact Details
              </header>
              <div className="flow-card-body contact-grid">
                <label>
                  <span>Enter Your Email: *</span>
                  <div className={`contact-input ${errors.contact_email ? "field-has-error" : ""}`}>
                    <Mail size={14} />
                    <input
                      type="email"
                      placeholder="Email id *"
                      value={contact.email}
                      onChange={(e) => {
                        setContact(prev => ({ ...prev, email: e.target.value }));
                        setErrors(prev => { const c = { ...prev }; delete c.contact_email; return c; });
                      }}
                    />
                  </div>
                  {errors.contact_email && (
                    <span className="field-error-text">{errors.contact_email}</span>
                  )}
                </label>

                <label>
                  <span>Enter Your Mobile: *</span>
                  <div className={`contact-input ${errors.contact_mobile ? "field-has-error" : ""}`}>
                    <Phone size={14} />
                    <input
                      type="text"
                      placeholder="Mobile *"
                      value={contact.mobile}
                      onChange={(e) => {
                        setContact(prev => ({ ...prev, mobile: e.target.value }));
                        setErrors(prev => { const c = { ...prev }; delete c.contact_mobile; return c; });
                      }}
                    />
                  </div>
                  {errors.contact_mobile && (
                    <span className="field-error-text">{errors.contact_mobile}</span>
                  )}
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  <span>WhatsApp Updates:</span>
                  <div
                    className={`contact-input ${errors.contact_whatsappNumber ? "field-has-error" : ""}`}
                    style={{ gridTemplateColumns: "auto 1fr" }}
                  >
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
                      style={{ width: 16, height: 16, margin: 0 }}
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp no. (defaults to mobile)"
                      value={contact.whatsappNumber}
                      onChange={(e) => {
                        setContact(prev => ({ ...prev, whatsappNumber: e.target.value }));
                        setErrors(prev => { const c = { ...prev }; delete c.contact_whatsappNumber; return c; });
                      }}
                      disabled={!contact.whatsappUpdates}
                    />
                  </div>
                  {errors.contact_whatsappNumber && (
                    <span className="field-error-text">{errors.contact_whatsappNumber}</span>
                  )}
                </label>
              </div>
            </article>

            {/* Special Assistance & Acknowledgement */}
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
                Fare Rules &amp; Acknowledgement
              </header>
              <div className="flow-card-body acknowledgement">
                <label style={{ display: 'block', marginBottom: '16px' }}>
                  <span>Special Assistance / Requests (Optional)</span>
                  <input
                    type="text"
                    value={specialAssistance}
                    onChange={(event) => setSpecialAssistance(event.target.value)}
                    placeholder="Wheelchair, diabetic meal, etc."
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: '9px', marginTop: '6px' }}
                  />
                </label>

                <label className={`ack-checkbox ${errors.agreedToTerms ? "field-has-error-text" : ""}`}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      setErrors(prev => { const c = { ...prev }; delete c.agreedToTerms; return c; });
                    }}
                  />
                  <span>
                    I agree to the rules and restrictions of this fare, and the
                    terms of this fare. <span className="mandatory-star" style={{ color: 'red', fontWeight: 'bold', marginLeft: '4px' }}>*</span>
                  </span>
                </label>
                {errors.agreedToTerms && (
                  <span className="field-error-text" style={{ marginTop: '2px', display: 'block', marginBottom: '10px' }}>{errors.agreedToTerms}</span>
                )}

                {formError && (
                  <div className="form-error-summary-box" style={{ marginTop: '12px' }}>
                    <div className="error-summary-header">
                      <span>Please correct the following issues to proceed:</span>
                    </div>
                    <ul className="error-summary-list">
                      <li>{formError}</li>
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  className="flow-continue-btn align-right"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>
            </article>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <aside className="bus-passenger-side">
            <article className="flow-card">
              <header>
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>₹</span>
                </span>
                Fare Details
              </header>
              <div className="flow-card-body fare-list">
                <div>
                  <span>Base Fare</span>
                  <strong>{formatCurrency(baseFare)}</strong>
                </div>
                {markup > 0 && (
                  <div>
                    <span>Service Markup</span>
                    <strong>{formatCurrency(markup)}</strong>
                  </div>
                )}
                {tax > 0 && (
                  <div>
                    <span>Taxes &amp; Fees</span>
                    <strong>{formatCurrency(tax)}</strong>
                  </div>
                )}
                <div>
                  <span>Convenience Fee</span>
                  <strong>{formatCurrency(convenienceFee)}</strong>
                </div>
                {totalDiscount > 0 && (
                  <div>
                    <span>Promotion Discount</span>
                    <strong style={{ color: "#2e7d32" }}>-{formatCurrency(totalDiscount)}</strong>
                  </div>
                )}
                <div className="grand-total">
                  <span>Grand Total</span>
                  <strong>{formatCurrency(finalPayable)}</strong>
                </div>
              </div>
            </article>

            {/* Apply Coupon Card */}
            <article className="flow-card coupon-sheet-card">
              <header className="coupon-sheet-header">
                <span className="header-icon-wrap" style={{ marginRight: '8px', display: 'inline-flex', alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                </span>
                <span>Apply Coupon</span>
                {isApplying && <span className="coupon-sheet-loading">Loading...</span>}
              </header>
              <div className="flow-card-body coupon-sheet-body">
                <div className="coupon-manual-row">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Enter Coupon code"
                    disabled={isApplying || selectedFeaturedOfferId !== null}
                  />
                  {couponCode && pricingBreakdown?.couponDiscount > 0 ? (
                    <button type="button" onClick={handleRemoveCoupon} className="coupon-action-button is-remove">Remove</button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isApplying || selectedFeaturedOfferId !== null}
                      className="coupon-action-button is-apply"
                    >
                      {isApplying ? "Applying..." : "APPLY"}
                    </button>
                  )}
                </div>
                
                {couponError && (
                  <p className="coupon-sheet-message is-error" style={{ marginTop: 5 }}>
                    {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="coupon-sheet-message is-success" style={{ marginTop: 5 }}>
                    {couponSuccess}
                  </p>
                )}

                {/* Available Coupons */}
                {availableCoupons.length > 0 && (
                  <div className="coupon-chip-block" style={{ marginTop: 15 }}>
                    <p className="coupon-section-label">Available Coupons:</p>
                    <div className="coupon-chip-list">
                      {availableCoupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className={`coupon-voucher-card ${couponCode === coupon.name ? "is-selected" : ""}`}
                        >
                          <div className="voucher-header">
                            <span className="voucher-discount">
                              {coupon.discountValue}% OFF
                            </span>
                            <span className="voucher-code-badge">{coupon.name}</span>
                          </div>
                          <div className="voucher-body">
                            <div className="voucher-title">{coupon.name}</div>
                            <p className="voucher-description">{coupon.description || `${coupon.discountValue} Off`}</p>
                            <div className="voucher-action-row">
                              {couponCode === coupon.name ? (
                                <button
                                  type="button"
                                  onClick={handleRemoveCoupon}
                                  className="voucher-remove-btn"
                                >Remove</button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => loadPricing(coupon.name, null)}
                                  disabled={isApplying || selectedFeaturedOfferId !== null}
                                  className="voucher-apply-btn"
                                >Apply</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured Offers */}
                {featuredOffers.length > 0 && (
                  <div className="coupon-featured-block" style={{ marginTop: 15 }}>
                    <p className="coupon-section-label">Featured Offers:</p>
                    <div className="coupon-featured-list">
                      {featuredOffers.map((offer) => {
                        const isSelected = selectedFeaturedOfferId === offer.id;
                        return (
                          <div
                            key={offer.id}
                            className={`coupon-voucher-card coupon-featured-offer ${isSelected ? "is-selected" : ""}`}
                          >
                            <div className="voucher-header">
                              <span className="voucher-discount">OFFER</span>
                              <span className="voucher-code-badge">{offer.title}</span>
                            </div>
                            <div className="voucher-body">
                              <div className="voucher-title">{offer.title}</div>
                              <p className="voucher-description">{offer.subtitle || offer.description}</p>
                              <div className="voucher-action-row">
                                {isSelected ? (
                                  <button
                                    type="button"
                                    onClick={handleRemoveOffer}
                                    className="voucher-remove-btn"
                                  >Remove</button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectOffer(offer.id)}
                                    disabled={isApplying || couponCode !== ""}
                                    className="voucher-apply-btn"
                                  >Apply</button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </article>
          </aside>

        </section>
      </div>
    </main>
  );
}
