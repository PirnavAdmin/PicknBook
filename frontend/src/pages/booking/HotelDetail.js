/* eslint-disable */
import React from "react";
import { BedDouble, ShieldCheck, Loader2 } from "lucide-react";

const getViewSymbol = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("skyline") || lower.includes("city")) return "🏙️";
  if (lower.includes("garden") || lower.includes("lawn") || lower.includes("green") || lower.includes("park")) return "🏡";
  if (lower.includes("terrace") || lower.includes("roof") || lower.includes("landmark")) return "🌅";
  if (lower.includes("balcony") || lower.includes("patio")) return "🚪";
  return "👁️";
};

const getDiningSymbol = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("breakfast") || lower.includes("egg")) return "🍳";
  if (lower.includes("coffee") || lower.includes("tea") || lower.includes("cafe")) return "☕";
  if (lower.includes("restaurant") || lower.includes("dining")) return "🍽️";
  if (lower.includes("bar") || lower.includes("lounge") || lower.includes("drink")) return "🍹";
  return "🍴";
};

const getAttractionSymbol = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("airport") || lower.includes("flight")) return "✈️";
  if (lower.includes("metro") || lower.includes("subway") || lower.includes("train") || lower.includes("railway") || lower.includes("station")) return "🚇";
  if (lower.includes("beach") || lower.includes("lake") || lower.includes("sea") || lower.includes("pool")) return "🏖️";
  if (lower.includes("temple") || lower.includes("church") || lower.includes("mosque")) return "⛩️";
  if (lower.includes("mall") || lower.includes("shop") || lower.includes("market")) return "🛍️";
  return "📍";
};

const getGeneralSymbol = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("wi-fi") || lower.includes("internet") || lower.includes("wifi")) return "📶";
  if (lower.includes("air condition") || lower.includes("ac") || lower.includes("cooling")) return "❄️";
  if (lower.includes("pool") || lower.includes("swim")) return "🏊";
  if (lower.includes("gym") || lower.includes("fitness") || lower.includes("exercise")) return "🏋️";
  if (lower.includes("parking") || lower.includes("car")) return "🅿️";
  if (lower.includes("service") || lower.includes("bell") || lower.includes("desk") || lower.includes("reception")) return "🛎️";
  return "✓";
};

export default function HotelDetail({
  hotel,
  offer,
  roomsCount,
  selectedMultiRooms,
  selectingOfferId,
  handleSelectOffer,
  formatCurrency,
  formatNightLabel,
  toDisplayDate,
  checkInDate,
  checkOutDate,
  guestSummary,
  basePrice,
  tax,
  finalPayable,
  convenienceFee,
  setCurrentStep,
  gallery,
  activeImageTab,
  setActiveImageTab,
  displayedImages,
  stayLocation,
  stayFacts,
  stayHighlights,
  visuals,
  nights
}) {

  const amenities = Array.isArray(hotel.amenities)
    ? hotel.amenities
    : (typeof hotel.amenities === "string" ? hotel.amenities.split(",").map(a => a.trim()) : []);

  // Parse amenities dynamically based on API data
  const views = [];
  const dining = [];
  const attractions = [];
  const general = [];

  amenities.forEach(item => {
    const val = String(item).trim();
    if (!val) return;

    if (/view|balcony|terrace|garden|window|exterior|skyline|patio/i.test(val)) {
      views.push(val);
    } else if (/restaurant|breakfast|dining|bar|coffee|food|lounge|cafe|kitchen|tea|meal|chef/i.test(val)) {
      dining.push(val);
    } else if (/airport|metro|station|transit|shuttle|transfer|beach|lake|temple|attraction|museum|park|mall|market/i.test(val)) {
      attractions.push(val);
    } else {
      general.push(val);
    }
  });

  // Dynamically filter tab buttons based on available categories
  const tabsList = ["All"];
  if (hotel.offers && hotel.offers.length > 0) tabsList.push("Rooms");
  if (views.length > 0) tabsList.push("Property Views");
  if (general.length > 0) tabsList.push("Facilities");
  if (dining.length > 0) tabsList.push("Dining");
  if (attractions.length > 0) tabsList.push("Nearby Attractions");

  const scrollToSection = (sectionId) => {
    if (sectionId === "All") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const element = document.getElementById(`section-${sectionId.toLowerCase().replace(/\s+/g, "-")}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Category Image Tabs */}
      <div className="hotel-category-tabs" style={{ padding: "4px 8px", marginBottom: "12px", gap: "8px" }}>
        {tabsList.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`hotel-category-tab-btn${activeImageTab === tab ? " is-active" : ""}`}
            style={{ fontSize: "0.78rem", padding: "4px 10px", minHeight: "28px" }}
            onClick={() => {
              setActiveImageTab(tab);
              scrollToSection(tab);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Top Section: Left Details & Right Image side-by-side in one line */}
      <section style={{ 
        display: "grid", 
        gridTemplateColumns: `1fr ${displayedImages.length > 1 ? "240px" : "180px"}`, 
        gap: "16px", 
        marginBottom: "16px",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: "16px",
        padding: "10px 12px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
        alignItems: "center"
      }}>
        {/* Left Side: Hotel Details */}
        <div style={{ padding: "4px" }}>
          <span style={{ 
            textTransform: "uppercase", 
            fontSize: "0.62rem", 
            fontWeight: 600, 
            color: "var(--hotel-rose)", 
            background: "rgba(220,30,38,0.05)", 
            padding: "3px 8px", 
            borderRadius: "4px", 
            display: "inline-block", 
            letterSpacing: "0.5px" 
          }}>
            {visuals.propertyLabel || "PREMIUM STAY"}
          </span>
          <h1 style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--hotel-ink)", margin: "6px 0 4px 0", lineHeight: "1.25" }}>{hotel.name}</h1>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "0.75rem", color: "var(--hotel-muted)", margin: "0 0 6px 0" }}>
            {hotel.rating > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <span style={{ color: "#ffb000" }}>★</span> <strong style={{ fontWeight: 600 }}>{Number(hotel.rating).toFixed(1)}</strong>
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>📍 {stayLocation}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>📅 {formatNightLabel(nights)}</span>
          </div>
          
          <p style={{ margin: "0 0 8px 0", fontSize: "0.72rem", color: "var(--hotel-muted)", fontWeight: 400 }}>
            Stay in {hotel.city || "New Delhi"}
          </p>

          {/* Pricing display at the top */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--hotel-muted)" }}>Starting from</span>
            <strong style={{ fontSize: "1.1rem", color: "#10b981", fontWeight: 700 }}>
              {offer ? formatCurrency(finalPayable) : (hotel.price ? formatCurrency(hotel.price) : (hotel.offers?.[0]?.price ? formatCurrency(hotel.offers[0].price) : ""))}
            </strong>
            <span style={{ fontSize: "0.68rem", color: "var(--hotel-muted)" }}>/ night</span>
          </div>
        </div>

        {/* Right Side: Equal-sized Image Containers */}
        <div style={{
          width: "100%",
          height: "90px",
          display: "grid",
          gap: "6px",
          gridTemplateColumns: `repeat(${Math.min(4, displayedImages.length)}, 1fr)`
        }}>
          {displayedImages.slice(0, Math.min(4, displayedImages.length)).map((imgUrl, index) => {
            const maxVisible = Math.min(4, displayedImages.length);
            const isLast = index === maxVisible - 1 && displayedImages.length > 4;
            const extraCount = displayedImages.length - 4;
            return (
              <div key={index} style={{ position: "relative", width: "100%", height: "100%", borderRadius: "10px", overflow: "hidden" }}>
                <img src={imgUrl} alt={`${hotel.name} - ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {isLast && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    borderRadius: "10px"
                  }}>
                    +{extraCount} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-Column Checkout/Detail Layout */}
      <div className="hotel-checkout-layout">
        {/* Left Column Content */}
        <div className="hotel-checkout-main">

          {/* Host Panel */}
          <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ 
              width: "32px", 
              height: "32px", 
              borderRadius: "50%", 
              background: "rgba(220,30,38,0.05)", 
              color: "var(--hotel-rose)", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              fontSize: "0.9rem", 
              fontWeight: 600 
            }}>
              {visuals.hostName ? visuals.hostName.slice(0, 1) : "H"}
            </div>
            <div>
              <h2 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--hotel-ink)", margin: "0 0 1px 0" }}>Hosted by {visuals.hostName || "Hotel Host"}</h2>
              <p style={{ fontSize: "0.74rem", color: "var(--hotel-muted)", margin: 0 }}>Superhost style service · {visuals.hostYears || 2} years hosting · Curated for short city stays.</p>
            </div>
          </section>

          {/* Highlights Panel */}
          <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px", marginBottom: "12px" }}>
            <div style={{ marginBottom: "8px" }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--hotel-ink)", margin: "0 0 1px 0" }}>What makes this stay feel easy</h2>
              <p style={{ fontSize: "0.74rem", color: "var(--hotel-muted)", margin: 0 }}>These highlights are built from the live hotel record and details.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {stayHighlights.map((highlight) => (
                <article key={highlight.title} style={{ 
                  display: "flex", 
                  gap: "10px", 
                  alignItems: "center", 
                  padding: "8px 10px", 
                  border: "1px solid rgba(220,30,38,0.08)", 
                  borderRadius: "10px", 
                  background: "#ffffff" 
                }}>
                  <span style={{ 
                    width: "24px", 
                    height: "24px", 
                    borderRadius: "50%", 
                    background: "#fff5f2", 
                    color: "#ff6b4a", 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    fontSize: "0.85rem", 
                    flexShrink: 0 
                  }}>
                    ✨
                  </span>
                  <div>
                    <strong style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--hotel-ink)", margin: "0 0 1px 0" }}>{highlight.title}</strong>
                    <p style={{ fontSize: "0.7rem", color: "var(--hotel-muted)", margin: 0, lineHeight: "1.3" }}>{highlight.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Property Views Section (Rendered dynamically if available in API data) */}
          {views.length > 0 && (
            <section id="section-property-views" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px", marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Property Views</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                {views.map((item, idx) => (
                  <div key={idx} style={{ fontSize: "0.82rem", color: "var(--hotel-ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.95rem" }}>{getViewSymbol(item)}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Property Amenities & Facilities (Rendered dynamically if available in API data) */}
          {general.length > 0 && (
            <section id="section-facilities" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px", marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Property Amenities &amp; Facilities</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {general.slice(0, 12).map((item, idx) => (
                  <div key={idx} style={{ fontSize: "0.78rem", color: "var(--hotel-ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.9rem" }}>{getGeneralSymbol(item)}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Dining Section (Rendered dynamically if available in API data) */}
          {dining.length > 0 && (
            <section id="section-dining" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px", marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Dining &amp; Culinary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                {dining.map((item, idx) => (
                  <div key={idx} style={{ fontSize: "0.82rem", color: "var(--hotel-ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.95rem" }}>{getDiningSymbol(item)}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Nearby Attractions Section (Rendered dynamically if available in API data) */}
          {attractions.length > 0 && (
            <section id="section-nearby-attractions" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px", marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Nearby Attractions</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                {attractions.map((item, idx) => (
                  <div key={idx} style={{ fontSize: "0.82rem", color: "var(--hotel-ink)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.95rem" }}>{getAttractionSymbol(item)}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Available Rooms & Rates List */}
          <section id="section-rooms" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px", marginBottom: "12px" }}>
            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 2px 0", fontSize: "1.05rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Available rooms &amp; rates</h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--hotel-muted)" }}>
                {roomsCount > 1 
                  ? `Select Room ${selectedMultiRooms.length + 1} of ${roomsCount} to begin your reservation.` 
                  : `Select a room type to begin your reservation. Rates are live.`}
              </p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {hotel.offers && hotel.offers.length > 0 ? (
                hotel.offers.map((roomOffer, roomIndex) => {
                  const isSelectingThis = selectingOfferId === roomOffer.offerId;
                  const isSelected = offer && offer.offerId === roomOffer.offerId;
                  const roomImg = hotel.images && hotel.images.length > 0 
                    ? hotel.images[roomIndex % hotel.images.length] 
                    : gallery[roomIndex % gallery.length];
                  
                  return (
                    <div 
                      key={roomOffer.offerId} 
                      style={{ 
                        display: "grid", 
                        gridTemplateColumns: "110px 1fr 160px", 
                        gap: "16px", 
                        padding: "12px", 
                        border: isSelected ? "2px solid #dc1e26" : "1px solid rgba(0,0,0,0.06)", 
                        borderRadius: "16px", 
                        background: isSelected ? "rgba(220,30,38,0.06)" : "#fff",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.01)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ width: "100%", height: "85px", borderRadius: "10px", overflow: "hidden" }}>
                        <img src={roomImg} alt={roomOffer.roomCategory} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ 
                            display: "inline-block", 
                            background: "rgba(220,30,38,0.05)", 
                            color: "var(--hotel-rose)", 
                            fontSize: "0.6rem", 
                            fontWeight: 600, 
                            padding: "2px 6px", 
                            borderRadius: "4px", 
                            textTransform: "uppercase", 
                            marginBottom: "4px" 
                          }}>
                            ROOM OPTION
                          </span>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "0.92rem", fontWeight: 600, color: "var(--hotel-ink)" }}>
                            {roomOffer.roomCategory ? roomOffer.roomCategory.replace(/_/g, " ") : "Standard Room"}
                          </h4>
                          {roomOffer.roomDescription && (
                            <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--hotel-muted)", lineHeight: "1.3" }}>
                              {roomOffer.roomDescription}
                            </p>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px", alignItems: "center" }}>
                          <span style={{ fontSize: "0.74rem", color: "var(--hotel-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                            <BedDouble size={12} /> {roomOffer.bedType || "Double"} bed
                          </span>
                          <span style={{ 
                            fontSize: "0.68rem", 
                            fontWeight: 600, 
                            padding: "1px 6px", 
                            borderRadius: "4px", 
                            background: roomOffer.cancellationPolicy?.includes("Charge") ? "#ffebee" : "#e8f5e9", 
                            color: roomOffer.cancellationPolicy?.includes("Charge") ? "#d32f2f" : "#2e7d32" 
                          }}>
                            {roomOffer.cancellationPolicy?.includes("Charge") ? "Non-Refundable" : "Free Cancellation"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", borderLeft: "1px solid rgba(0,0,0,0.06)", paddingLeft: "12px" }}>
                        <div style={{ textAlign: "right", marginBottom: "8px" }}>
                          <strong style={{ display: "block", fontSize: "1.1rem", color: "var(--hotel-ink)" }}>{formatCurrency(roomOffer.price)}</strong>
                          <span style={{ fontSize: "0.7rem", color: "var(--hotel-muted)" }}>
                            {roomsCount > 1 ? `total for ${roomsCount} Rooms` : "total per night"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectOffer(roomOffer)}
                          disabled={selectingOfferId !== ""}
                          style={{
                            width: "100%",
                            height: "32px",
                            borderRadius: "8px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            background: isSelected ? "var(--hotel-rose)" : "#546e7a",
                            color: "#fff",
                            border: "none",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {isSelectingThis ? (
                            <>
                              <Loader2 size={11} className="hotel-spin" />
                              {" "}Choosing...
                            </>
                          ) : isSelected ? (
                            "Selected ✓"
                          ) : (
                            "Choose room"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--hotel-muted)" }}>
                  <p>No active rooms returned for the selected dates. Please search for different dates.</p>
                </div>
              )}
            </div>
          </section>

          {/* Location Map Section */}
          {hotel.address && (
            <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px" }}>
              <div style={{ marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Location</h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--hotel-muted)", fontSize: "0.78rem" }}>📍 {hotel.address}</p>
              </div>
              <div style={{ position: "relative", width: "100%", height: "240px", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--hotel-border)" }}>
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(hotel.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Hotel Map View"
                />
              </div>
            </section>
          )}
        </div>

        {/* Right Column Booking Sidebar */}
        <aside className="hotel-reserve-rail">
          <div className="hotel-reserve-card hotel-your-stay-card" style={{ position: "sticky", top: "20px", background: "var(--hotel-surface)", borderRadius: "24px", border: "1px solid var(--hotel-border)", padding: "24px", boxShadow: "var(--hotel-shadow)" }}>
            <div className="hotel-your-stay-header" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "14px", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--hotel-ink)" }}>YOUR STAY</h3>
            </div>

            {/* Check-in and Check-out Date row (flexbox layout prevents overlapping) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "10px 12px", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.04)", marginBottom: "16px" }}>
              <div style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>Check-in</span>
                <strong style={{ display: "block", fontSize: "0.82rem", color: "var(--hotel-ink)", marginTop: "2px" }}>
                  {checkInDate ? toDisplayDate(String(checkInDate).split("T")[0]) : "Select date"}
                </strong>
                <span style={{ fontSize: "0.64rem", color: "var(--hotel-muted)", display: "block", marginTop: "1px" }}>From 2:00 PM</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px", borderLeft: "1px solid rgba(0,0,0,0.06)", borderRight: "1px solid rgba(0,0,0,0.06)", minWidth: "60px" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--hotel-muted)" }}>➔</span>
                <span style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "20px", padding: "2px 6px", fontSize: "0.58rem", fontWeight: 700, color: "var(--hotel-ink)", marginTop: "2px", whiteSpace: "nowrap" }}>
                  {nights} {nights > 1 ? "Nights" : "Night"}
                </span>
              </div>

              <div style={{ flex: 1, paddingLeft: "8px", textAlign: "right" }}>
                <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>Check-out</span>
                <strong style={{ display: "block", fontSize: "0.82rem", color: "var(--hotel-ink)", marginTop: "2px" }}>
                  {checkOutDate ? toDisplayDate(String(checkOutDate).split("T")[0]) : "Select date"}
                </strong>
                <span style={{ fontSize: "0.64rem", color: "var(--hotel-muted)", display: "block", marginTop: "1px" }}>Before 11:00 AM</span>
              </div>
            </div>

            {/* Guest dropdown preview */}
            <div style={{ border: "1px solid rgba(0,0,0,0.06)", borderRadius: "14px", padding: "12px", background: "#f8fafc", marginBottom: "16px" }}>
              <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>GUESTS & ROOMS</span>
              <strong style={{ display: "block", fontSize: "0.82rem", color: "var(--hotel-ink)" }}>
                {guestSummary}
              </strong>
            </div>

            {offer ? (
              <>
                <div style={{ border: "1px solid rgba(0,0,0,0.06)", borderRadius: "14px", padding: "12px", background: "#f8fafc", marginBottom: "16px" }}>
                  <span style={{ display: "block", fontSize: "0.68rem", color: "var(--hotel-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>Selected Room Type</span>
                  <strong style={{ display: "block", fontSize: "0.82rem", color: "var(--hotel-ink)" }}>
                    {offer.roomCategory ? offer.roomCategory.replace(/_/g, " ") : "Standard Room"}
                  </strong>
                </div>

                <div className="hotel-fare-breakdown" style={{ display: "flex", flexDirection: "column", gap: "10px", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "14px", marginBottom: "14px" }}>
                  <div className="hotel-fare-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--hotel-muted)" }}>
                    <span>Room charges ({formatNightLabel(nights)})</span>
                    <strong style={{ color: "var(--hotel-ink)" }}>{formatCurrency(basePrice)}</strong>
                  </div>
                  <div className="hotel-fare-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--hotel-muted)" }}>
                    <span>Taxes and GST (12%)</span>
                    <strong style={{ color: "var(--hotel-ink)" }}>{formatCurrency(tax)}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--hotel-ink)" }}>Total Price</span>
                  <strong style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10b981" }}>{formatCurrency(finalPayable)}</strong>
                </div>
              </>
            ) : (
              <div style={{ padding: "12px", border: "1.5px dashed #cbd5e1", borderRadius: "14px", background: "#fafafa", textAlign: "center", marginBottom: "16px", color: "var(--hotel-muted)", fontSize: "0.78rem" }}>
                Choose an available room option from the list to display pricing details.
              </div>
            )}

            {/* Proceed Button */}
            <button
              type="button"
              className="booking-btn-filled"
              disabled={!offer}
              onClick={() => setCurrentStep(2)}
              style={{
                width: "100%",
                height: "46px",
                borderRadius: "12px",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: offer ? "pointer" : "not-allowed",
                background: offer ? "var(--hotel-rose)" : "#cbd5e1",
                border: "none",
                color: "#fff"
              }}
            >
              PROCEED
            </button>

            {/* Free Cancellation Note */}
            <div className="hotel-stay-assurance-note" style={{ display: "flex", gap: "8px", alignItems: "center", padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", color: "#166534", fontSize: "0.76rem", marginTop: "16px" }}>
              <ShieldCheck size={16} />
              <span><strong>Free Cancellation</strong> before {toDisplayDate(checkInDate ? String(checkInDate).split("T")[0] : "")}, 12:00 PM</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
