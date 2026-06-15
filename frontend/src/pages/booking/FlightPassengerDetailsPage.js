import React, { useMemo, useState, useEffect } from "react";
import { Info, Ticket, Tag } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../STYLES/FlightBookingFlow.css";
import {
  readFlightBookingFlowState,
  writeFlightBookingFlowState,
} from "./flightBookingFlowStore";
import { getFlightPricingPreview, getFlightPromotions } from "../../services/flightBookingService";
import { toApiUrl } from "../../services/apiClient";

function formatCurrency(amount) {
  return `INR ${new Intl.NumberFormat("en-IN", {
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
  };

  const finalPayable = pricingBreakdown ? pricingBreakdown.finalAmount : flowState.fareSummary?.totalFare || 0;
  const convenienceFee = pricingBreakdown ? pricingBreakdown.convenienceFee : flowState.fareSummary?.convenienceFee || 0;
  const baseFare = pricingBreakdown ? pricingBreakdown.supplierTotalFare : flowState.fareSummary?.baseFare || 0;
  const tax = pricingBreakdown ? pricingBreakdown.supplierTaxAmount : flowState.fareSummary?.tax || 0;
  const markup = pricingBreakdown ? pricingBreakdown.markupAmount : 0;
  const totalDiscount = pricingBreakdown ? (pricingBreakdown.promotionDiscount + pricingBreakdown.couponDiscount) : 0;

  const handleContinue = () => {
    if (!allPassengersValid) {
      setFormError("Fill all mandatory passenger fields.");
      return;
    }

    if (!isValidEmail(contact.email)) {
      setFormError("Enter a valid email address.");
      return;
    }

    if (!isValidMobile(contact.mobile)) {
      setFormError("Enter a valid mobile number.");
      return;
    }

    if (contact.whatsappUpdates) {
      const whatsappValue = contact.whatsappNumber || contact.mobile;

      if (!isValidMobile(whatsappValue)) {
        setFormError("Enter a valid WhatsApp number or disable WhatsApp updates.");
        return;
      }
    }

    if (!agreedToTerms) {
      setFormError("Please accept fare rules and terms before continuing.");
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

  return (
    <main className="flight-flow-page">
      <div className="flight-flow-shell">
        <section className="flight-passenger-layout">
          <div className="flight-section-card">
            <header className="flight-card-head">
              <div>
                <h2>Passenger Details</h2>
                <span>{flight.airlineName} {flight.flightNumber}</span>
              </div>
              <span>{searchContext?.source} to {searchContext?.destination}</span>
            </header>

            <div className="flight-form-grid">
              {passengers.map((passenger, index) => (
                <article className="flight-passenger-row" key={passenger.id}>
                  <header>
                    <h4>
                      Passenger {index + 1} - {passenger.passengerType}
                    </h4>
                    <span>{passenger.seatLabel ? `Seat ${passenger.seatLabel}` : "No Seat"}</span>
                  </header>

                  <div className="flight-passenger-fields">
                    <select
                      value={passenger.title}
                      onChange={(event) => updatePassenger(index, "title", event.target.value)}
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                    </select>

                    <input
                      type="text"
                      placeholder="First Name"
                      value={passenger.firstName}
                      onChange={(event) =>
                        updatePassenger(index, "firstName", event.target.value)
                      }
                    />

                    <input
                      type="text"
                      placeholder="Last Name"
                      value={passenger.lastName}
                      onChange={(event) =>
                        updatePassenger(index, "lastName", event.target.value)
                      }
                    />

                    <select
                      value={passenger.gender}
                      onChange={(event) => updatePassenger(index, "gender", event.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>

                    <input
                      type="date"
                      value={passenger.dob}
                      onChange={(event) => updatePassenger(index, "dob", event.target.value)}
                    />

                    <input
                      type="text"
                      placeholder="Frequent Flyer (Optional)"
                      value={passenger.frequentFlyer}
                      onChange={(event) =>
                        updatePassenger(index, "frequentFlyer", event.target.value)
                      }
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="flight-contact-grid">
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(event) =>
                    setContact((previous) => ({ ...previous, email: event.target.value }))
                  }
                  placeholder="name@example.com"
                />
              </label>

              <label>
                <span>Mobile</span>
                <input
                  type="text"
                  value={contact.mobile}
                  onChange={(event) =>
                    setContact((previous) => ({
                      ...previous,
                      mobile: event.target.value,
                      whatsappNumber:
                        previous.whatsappUpdates && !previous.whatsappNumber
                          ? event.target.value
                          : previous.whatsappNumber,
                    }))
                  }
                  placeholder="+91XXXXXXXXXX"
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>WhatsApp Updates</span>
                <div className="flight-whatsapp-row">
                  <input
                    type="checkbox"
                    checked={contact.whatsappUpdates}
                    onChange={(event) =>
                      setContact((previous) => ({
                        ...previous,
                        whatsappUpdates: event.target.checked,
                        whatsappNumber:
                          event.target.checked && !previous.whatsappNumber
                            ? previous.mobile
                            : previous.whatsappNumber,
                      }))
                    }
                    style={{ width: 16, height: 16, alignSelf: "center" }}
                  />
                  <input
                    type="text"
                    value={contact.whatsappNumber}
                    onChange={(event) =>
                      setContact((previous) => ({
                        ...previous,
                        whatsappNumber: event.target.value,
                      }))
                    }
                    disabled={!contact.whatsappUpdates}
                    placeholder="WhatsApp no. (defaults to mobile)"
                  />
                </div>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <span>Special Assistance / Requests</span>
                <input
                  type="text"
                  value={specialAssistance}
                  onChange={(event) => setSpecialAssistance(event.target.value)}
                  placeholder="Wheelchair, diabetic meal, etc. (optional)"
                />
              </label>
            </div>
          </div>

          <aside className="flight-side-card">
            <h3>Fare Summary</h3>
            <div className="flight-fare-list">
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
                  <span>Taxes</span>
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
              <div className="total">
                <span>Payable</span>
                <strong>{formatCurrency(finalPayable)}</strong>
              </div>
            </div>

            <div className="flight-options-group">
              <label>
                <span>Apply Coupon</span>
                <div className="flight-coupon-row">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Enter Coupon code"
                    disabled={isApplying || selectedFeaturedOfferId !== null}
                  />
                  {couponCode && pricingBreakdown?.couponDiscount > 0 ? (
                    <button type="button" onClick={handleRemoveCoupon} style={{ backgroundColor: "#d32f2f" }}>Remove</button>
                  ) : (
                    <button type="button" onClick={handleApplyCoupon} disabled={isApplying || selectedFeaturedOfferId !== null}>
                      {isApplying ? "Applying..." : "Apply"}
                    </button>
                  )}
                </div>
              </label>
              
              {couponError && <p className="flight-flow-error" style={{ marginTop: 5 }}>{couponError}</p>}
              {couponSuccess && <p className="coupon-success-text" style={{ color: "#2e7d32", fontSize: "0.85rem", marginTop: 5 }}>{couponSuccess}</p>}
            </div>

            {/* Available Promotions section */}
            {availableCoupons.length > 0 && (
              <div className="promo-chips-section" style={{ marginTop: 15 }}>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 5 }}>Available Coupons:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {availableCoupons.map((coupon) => (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => loadPricing(coupon.name, null)}
                      disabled={isApplying || selectedFeaturedOfferId !== null}
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.8rem",
                        backgroundColor: "#f5f5f5",
                        border: "1px dashed #ccc",
                        borderRadius: 4,
                        cursor: "pointer",
                        color: "#333"
                      }}
                    >
                      <strong>{coupon.name}</strong> - {coupon.description || `${coupon.discountValue} Off`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {featuredOffers.length > 0 && (
              <div className="featured-offers-section" style={{ marginTop: 15 }}>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 5 }}>Featured Offers:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {featuredOffers.map((offer) => {
                    const isSelected = selectedFeaturedOfferId === offer.id;
                    return (
                      <div
                        key={offer.id}
                        style={{
                          padding: 8,
                          fontSize: "0.8rem",
                          backgroundColor: isSelected ? "#e8f5e9" : "#fff",
                          border: isSelected ? "1px solid #2e7d32" : "1px solid #ddd",
                          borderRadius: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <div>
                          <strong>{offer.title}</strong>
                          <p style={{ margin: 0, color: "#666", fontSize: "0.75rem" }}>{offer.subtitle}</p>
                        </div>
                        {isSelected ? (
                          <button
                            type="button"
                            onClick={handleRemoveOffer}
                            style={{
                              padding: "2px 6px",
                              backgroundColor: "#d32f2f",
                              color: "#fff",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer"
                            }}
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectOffer(offer.id)}
                            disabled={isApplying || couponCode !== ""}
                            style={{
                              padding: "2px 6px",
                              backgroundColor: "#1976d2",
                              color: "#fff",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer"
                            }}
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="flight-check-row" style={{ marginTop: 15 }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(event) => setAgreedToTerms(event.target.checked)}
              />
              <span>I accept fare rules, cancellation policy, and passenger details are correct.</span>
            </label>

            {formError && (
              <p className="flight-flow-error">
                <Info size={14} />
                {formError}
              </p>
            )}

            <button type="button" className="flight-primary-btn" onClick={handleContinue} style={{ marginTop: 10 }}>
              Continue to Payment
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}
