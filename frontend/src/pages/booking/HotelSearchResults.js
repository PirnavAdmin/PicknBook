import React, { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Building2,
  Coffee,
  IndianRupee,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Wifi,
  Loader2,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toDisplayDate } from "../../utils/apiDateFormat";
import { searchHotels, getOfferDetails } from "../../services/hotelBookingService";
import { writeHotelBookingFlowState } from "./hotelBookingFlowStore";
import "../../STYLES/HotelSearchResults.css";

const HOTEL_PROMO_ITEMS = [
  { id: "breakfast", icon: Coffee, title: "Breakfast Picks", text: "Scan meal-ready stays" },
  { id: "wifi", icon: Wifi, title: "Work Ready", text: "Wi-Fi and desk-friendly rooms" },
  { id: "secure", icon: ShieldCheck, title: "Clear Policies", text: "Review cancellation notes" },
  { id: "rooms", icon: BedDouble, title: "Room Choices", text: "Compare comfort levels" },
];

// Dynamic hotel offerings integrated from Amadeus API

function readValue(params, state, key, fallback = "") {
  const queryValue = params.get(key);

  if (typeof queryValue === "string" && queryValue.trim()) {
    return queryValue.trim();
  }

  const stateValue = state?.[key];
  return typeof stateValue === "string" && stateValue.trim()
    ? stateValue.trim()
    : fallback;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function HotelSearchResults() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};

  const destination = readValue(searchParams, state, "destination", "Hyderabad");
  const checkInDate = readValue(searchParams, state, "checkInDate", "");
  const checkOutDate = readValue(searchParams, state, "checkOutDate", "");
  const rooms = readValue(searchParams, state, "rooms", "1");
  const adults = readValue(searchParams, state, "adults", "2");
  const guests = readValue(
    searchParams,
    state,
    "guests",
    `${rooms} Room${Number(rooms) > 1 ? "s" : ""}, ${adults} Adult${Number(adults) > 1 ? "s" : ""}`,
  );

  const [sortKey, setSortKey] = useState("recommended");
  const [apiHotels, setApiHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedHotelId, setExpandedHotelId] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    async function fetchHotelResults() {
      setLoading(true);
      setError("");
      try {
        const data = await searchHotels({
          city: destination,
          checkInDate,
          checkOutDate,
          adults: Number(adults) || 2,
          rooms: Number(rooms) || 1
        });
        if (isCurrent) {
          setApiHotels(data || []);
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.message || "Failed to search hotels. Please try again.");
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    fetchHotelResults();

    return () => {
      isCurrent = false;
    };
  }, [destination, checkInDate, checkOutDate, adults, rooms]);

  const hotels = useMemo(() => {
    return [...apiHotels].map((h) => {
      const firstOffer = h.offers?.[0] || {};
      const basePrice = Number(firstOffer.price || 0);
      const hotelName = h.name || "Hotel stay";
      return {
        id: h.hotelId || `hotel-${String(hotelName).toLowerCase().replace(/\s+/g, "-")}`,
        hotelId: h.hotelId,
        name: hotelName,
        city: h.cityCode || destination,
        area: h.address ? h.address.split(",")[0] : "City Centre",
        address: h.address,
        rating: h.rating || 4.5,
        tag: h.tag || (h.rating >= 4.7 ? "Premium stay" : h.rating >= 4.5 ? "City favorite" : "Value stay"),
        price: basePrice,
        oldPrice: Math.round(basePrice * 1.25),
        amenities: h.amenities || ["Wi-Fi", "Breakfast"],
        note: firstOffer.cancellationPolicy || "Flexible cancellation available on select rooms.",
        offers: h.offers || []
      };
    }).sort((a, b) => {
      if (sortKey === "price") return a.price - b.price;
      if (sortKey === "rating") return b.rating - a.rating;
      return b.rating * 100 - b.price / 100 - (a.rating * 100 - a.price / 100);
    });
  }, [apiHotels, sortKey, destination]);

  const handleSelectOffer = async (hotel, offer) => {
    setLoading(true);
    setError("");
    try {
      const offerDetails = await getOfferDetails(offer.offerId);
      const selectedOffer = {
        ...offer,
        ...offerDetails,
        checkInDate: offerDetails?.checkInDate || offer.checkInDate || checkInDate,
        checkOutDate: offerDetails?.checkOutDate || offer.checkOutDate || checkOutDate,
      };
      
      writeHotelBookingFlowState({
        hotel: {
          hotelId: hotel.hotelId,
          name: hotel.name,
          city: hotel.city,
          area: hotel.area,
          address: hotel.address,
          rating: hotel.rating,
          tag: hotel.tag,
          amenities: hotel.amenities
        },
        offer: selectedOffer,
        searchContext: {
          destination,
          checkInDate,
          checkOutDate,
          adults,
          rooms,
          guests
        }
      });
      
      navigate("/hotel/passenger-details");
    } catch (err) {
      setError(err.message || "Failed to fetch offer details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`hotel-results-page${loading ? " is-loading" : ""}`}>
      {loading && (
        <section className="hotel-loading-screen" aria-live="polite" aria-busy="true">
          <div className="hotel-sonar-animation">
              <svg viewBox="0 0 1000 500" className="hotel-sonar-svg" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="hotelSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f0fdf4" />
                    <stop offset="50%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e0f2fe" />
                  </linearGradient>
                  <linearGradient id="hotelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#dc1e26" />
                    <stop offset="100%" stopColor="#b8141b" />
                  </linearGradient>
                  <radialGradient id="sonarPulse" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#dc1e26" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="#dc1e26" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#dc1e26" stopOpacity="0" />
                  </radialGradient>
                  <filter id="hotelGlow"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>


                {/* Sun & Clouds */}
                <circle cx="850" cy="90" r="40" fill="#fef08a" opacity="0.8" />
                <circle cx="850" cy="90" r="25" fill="#fde047" opacity="0.9" />

                <g className="hotel-cloud hotel-cloud-1" opacity="0.4">
                  <ellipse cx="200" cy="90" rx="60" ry="18" fill="#fff" />
                  <circle cx="180" cy="78" r="22" fill="#fff" />
                  <circle cx="215" cy="80" r="20" fill="#fff" />
                </g>
                <g className="hotel-cloud hotel-cloud-2" opacity="0.3">
                  <ellipse cx="600" cy="70" rx="50" ry="15" fill="#fff" />
                  <circle cx="585" cy="60" r="18" fill="#fff" />
                </g>

                {/* Mountains background */}
                <polygon points="0,420 180,280 380,380 580,240 760,350 920,260 1000,340 1000,500 0,500" fill="#f1f5f9" opacity="0.5" />
                <polygon points="0,450 220,320 440,410 680,290 880,380 1000,310 1000,500 0,500" fill="#e2e8f0" opacity="0.4" />

                {/* Ground */}
                <rect x="0" y="440" width="1000" height="60" fill="#cbd5e1" opacity="0.6" />

                {/* Stylized hotel resort graphic inside the SVG */}
                <g className="hotel-building-graphic" transform="translate(360, 210)" filter="url(#hotelGlow)">
                  {/* Left wing */}
                  <rect x="20" y="70" width="60" height="160" rx="3" fill="#ffffff" stroke="#b8141b" strokeWidth="2.5" />
                  {/* Main tower */}
                  <rect x="90" y="30" width="100" height="200" rx="4" fill="#ffffff" stroke="#b8141b" strokeWidth="3" />
                  {/* Right wing */}
                  <rect x="200" y="90" width="60" height="140" rx="3" fill="#ffffff" stroke="#b8141b" strokeWidth="2.5" />

                  {/* Windows left wing */}
                  {Array.from({ length: 4 }).map((_, r) =>
                    Array.from({ length: 2 }).map((_, c) => (
                      <rect key={`wl-${r}-${c}`} x={32 + c * 20} y={85 + r * 32} width="8" height="12" rx="1.5" fill="#fde047" className="hotel-window-light" style={{ animationDelay: `${(r * 2 + c) * 0.2}s` }} />
                    ))
                  )}

                  {/* Windows main tower */}
                  {Array.from({ length: 5 }).map((_, r) =>
                    Array.from({ length: 3 }).map((_, c) => (
                      <rect key={`wm-${r}-${c}`} x={108 + c * 28} y={48 + r * 32} width="10" height="15" rx="1.5" fill="#fde047" className="hotel-window-light" style={{ animationDelay: `${(r * 3 + c) * 0.15}s` }} />
                    ))
                  )}

                  {/* Windows right wing */}
                  {Array.from({ length: 3 }).map((_, r) =>
                    Array.from({ length: 2 }).map((_, c) => (
                      <rect key={`wr-${r}-${c}`} x={212 + c * 20} y={105 + r * 32} width="8" height="12" rx="1.5" fill="#fde047" className="hotel-window-light" style={{ animationDelay: `${(r * 2 + c) * 0.35}s` }} />
                    ))
                  )}

                  {/* Entrance canopy */}
                  <path d="M 82 230 L 100 215 L 180 215 L 198 230 Z" fill="url(#hotelGrad)" />
                  <rect x="115" y="215" width="50" height="15" fill="#ffffff" opacity="0.9" />

                  {/* Dynamic Sonar scanning pulses centering around the hotel building */}
                  <circle cx="140" cy="120" r="10" fill="none" stroke="#dc1e26" strokeWidth="2" className="sonar-ring sonar-ring-1" />
                  <circle cx="140" cy="120" r="10" fill="none" stroke="#dc1e26" strokeWidth="2" className="sonar-ring sonar-ring-2" />
                  <circle cx="140" cy="120" r="10" fill="none" stroke="#dc1e26" strokeWidth="2" className="sonar-ring sonar-ring-3" />
                  
                  {/* Destination Marker over the hotel building */}
                  <g className="hotel-pin" transform="translate(140, 100)">
                    <path d="M 0 0 C -12 -12 -12 -32 0 -32 C 12 -32 12 -12 0 0 Z" fill="url(#hotelGrad)" />
                    <circle cx="0" cy="-20" r="5" fill="#ffffff" />
                  </g>
                </g>

                {/* Palm trees next to hotel */}
                {[[300, 440], [670, 440]].map(([x, y], i) => (
                  <g key={`palm-${i}`} opacity="0.8">
                    <path d={`M ${x} ${y} Q ${x - 5} ${y - 40}, ${x - 10} ${y - 80}`} fill="none" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
                    <path d={`M ${x - 10} ${y - 80} Q ${x - 35} ${y - 95}, ${x - 45} ${y - 85}`} fill="none" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
                    <path d={`M ${x - 10} ${y - 80} Q ${x + 15} ${y - 95}, ${x + 25} ${y - 85}`} fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
                    <path d={`M ${x - 10} ${y - 83} Q ${x - 20} ${y - 105}, ${x - 25} ${y - 98}`} fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
                    <path d={`M ${x - 10} ${y - 83} Q ${x + 5} ${y - 105}, ${x + 10} ${y - 98}`} fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" />
                  </g>
                ))}
              </svg>
            </div>
        </section>
      )}
      <div className="hotel-results-shell">
        <section className="hotel-search-summary">
          <div className="hotel-promo-scroller">
            {HOTEL_PROMO_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <article className="hotel-promo-chip" key={item.id}>
                  <span className="hotel-promo-icon">
                    <Icon size={17} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hotel-search-card">
            <div className="hotel-route-part">
              <span>Destination</span>
              <strong>{destination}</strong>
            </div>
            <div className="hotel-route-part">
              <span>Check-in</span>
              <strong>{toDisplayDate(checkInDate) || "Today"}</strong>
            </div>
            <div className="hotel-route-part">
              <span>Check-out</span>
              <strong>{toDisplayDate(checkOutDate) || "Tomorrow"}</strong>
            </div>
            <div className="hotel-route-part">
              <span>Guests</span>
              <strong>{guests}</strong>
            </div>
            <button
              type="button"
              className="hotel-modify-btn"
              onClick={() => navigate("/?tab=hotels")}
            >
              Modify Search
            </button>
          </div>
        </section>

        <section className="hotel-results-layout">
          <aside className="hotel-filter-panel">
            <div className="hotel-filter-head">
              <span>Filters</span>
              <strong>{hotels.length} stays</strong>
            </div>
            <label>
              Sort by
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="price">Lowest price</option>
                <option value="rating">Highest rating</option>
              </select>
            </label>
            <div className="hotel-filter-note">
              <ShieldCheck size={16} />
              <span>Hotel data is live and integrated directly from the Amadeus Travel API.</span>
            </div>
          </aside>

          <section className="hotel-list-panel">
            <header className="hotel-list-head">
              <div>
                <span>Hotel Results</span>
                <h1>{loading ? "Searching" : hotels.length} stays in {destination}</h1>
              </div>
              <button type="button" onClick={() => navigate("/?tab=hotels")}>
                <Search size={15} />
                New search
              </button>
            </header>

            <div className="hotel-card-list">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <article className="hotel-result-card skeleton-pulse" key={idx} style={{ opacity: 0.7 }}>
                    <div className="hotel-result-art" style={{ background: "#e2e8f0" }}>
                      <Building2 size={38} style={{ color: "#cbd5e1" }} />
                    </div>
                    <div className="hotel-result-main">
                      <div className="hotel-result-title-row">
                        <div style={{ width: "100%" }}>
                          <div className="skeleton-title" style={{ background: "#cbd5e1", marginBottom: "8px" }}></div>
                          <div className="skeleton-text" style={{ background: "#e2e8f0", width: "40%" }}></div>
                        </div>
                      </div>
                      <div className="hotel-amenities">
                        <div className="skeleton-badge" style={{ background: "#e2e8f0" }}></div>
                        <div className="skeleton-badge" style={{ background: "#e2e8f0" }}></div>
                        <div className="skeleton-badge" style={{ background: "#e2e8f0" }}></div>
                      </div>
                      <div className="skeleton-text" style={{ background: "#e2e8f0", width: "80%", marginTop: "10px" }}></div>
                    </div>
                    <aside className="hotel-price-panel" style={{ background: "#ffffff" }}>
                      <div className="skeleton-text" style={{ background: "#e2e8f0", width: "50px" }}></div>
                      <div className="skeleton-title" style={{ background: "#cbd5e1", width: "80px", height: "28px" }}></div>
                      <div className="skeleton-badge" style={{ background: "#e2e8f0", width: "90px", height: "34px", marginTop: "10px" }}></div>
                    </aside>
                  </article>
                ))
              ) : error ? (
                <div className="hotel-error-state" style={{ padding: "40px", textAlign: "center", width: "100%" }}>
                  <p style={{ color: "#ef4444", marginBottom: "15px", fontWeight: "600" }}>{error}</p>
                  <button 
                    type="button" 
                    className="hotel-modify-btn" 
                    onClick={() => navigate("/?tab=hotels")}
                    style={{ margin: "0 auto" }}
                  >
                    Try Another Search
                  </button>
                </div>
              ) : hotels.length === 0 ? (
                <div className="hotel-empty-state" style={{ padding: "40px", textAlign: "center", width: "100%" }}>
                  <p style={{ color: "#64748b", marginBottom: "15px" }}>No hotels found for your selection.</p>
                  <button 
                    type="button" 
                    className="hotel-modify-btn" 
                    onClick={() => navigate("/?tab=hotels")}
                    style={{ margin: "0 auto" }}
                  >
                    Modify Search
                  </button>
                </div>
              ) : (
                hotels.map((hotel) => (
                  <div key={hotel.id} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <article className="hotel-result-card">
                      <div className="hotel-result-art">
                        <Building2 size={38} />
                        <span>{hotel.tag}</span>
                      </div>

                      <div className="hotel-result-main">
                        <div className="hotel-result-title-row">
                          <div>
                            <h2>{hotel.name}</h2>
                            <p>
                              <MapPin size={14} />
                              {hotel.area}, {hotel.city}
                            </p>
                          </div>
                          <span className="hotel-rating">
                            <Star size={14} fill="currentColor" />
                            {hotel.rating}
                          </span>
                        </div>

                        <div className="hotel-amenities">
                          {hotel.amenities.map((amenity) => (
                            <span key={amenity}>{amenity}</span>
                          ))}
                        </div>

                        <p className="hotel-result-note">{hotel.note}</p>
                      </div>

                      <aside className="hotel-price-panel">
                        <span>per night</span>
                        <strong>{formatCurrency(hotel.price)}</strong>
                        <small>{formatCurrency(hotel.oldPrice)}</small>
                        <button 
                          type="button" 
                          onClick={() => setExpandedHotelId(expandedHotelId === hotel.id ? null : hotel.id)}
                          style={{
                            background: expandedHotelId === hotel.id 
                              ? "linear-gradient(135deg, #475569, #1e293b)" 
                              : "linear-gradient(135deg, var(--hotel-primary), var(--hotel-cobalt))"
                          }}
                        >
                          <IndianRupee size={15} />
                          {expandedHotelId === hotel.id ? "Hide Rooms" : "Select Stay"}
                        </button>
                      </aside>
                    </article>

                    {expandedHotelId === hotel.id && (
                      <div className="hotel-offers-expanded" style={{
                        background: "rgba(255, 255, 255, 0.98)",
                        border: "1px solid var(--hotel-border)",
                        borderRadius: "16px",
                        padding: "16px",
                        boxShadow: "0 8px 24px rgba(12, 46, 51, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        animation: "fadeIn 0.3s ease"
                      }}>
                        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", margin: "0", color: "var(--hotel-text)" }}>
                          Available Rooms & Offers
                        </h3>
                        {hotel.offers && hotel.offers.length > 0 ? (
                          hotel.offers.map((offer) => (
                            <div key={offer.offerId} style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              background: "#f8fafc",
                              gap: "16px"
                            }}>
                              <div style={{ flex: "1" }}>
                                <h4 style={{ fontSize: "0.88rem", fontWeight: "700", margin: "0 0 4px 0", color: "var(--hotel-text)" }}>
                                  {offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"} ({offer.bedType} Bed)
                                </h4>
                                <p style={{ fontSize: "0.8rem", margin: "0 0 6px 0", color: "var(--hotel-muted)" }}>
                                  {offer.roomDescription || "Standard comfort rooms"}
                                </p>
                                <span style={{
                                  fontSize: "0.74rem",
                                  color: "var(--hotel-primary-strong)",
                                  background: "rgba(0,155,143,0.08)",
                                  padding: "3px 8px",
                                  borderRadius: "999px",
                                  fontWeight: "750"
                                }}>
                                  {offer.cancellationPolicy || "Free cancellation"}
                                </span>
                              </div>
                              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                                <strong style={{ fontSize: "1.25rem", color: "var(--hotel-text)" }}>
                                  {formatCurrency(offer.price)}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => handleSelectOffer(hotel, offer)}
                                  style={{
                                    background: "linear-gradient(135deg, var(--hotel-primary), var(--hotel-cobalt))",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "6px 16px",
                                    fontSize: "0.82rem",
                                    fontWeight: "800",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
                                  }}
                                >
                                  Book Room
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: "0.82rem", color: "var(--hotel-muted)", margin: "0" }}>
                            No active offers found for this property on selected dates.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
