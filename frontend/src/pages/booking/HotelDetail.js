/* eslint-disable */
import React, { useEffect, useState } from "react";
import { BedDouble, ShieldCheck, Loader2 } from "lucide-react";
import { categorizeFacilities } from "../../utils/facilityCategories";
import RoomCategoryAccordion from "../../components/booking/RoomCategoryAccordion";

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
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [openDescIndex, setOpenDescIndex] = useState(-1);
  const [showAllDesc, setShowAllDesc] = useState(false);

  const [savedStayIds, setSavedStayIds] = useState(() => {
    try {
      const saved = localStorage.getItem("savedStayIds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const hotelId = hotel.id || hotel.code;
  const isFavourite = savedStayIds.includes(hotelId);

  const toggleFavourite = () => {
    setSavedStayIds((current) => {
      const next = current.includes(hotelId)
        ? current.filter(id => id !== hotelId)
        : [...current, hotelId];
      localStorage.setItem("savedStayIds", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (lightboxIndex === null) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowRight") {
        setLightboxIndex((current) => (current + 1) % displayedImages.length);
      }
      if (event.key === "ArrowLeft") {
        setLightboxIndex((current) => (current - 1 + displayedImages.length) % displayedImages.length);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, displayedImages.length]);

  const rawAmenities = Array.isArray(hotel.amenities)
    ? hotel.amenities
    : (typeof hotel.amenities === "string" ? hotel.amenities.split(",").map(a => a.trim()) : []);

  const amenities = rawAmenities
    .map((item) => {
      if (!item) return "";
      if (typeof item === "object" && item !== null) {
        return String(item.name || item.Name || item.title || "").trim();
      }
      const s = String(item).trim();
      return s === "[object Object]" ? "" : s;
    })
    .filter(Boolean);

  // Parse amenities dynamically based on static mapping
  const categorized = categorizeFacilities(amenities);
  const views = categorized.views || [];
  const dining = categorized.dining || [];
  const general = [...(categorized.amenities || []), ...(categorized.safety || [])];
  
  // Only use real attractions array from API
  const attractions = Array.isArray(hotel.attractions) 
    ? hotel.attractions.map(a => typeof a === "object" ? (a.name || a.Name || "") : String(a)).filter(Boolean)
    : [];

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

  const uniqueDescriptions = [];
  const seenTexts = new Set();
  
  if (Array.isArray(hotel.description)) {
    hotel.description.forEach(descGroup => {
      // Filter out descriptions named "Default", "Attractions", or that contain raw JSON strings
      if (descGroup.name === "Default" || descGroup.name === "Attractions") return;

      let textContent = "";
      if (Array.isArray(descGroup.detail)) {
        textContent = descGroup.detail.join(" ").trim();
      } else {
        textContent = String(descGroup.detail || "").trim();
      }
      
      // Also skip if it looks like raw JSON
      if (textContent.startsWith("{") && textContent.endsWith("}")) return;
      
      // Basic normalization to ignore minor whitespace differences
      const normalizedText = textContent.toLowerCase().replace(/\s+/g, ' ');
      
      if (normalizedText && !seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        uniqueDescriptions.push(descGroup);
      }
    });
  }

  return (
    <>
      {/* Category Image Tabs */}
      <div className="hotel-category-tabs" style={{ padding: "4px 8px", marginBottom: "4px", gap: "8px" }}>
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

      {/* Top Header: Title, Stars & Actions */}
      <section style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, color: "var(--hotel-ink)", margin: 0, lineHeight: "1.2" }}>
              {hotel.name}
            </h1>
            {hotel.rating > 0 && (
              <span style={{ color: "#ffb000", fontSize: "1.1rem" }}>
                {"★".repeat(Math.floor(hotel.rating))}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "var(--hotel-ink)", flexWrap: "wrap" }}>
            <span style={{ color: "#ff0000" }}>📍</span>
            <span>{stayLocation}</span>
            <a href="#section-map" onClick={(e) => { e.preventDefault(); const el = document.getElementById("section-map"); if(el) el.scrollIntoView({behavior: "smooth"}); }} style={{ color: "#ff0000", textDecoration: "none", fontWeight: 600, marginLeft: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              <img src="/location-pin.png" alt="Location" style={{ width: "18px", height: "18px", objectFit: "contain" }} /> Show in map
            </a>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button 
            onClick={toggleFavourite}
            style={{ background: "none", border: "none", color: "#ff0000", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "opacity 0.2s" }} 
            onMouseOver={e=>e.currentTarget.style.opacity=0.7} 
            onMouseOut={e=>e.currentTarget.style.opacity=1}
          >
            <span style={{ fontSize: "1.2rem", color: "#ff0000" }}>{isFavourite ? "♥" : "♡"}</span> {isFavourite ? "Added to Favourites" : "Add to Favourites"}
          </button>
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: hotel.name, url: window.location.href }).catch(console.error);
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
              }
            }}
            style={{ background: "none", border: "none", color: "#ff0000", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", transition: "opacity 0.2s" }} 
            onMouseOver={e=>e.currentTarget.style.opacity=0.7} 
            onMouseOut={e=>e.currentTarget.style.opacity=1}
          >
            <span style={{ fontSize: "1.2rem" }}>➦</span> Share
          </button>
        </div>
      </section>

      {/* Embedded CSS for Gallery */}
      <style>{`
        .hotel-gallery-grid {
          display: grid;
          grid-template-columns: ${hotel.offers && hotel.offers.length > 0 ? "2fr 1fr 340px" : "2fr 1fr"};
          gap: 12px;
          height: 400px;
          max-height: 400px;
          margin-bottom: 32px;
          position: relative;
        }
        .hotel-gallery-grid > div {
          min-height: 0;
          height: 100%;
        }
        @media (max-width: 900px) {
          .hotel-gallery-grid {
            grid-template-columns: 1fr;
            height: auto;
            max-height: none;
          }
          .hotel-gallery-middle {
            display: none !important;
          }
          .hotel-gallery-main-wrapper {
            height: 300px !important;
          }
          .hotel-deal-card {
            height: auto !important;
          }
        }
        
        .hotel-gallery-btn {
          width: 100%;
          height: 100%;
          padding: 0;
          border: 0;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          display: block;
        }
        .hotel-gallery-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
          display: block;
        }
        .hotel-gallery-btn img:hover {
          transform: scale(1.03);
        }
        .hotel-gallery-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0);
          transition: background 0.3s ease;
          border-radius: 12px;
          pointer-events: none;
        }
        .hotel-gallery-btn:hover::after {
          background: rgba(0,0,0,0.05);
        }
      `}</style>

      {/* Immersive Image Gallery (3 columns) */}
      <section className="hotel-gallery-grid">
        {/* Main Image (Left) */}
        {displayedImages.length > 0 && (
          <div className="hotel-gallery-main-wrapper" style={{ height: "100%", position: "relative" }}>
            <button type="button" onClick={() => setLightboxIndex(0)} className="hotel-gallery-btn">
              <img src={displayedImages[0]} alt={hotel.name} />
            </button>
          </div>
        )}
        
        {/* 2 Stacked Images (Middle) */}
        {displayedImages.length > 1 && (
          <div className="hotel-gallery-middle" style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "12px", height: "100%", minHeight: 0 }}>
            {displayedImages.slice(1, 3).map((imgUrl, index) => {
              const actualIndex = index + 1;
              const isLast = index === 1;
              const remainingCount = displayedImages.length - 3;
              
              return (
                <button key={actualIndex} type="button" onClick={() => setLightboxIndex(isLast ? 0 : actualIndex)} className="hotel-gallery-btn" style={{ minHeight: 0 }}>
                  <img src={imgUrl} alt={`${hotel.name} - ${actualIndex + 1}`} />
                  
                  {isLast && remainingCount > 0 && (
                    <div style={{ 
                      position: "absolute", 
                      inset: 0, 
                      background: "rgba(0,0,0,0.45)", 
                      color: "#fff", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      fontSize: "1.15rem", 
                      fontWeight: 700,
                      backdropFilter: "blur(2px)",
                      transition: "background 0.3s ease"
                    }}
                    onMouseOver={e=>e.currentTarget.style.background="rgba(0,0,0,0.55)"}
                    onMouseOut={e=>e.currentTarget.style.background="rgba(0,0,0,0.45)"}
                    >
                      +{remainingCount} Photos
                    </div>
                  )}
                  {isLast && remainingCount <= 0 && (
                     <div style={{ 
                      position: "absolute", 
                      inset: 0, 
                      background: "rgba(0,0,0,0.45)", 
                      color: "#fff", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      fontSize: "1.05rem", 
                      fontWeight: 700,
                      backdropFilter: "blur(2px)",
                      transition: "background 0.3s ease"
                    }}
                    onMouseOver={e=>e.currentTarget.style.background="rgba(0,0,0,0.55)"}
                    onMouseOut={e=>e.currentTarget.style.background="rgba(0,0,0,0.45)"}
                    >
                      See All Photos
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Recommended Deal Card (Right) */}
        {hotel.offers && hotel.offers.length > 0 && (
          <div className="hotel-deal-card" style={{ height: "100%", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", overflow: "hidden" }}>
            {/* Top image thumbnail */}
            <div style={{ height: "95px", borderRadius: "8px", overflow: "hidden", marginBottom: "10px", flexShrink: 0 }}>
              <img src={hotel.offers[0].images?.[0] || gallery[0] || displayedImages[0]} alt="Room thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexShrink: 0 }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#1d4ed8", background: "#eff6ff", padding: "3px 8px", borderRadius: "12px", border: "1px solid #bfdbfe" }}>
                Recommended Deal
              </span>
            </div>
            
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 8px 0", color: "var(--hotel-ink)", lineHeight: "1.2", flexShrink: 0 }}>
              {hotel.offers[0].roomCategory ? hotel.offers[0].roomCategory.replace(/_/g, " ") : "Standard Room"}
            </h3>
            
            {/* Amenities (can shrink and scroll if needed) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexGrow: 1, minHeight: 0, overflowY: "auto", paddingRight: "4px" }}>
              <div style={{ fontSize: "0.78rem", color: hotel.offers[0].cancellationPolicy?.includes("Charge") ? "#d32f2f" : "#2e7d32", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <span style={{ fontSize: "0.9rem", lineHeight: "1" }}>{hotel.offers[0].cancellationPolicy?.includes("Charge") ? "⊗" : "✓"}</span> 
                <span>{hotel.offers[0].cancellationPolicy?.includes("Charge") ? "Non-refundable" : "Free Cancellation"}</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--hotel-ink)", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <span style={{ fontSize: "0.9rem", lineHeight: "1", color: "#2e7d32" }}>✓</span> <span>Complimentary Wifi</span>
              </div>
              {(() => {
                const mealPlan = (Array.isArray(hotel.offers[0].servicesStatus) && hotel.offers[0].servicesStatus.find(s => s.name === "Meal Basis")?.value) || hotel.offers[0].hotelSupplements;
                if (!mealPlan || mealPlan.toLowerCase() === "room only") return null;
                return (
                  <div style={{ fontSize: "0.78rem", color: "var(--hotel-ink)", display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span style={{ fontSize: "0.9rem", lineHeight: "1", color: "#2e7d32" }}>✓</span> <span>Includes {mealPlan}</span>
                  </div>
                );
              })()}
            </div>
            
            {/* Price and Buttons (fixed at bottom) */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e2e8f0", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "2px" }}>
                <strong style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--hotel-ink)" }}>
                  {formatCurrency(hotel.offers[0].price)}
                </strong>
                {hotel.offers[0].originalPrice && (
                  <span style={{ fontSize: "0.8rem", color: "var(--hotel-muted)", textDecoration: "line-through" }}>
                    {formatCurrency(hotel.offers[0].originalPrice)}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.68rem", color: "var(--hotel-muted)", margin: "0 0 10px 0" }}>
                + taxes & fees, per night for 1 room
              </p>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  type="button" 
                  onClick={() => { handleSelectOffer(hotel.offers[0]); setCurrentStep(2); }}
                  style={{ flex: 1, background: "#ff0000", color: "#fff", border: "none", padding: "10px 4px", borderRadius: "8px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "background 0.2s" }}
                  onMouseOver={(e) => e.target.style.background = "#b91920"}
                  onMouseOut={(e) => e.target.style.background = "#ff0000"}
                >
                  Reserve 1 Room
                </button>
                <button 
                  type="button" 
                  onClick={() => scrollToSection("Rooms")}
                  style={{ flex: 1, background: "#fdf2f2", color: "#ff0000", border: "1px solid #ff0000", padding: "10px 4px", borderRadius: "8px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "background 0.2s" }}
                  onMouseOver={(e) => e.target.style.background = "#fce8e8"}
                  onMouseOut={(e) => e.target.style.background = "#fdf2f2"}
                >
                  View All Rooms
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {lightboxIndex !== null && displayedImages.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${hotel.name} photo gallery`}
          onClick={() => setLightboxIndex(null)}
          style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "rgba(15, 23, 42, 0.88)" }}
        >
          <button type="button" onClick={() => setLightboxIndex(null)} aria-label="Close gallery" style={{ position: "absolute", top: "18px", right: "22px", border: 0, background: "transparent", color: "#fff", fontSize: "2rem", cursor: "pointer" }}>×</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + displayedImages.length) % displayedImages.length); }} aria-label="Previous image" style={{ position: "absolute", left: "20px", border: 0, background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: "50%", width: "44px", height: "44px", fontSize: "1.8rem", cursor: "pointer" }}>‹</button>
          <img src={displayedImages[lightboxIndex]} alt={`${hotel.name} - ${lightboxIndex + 1}`} onClick={(event) => event.stopPropagation()} style={{ maxWidth: "min(100%, 1100px)", maxHeight: "82vh", objectFit: "contain", borderRadius: "12px", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }} />
          <button type="button" onClick={(event) => { event.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % displayedImages.length); }} aria-label="Next image" style={{ position: "absolute", right: "20px", border: 0, background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: "50%", width: "44px", height: "44px", fontSize: "1.8rem", cursor: "pointer" }}>›</button>
          <span style={{ position: "absolute", bottom: "20px", color: "#fff", fontSize: "0.9rem" }}>{lightboxIndex + 1} / {displayedImages.length}</span>
        </div>
      )}

      {/* Main Details Section */}
      <div style={{ maxWidth: "100%" }}>

          {/* About this hotel (Description) */}
          {hotel.description && hotel.description.length > 0 && (
            <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px", marginBottom: "12px" }}>
              <div style={{ marginBottom: "8px" }}>
                <h2 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--hotel-ink)", margin: "0 0 1px 0" }}>About this hotel</h2>
              </div>
              <div>
                {(showAllDesc ? uniqueDescriptions : uniqueDescriptions.slice(0, 3)).map((descGroup, idx) => {
                  const isOpen = openDescIndex === idx;
                  const title = descGroup.name && descGroup.name !== "Overview" ? descGroup.name : "Overview";
                  return (
                  <div key={idx} style={{ marginBottom: "8px", border: "1px solid #f1f5f9", borderRadius: "12px", overflow: "hidden" }}>
                    <button 
                      type="button"
                      onClick={() => setOpenDescIndex(isOpen ? -1 : idx)}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: isOpen ? "#f8fafc" : "#fff", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.2s" }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                      onMouseOut={(e) => e.currentTarget.style.background = isOpen ? "#f8fafc" : "#fff"}
                    >
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: isOpen ? "var(--hotel-ink)" : "#475569", margin: 0 }}>{title}</h3>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>▼</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 16px 16px 16px", background: "#f8fafc" }}>
                        {Array.isArray(descGroup.detail) ? (
                          descGroup.detail.map((text, tidx) => (
                            <p key={tidx} style={{ fontSize: "0.85rem", color: "var(--hotel-muted)", margin: tidx === 0 ? "0 0 6px 0" : "6px 0", lineHeight: "1.6" }}>
                              {text}
                            </p>
                          ))
                        ) : (
                          <p style={{ fontSize: "0.85rem", color: "var(--hotel-muted)", margin: 0, lineHeight: "1.6" }}>{descGroup.detail}</p>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
                {uniqueDescriptions.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDesc(!showAllDesc)}
                    style={{ background: "transparent", color: "#ff0000", border: "none", padding: "4px 8px", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", marginTop: "4px" }}
                    onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                    onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
                  >
                    {showAllDesc ? "View less" : "View more"}
                  </button>
                )}
              </div>
            </section>
          )}



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

          {/* Hotel Policies Section */}
          {(hotel.hotelPolicy || (hotel.policyAndInstruction && hotel.policyAndInstruction.length > 0)) && (
            <section style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px", marginBottom: "12px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Hotel Policies &amp; Information</h3>
              
              {hotel.hotelPolicy && (!hotel.policyAndInstruction || hotel.policyAndInstruction.length === 0) && (
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "0.78rem", color: "var(--hotel-muted)", margin: 0, lineHeight: "1.4" }}>{hotel.hotelPolicy}</p>
                </div>
              )}

              {hotel.policyAndInstruction && hotel.policyAndInstruction.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(() => {
                    const renderedTexts = new Set();
                    return hotel.policyAndInstruction.reduce((acc, current) => {
                      const name = current.name || current.Name || "Policy";
                      const existing = acc.find(item => (item.name || item.Name || "Policy") === name);
                      if (existing) {
                        existing.data = [...(existing.data || existing.Data || []), ...(current.data || current.Data || [])];
                      } else {
                        acc.push({ ...current, data: [...(current.data || current.Data || [])] });
                      }
                      return acc;
                    }, []).map((policy, idx) => {
                      const policyName = policy.name || policy.Name || "Policy";
                      
                      const formattedData = (policy.data || []).map(subPolicy => {
                        const details = (subPolicy.detail || subPolicy.Detail || []).map(desc => {
                          let cleanDesc = desc;
                          try {
                            if (typeof desc === 'string' && (desc.trim().startsWith('{') || desc.trim().startsWith('['))) {
                              const parsed = JSON.parse(desc);
                              if (typeof parsed === 'object' && parsed !== null) {
                                cleanDesc = Object.values(parsed).join(' ');
                              }
                            }
                          } catch (e) {}
                          return cleanDesc;
                        }).filter(desc => {
                          if (!desc) return false;
                          const norm = String(desc).toLowerCase().replace(/[^a-z0-9]/g, '');
                          if (renderedTexts.has(norm)) return false;
                          renderedTexts.add(norm);
                          return true;
                        });
                        return { ...subPolicy, finalDetails: details };
                      }).filter(sub => sub.finalDetails.length > 0);

                      if (formattedData.length === 0) return null;

                      return (
                        <div key={idx}>
                          <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--hotel-ink)", margin: "0 0 4px 0" }}>
                            {policyName}
                          </strong>
                          {formattedData.map((subPolicy, sIdx) => {
                            const showSubName = subPolicy.subName && subPolicy.subName.trim().toLowerCase() !== policyName.trim().toLowerCase();
                            return (
                              <div key={sIdx} style={{ marginBottom: "6px" }}>
                                {showSubName && <strong style={{ fontSize: "0.78rem", color: "var(--hotel-ink)", display: "block" }}>{subPolicy.subName}</strong>}
                                {subPolicy.finalDetails.map((desc, dIdx) => (
                                  <p key={dIdx} style={{ fontSize: "0.78rem", color: "var(--hotel-muted)", margin: "0 0 2px 0", lineHeight: "1.4" }}>• {desc}</p>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
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
              <RoomCategoryAccordion
                offers={hotel.offers}
                images={hotel.images}
                gallery={gallery}
                selectedOffer={offer}
                selectingOfferId={selectingOfferId}
                onSelectOffer={(roomOffer) => {
                  handleSelectOffer(roomOffer);
                  setCurrentStep(2);
                }}
                roomsCount={roomsCount}
              />
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--hotel-muted)" }}>
                  <p>No active rooms returned for the selected dates. Please search for different dates.</p>
                </div>
              )}
            </div>
          </section>

          {/* Location Map Section */}
          {hotel.address && (
            <section id="section-map" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px", padding: "12px" }}>
              <div style={{ marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Location</h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--hotel-muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#ff0000", fontSize: "1.1rem" }}>📍</span> {hotel.address}
                </p>
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
    </>
  );
}
