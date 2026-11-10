/* eslint-disable */
import React, { useEffect, useState } from "react";
import {
  BedDouble,
  Building2,
  Camera,
  Users,
  MapPin,
  Share2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wifi,
  Car,
  Utensils,
  Bell,
  Dumbbell,
  Waves,
  Wind,
  Coffee,
  Tv,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass
} from "lucide-react";
import { categorizeFacilities } from "../../utils/facilityCategories";
import { getAmenityIcon, getAmenityName } from "../../utils/amenityIconMap";
import RoomCategoryAccordion from "../../components/booking/RoomCategoryAccordion";

const getViewSymbol = (name) => {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("skyline") || lower.includes("city")) return "🏙️";
  if (lower.includes("garden") || lower.includes("lawn") || lower.includes("green") || lower.includes("park")) return "🏡";
  if (lower.includes("terrace") || lower.includes("roof") || lower.includes("landmark")) return "🌅";
  if (lower.includes("balcony") || lower.includes("patio")) return "🚪";
  return "👁️";
};

const getDiningSymbol = (name) => {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("breakfast") || lower.includes("egg")) return "🍳";
  if (lower.includes("coffee") || lower.includes("tea") || lower.includes("cafe")) return "☕";
  if (lower.includes("restaurant") || lower.includes("dining")) return "🍽️";
  if (lower.includes("bar") || lower.includes("lounge") || lower.includes("drink")) return "🍹";
  return "🍴";
};

const getAttractionSymbol = (name) => {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("airport") || lower.includes("flight")) return "✈️";
  if (lower.includes("metro") || lower.includes("subway") || lower.includes("train") || lower.includes("railway") || lower.includes("station")) return "🚇";
  if (lower.includes("beach") || lower.includes("lake") || lower.includes("sea") || lower.includes("pool")) return "🏖️";
  if (lower.includes("temple") || lower.includes("church") || lower.includes("mosque")) return "⛩️";
  if (lower.includes("mall") || lower.includes("shop") || lower.includes("market")) return "🛍️";
  return "📍";
};

const getAmenityLucideIcon = (name) => {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("wi-fi") || lower.includes("wifi") || lower.includes("internet")) {
    return <Wifi size={17} />;
  }
  if (lower.includes("parking") || lower.includes("valet") || lower.includes("garage") || lower.includes("car")) {
    return <Car size={17} />;
  }
  if (lower.includes("restaurant") || lower.includes("dining") || lower.includes("breakfast") || lower.includes("food") || lower.includes("buffet") || lower.includes("kitchen")) {
    return <Utensils size={17} />;
  }
  if (lower.includes("room service") || lower.includes("service") || lower.includes("bell") || lower.includes("front desk") || lower.includes("reception") || lower.includes("concierge") || lower.includes("24h")) {
    return <Bell size={17} />;
  }
  if (lower.includes("gym") || lower.includes("fitness") || lower.includes("workout") || lower.includes("exercise") || lower.includes("health club")) {
    return <Dumbbell size={17} />;
  }
  if (lower.includes("pool") || lower.includes("swim") || lower.includes("jacuzzi") || lower.includes("hot tub") || lower.includes("spa")) {
    return <Waves size={17} />;
  }
  if (lower.includes("air condition") || lower.includes("ac") || lower.includes("cooling") || lower.includes("climate")) {
    return <Wind size={17} />;
  }
  if (lower.includes("coffee") || lower.includes("tea") || lower.includes("cafe")) {
    return <Coffee size={17} />;
  }
  if (lower.includes("tv") || lower.includes("television") || lower.includes("cable") || lower.includes("screen")) {
    return <Tv size={17} />;
  }
  if (lower.includes("clean") || lower.includes("housekeeping") || lower.includes("laundry")) {
    return <Sparkles size={17} />;
  }
  if (lower.includes("security") || lower.includes("safe") || lower.includes("safety") || lower.includes("guard")) {
    return <ShieldCheck size={17} />;
  }
  return <CheckCircle2 size={17} />;
};

const circlePalette = [
  { bg: "#eff6ff", text: "#2563eb" }, // blue
  { bg: "#f0fdf4", text: "#16a34a" }, // green
  { bg: "#fff7ed", text: "#ea580c" }, // orange
  { bg: "#fdf2f8", text: "#db2777" }, // pink
  { bg: "#f5f3ff", text: "#7c3aed" }, // purple
  { bg: "#ecfeff", text: "#0891b2" }, // cyan
  { bg: "#fefce8", text: "#ca8a04" }, // yellow
  { bg: "#fef2f2", text: "#dc2626" }, // red
  { bg: "#f1f5f9", text: "#475569" }, // slate
  { bg: "#ecfdf5", text: "#059669" }, // emerald
];

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
  const [showAllPolicies, setShowAllPolicies] = useState(false);
  const [listModal, setListModal] = useState(null);

  const DINING_PREVIEW_COUNT = 6;
  const ATTRACTION_PREVIEW_COUNT = 6;
  const POLICY_PREVIEW_COUNT = 2;

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

  const defaultStandardAmenities = [
    "Wi-Fi",
    "Parking",
    "Room Service",
    "Air Conditioning",
    "Restaurant",
    "Swimming Pool",
    "Fitness Center",
    "Housekeeping",
    "24h Front Desk",
    "Security"
  ];

  // 10 items for the 10-column row from hotel data
  const displayAmenities = amenities.length >= 10
    ? amenities.slice(0, 10)
    : Array.from(new Set([...amenities, ...defaultStandardAmenities])).slice(0, 10);

  // Categorized
  const categorized = categorizeFacilities(amenities);
  const views = categorized.views || [];
  const dining = categorized.dining || [];

  // Attractions
  let rawAttractions = Array.isArray(hotel.attractions)
    ? hotel.attractions.map(a => typeof a === "object" ? (a.name || a.Name || "") : String(a)).filter(Boolean)
    : [];

  let parsedAttractions = [];
  rawAttractions.forEach(item => {
    let cleaned = item.replace("Distances are displayed to the nearest 0.1 mile and kilometer.", "").trim();
    if (cleaned.includes(" km") && cleaned.includes(" - ")) {
      const regex = /(.*?)\s+-\s+(\d+(?:\.\d+)?\s*km(?:\s*\/\s*\d+(?:\.\d+)?\s*mi)?)/g;
      let match;
      let foundAny = false;
      while ((match = regex.exec(cleaned)) !== null) {
        foundAny = true;
        parsedAttractions.push({ name: match[1].trim(), distance: match[2].trim() });
      }
      if (!foundAny) {
        parsedAttractions.push({ name: item, distance: "" });
      }
    } else {
      parsedAttractions.push({ name: item, distance: "" });
    }
  });

  const attractions = parsedAttractions;

  // Tabs list
  const tabsList = ["All"];
  if (hotel.offers && hotel.offers.length > 0) tabsList.push("Rooms");
  tabsList.push("Amenities");
  if (views.length > 0) tabsList.push("Property Views");
  if (dining.length > 0) tabsList.push("Dining");
  if (attractions.length > 0) tabsList.push("Nearby Attractions");

  const scrollToSection = (sectionId) => {
    if (sectionId === "All") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const element = document.getElementById(`section-${sectionId.toLowerCase().replace(/\s+/g, "-")}`);
    if (element) {
      const topbar = document.querySelector("header, nav, .topbar, [class*='topbar'], [class*='header'], [class*='navbar']");
      const offset = topbar ? topbar.getBoundingClientRect().height + 14 : 76;
      const elementTop = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: elementTop, behavior: "smooth" });
    }
  };

  const uniqueDescriptions = [];
  const seenTexts = new Set();

  if (Array.isArray(hotel.description)) {
    hotel.description.forEach(descGroup => {
      if (descGroup.name === "Default" || descGroup.name === "Attractions") return;

      let textContent = "";
      if (Array.isArray(descGroup.detail)) {
        textContent = descGroup.detail.join(" ").trim();
      } else {
        textContent = String(descGroup.detail || "").trim();
      }

      if (textContent.startsWith("{") && textContent.endsWith("}")) return;
      const normalizedText = textContent.toLowerCase().replace(/\s+/g, ' ');

      if (normalizedText && !seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        uniqueDescriptions.push(descGroup);
      }
    });
  }

  // Primary Offer for Booking Card
  const primaryOffer = offer || (hotel.offers && hotel.offers[0]) || null;

  // Shown Images (3 equal cards)
  const allImages = displayedImages && displayedImages.length > 0 ? displayedImages : gallery || [];
  const shownPhotos = allImages.slice(0, 3);
  while (shownPhotos.length < 3 && allImages.length > 0) {
    shownPhotos.push(allImages[shownPhotos.length % allImages.length]);
  }

  // Hotel Logo
  const hotelLogo = hotel.logo || hotel.logoUrl || (gallery && gallery[0]) || (displayedImages && displayedImages[0]) || "";

  // Helper to keep postal code together e.g. <span style="white-space:nowrap">517501</span>
  const renderLocationWithPostalCode = (loc) => {
    if (!loc) return "";
    const parts = String(loc).split(/(\b\d{6}\b)/);
    return parts.map((part, idx) => {
      if (/^\d{6}$/.test(part)) {
        return (
          <span key={idx} style={{ whiteSpace: "nowrap" }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Price formatting
  const rawPrice = Number(primaryOffer?.price) || 0;
  const rawOriginalPrice = Number(primaryOffer?.originalPrice) || 0;
  const formattedPrice = rawPrice > 0 ? `INR ${rawPrice.toLocaleString("en-IN")}` : "INR 2,055";
  const hasValidOriginalPrice = rawOriginalPrice > rawPrice && rawOriginalPrice > 0;
  const formattedOriginalPrice = hasValidOriginalPrice ? `INR ${rawOriginalPrice.toLocaleString("en-IN")}` : null;
  const isOfferRefundable = Boolean(
    primaryOffer?.isRefundable ??
    primaryOffer?.IsRefundable ??
    primaryOffer?.cancellation?.isRefundable ??
    (primaryOffer?.cancellationPolicies?.length > 0 && Number(primaryOffer.cancellationPolicies[0]?.charge || 0) === 0)
  );

  return (
    <div className="hd-container">
      {/* Scoped CSS for Hotel Details Page */}
      <style>{`
        .hd-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px 32px 16px;
          box-sizing: border-box;
          width: 100%;
          overflow-x: hidden;
          font-family: inherit;
        }

        .hd-hero-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
          gap: 16px;
          align-items: stretch;
          margin-bottom: 16px;
        }

        .hd-gallery-layout {
          display: grid;
          grid-template-columns: 1.55fr 1fr;
          gap: 12px;
          width: 100%;
          min-height: 290px;
        }

        .hd-big-image-card {
          height: 100%;
          min-height: 290px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          background: #f1f5f9;
          border: 1px solid #e6e9f0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .hd-big-image-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        }

        .hd-big-image-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hd-side-images-stack {
          display: grid;
          grid-template-rows: 1fr 1fr;
          gap: 12px;
          height: 100%;
        }

        .hd-small-image-card {
          height: 100%;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          background: #f1f5f9;
          border: 1px solid #e6e9f0;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .hd-small-image-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        }

        .hd-small-image-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hd-more-photos-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.02em;
          border-radius: 14px;
          backdrop-filter: blur(1px);
          transition: background 0.2s ease;
        }

        .hd-small-image-card:hover .hd-more-photos-overlay {
          background: rgba(15, 23, 42, 0.58);
        }

        .hd-photo-badge {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(2px);
          border-radius: 9999px;
          padding: 3px 8px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          pointer-events: none;
        }

        .hd-booking-card {
          width: 350px;
          height: 100%;
          min-height: 290px;
          background: #ffffff;
          border: 1px solid #e6e9f0;
          border-radius: 14px;
          padding: 18px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hd-content-card {
          background: #ffffff;
          border: 1px solid #e6e9f0;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          margin-bottom: 14px;
          box-sizing: border-box;
          width: 100%;
        }

        /* Amenities Grid & Dividers */
        @media (min-width: 1000px) {
          .hd-amenities-row {
            display: grid;
            grid-template-columns: repeat(10, 1fr);
            width: 100%;
          }
          .hd-amenity-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 0 6px;
            border-right: 1px solid #eef2f6;
          }
          .hd-amenity-col:last-child {
            border-right: none;
          }
        }

        @media (max-width: 999px) {
          .hd-hero-row {
            grid-template-columns: 1fr;
          }
          .hd-booking-card {
            width: 100% !important;
            max-width: 100% !important;
          }
          .hd-amenities-row {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 14px;
            width: 100%;
          }
          .hd-amenity-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            border-right: none !important;
          }
        }

        @media (max-width: 619px) {
          .hd-gallery-layout {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .hd-big-image-card {
            min-height: 190px;
            height: 190px;
          }
          .hd-side-images-stack {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: none;
            height: 100px;
          }
          .hd-amenities-row {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
      `}</style>

      {/* Category Tabs */}
      <div className="hotel-category-tabs" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px", padding: "6px 10px", background: "rgba(255, 255, 255, 0.8)", borderRadius: "12px", border: "1px solid #e6e9f0" }}>
        {tabsList.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`hotel-category-tab-btn${activeImageTab === tab ? " is-active" : ""}`}
            style={{ fontSize: "12px", padding: "4px 12px", minHeight: "28px", borderRadius: "8px", border: "1px solid transparent", cursor: "pointer", fontWeight: 600 }}
            onClick={() => {
              setActiveImageTab(tab);
              scrollToSection(tab);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* HEADER ROW */}
      <section className="hd-header-row" style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h1 style={{
                fontSize: "26px",
                fontWeight: "bold",
                color: "#1e3a5f",
                margin: 0,
                lineHeight: "1.2",
                textTransform: "uppercase",
                letterSpacing: "-0.01em"
              }}>
                {hotel.name}
              </h1>
              {hotel.rating > 0 && (
                <span style={{ color: "#f59e0b", fontSize: "18px", lineHeight: "1" }}>
                  {"★".repeat(Math.floor(hotel.rating))}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b", marginTop: "6px", flexWrap: "wrap" }}>
              <MapPin size={15} color="#ff0000" style={{ flexShrink: 0 }} />
              <span>{renderLocationWithPostalCode(stayLocation)}</span>
              <a
                href="#section-map"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("map");
                }}
                style={{ color: "#ff0000", fontWeight: "bold", textDecoration: "none", marginLeft: "4px" }}
              >
                Show in map
              </a>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <button
              type="button"
              onClick={toggleFavourite}
              style={{
                background: "none",
                border: "none",
                color: "#ff0000",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: 0
              }}
            >
              <span style={{ fontSize: "15px" }}>{isFavourite ? "♥" : "♡"}</span>
              <span>{isFavourite ? "Added to Favourites" : "Add to Favourites"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: hotel.name, url: window.location.href }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard!");
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "#ff0000",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: 0
              }}
            >
              <Share2 size={14} color="#ff0000" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </section>

      {/* HERO ROW: Left = Gallery (1 Big + 2 Beside Small Images), Right = Booking Card */}
      <section className="hd-hero-row">
        {/* Gallery: 1 Big Image + 2 Small Images Stacked Beside */}
        <div className="hd-gallery-layout">
          {/* Big Main Image */}
          {shownPhotos[0] && (
            <div
              className="hd-big-image-card"
              onClick={() => setLightboxIndex(0)}
              title="Click to view all photos"
            >
              <img
                src={shownPhotos[0]}
                alt={`${hotel.name} - main view`}
              />
              <div className="hd-photo-badge">
                <Camera size={13} />
                <span>1 / {allImages.length || shownPhotos.length}</span>
              </div>
            </div>
          )}

          {/* Beside: Two Small Images Stacked Vertically */}
          <div className="hd-side-images-stack">
            {shownPhotos[1] && (
              <div
                className="hd-small-image-card"
                onClick={() => setLightboxIndex(1)}
                title="Click to view all photos"
              >
                <img
                  src={shownPhotos[1]}
                  alt={`${hotel.name} - view 2`}
                />
                <div className="hd-photo-badge">
                  <Camera size={13} />
                  <span>2 / {allImages.length || shownPhotos.length}</span>
                </div>
              </div>
            )}

            {shownPhotos[2] && (
              <div
                className="hd-small-image-card"
                onClick={() => setLightboxIndex(2)}
                title="Click to view all photos"
              >
                <img
                  src={shownPhotos[2]}
                  alt={`${hotel.name} - view 3`}
                />
                <div className="hd-more-photos-overlay">
                  <span>+{Math.max(1, (allImages.length || 3) - 2)} Photos</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Booking Card (fixed 340px wide) */}
        <aside className="hd-booking-card">
          {primaryOffer && (
            <>
              {/* Top / Body Section */}
              <div className="hd-booking-card-top" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Hotel Thumbnail + Name + Stars + Deal Badge */}
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <img
                    src={hotelLogo}
                    alt={hotel.name}
                    style={{
                      width: "72px",
                      height: "54px",
                      objectFit: "contain",
                      borderRadius: "8px",
                      background: "#f8fafc",
                      border: "1px solid #eef2f6",
                      padding: "2px",
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      color: "#1e3a5f",
                      display: "block",
                      lineHeight: "1.25",
                      marginBottom: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {hotel.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ color: "#f59e0b", fontSize: "12px", lineHeight: "1" }}>
                        {"★".repeat(hotel.rating ? Math.floor(hotel.rating) : 4)}
                      </span>
                      <span style={{
                        background: "#e0f2fe",
                        color: "#0284c7",
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        lineHeight: "1.2"
                      }}>
                        Recommended Deal
                      </span>
                    </div>
                  </div>
                </div>

                {/* Featured Room Category Header */}
                <div>
                  <span style={{ fontSize: "10.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", display: "block" }}>
                    Featured Room Option
                  </span>
                  <h3 style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#0f172a",
                    margin: "2px 0 0 0",
                    lineHeight: "1.3",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {primaryOffer.roomCategory ? primaryOffer.roomCategory.replace(/_/g, " ") : "Standard / Deluxe Room"}
                  </h3>
                </div>

                {/* Room Key Meta & Badges */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#64748b",
                  flexWrap: "wrap"
                }}>
                  <span style={{
                    color: isOfferRefundable ? "#15803d" : "#dc2626",
                    background: isOfferRefundable ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${isOfferRefundable ? "#bbf7d0" : "#fecaca"}`,
                    padding: "2px 7px",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: "600",
                    fontSize: "11px",
                    whiteSpace: "nowrap"
                  }}>
                    {isOfferRefundable ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
                    {isOfferRefundable ? "Refundable" : "Non-refundable"}
                  </span>

                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#475569",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontWeight: "500",
                    fontSize: "11px",
                    whiteSpace: "nowrap"
                  }}>
                    <Users size={12} /> {primaryOffer?.maxOccupancy ? `Max ${primaryOffer.maxOccupancy} Guests` : "Max 2 Guests"}
                  </span>
                </div>

                {/* Generic Neat Room Perks Chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    color: "#334155",
                    background: "#f1f5f9",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: "500"
                  }}>
                    📶 Free High-Speed WiFi
                  </span>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    color: "#334155",
                    background: "#f1f5f9",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontWeight: "500"
                  }}>
                    ❄️ Air Conditioning
                  </span>
                  {primaryOffer?.mealPlan ? (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: "#15803d",
                      background: "#f0fdf4",
                      border: "1px solid #dcfce7",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontWeight: "500"
                    }}>
                      🍳 {primaryOffer.mealPlan}
                    </span>
                  ) : (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: "#334155",
                      background: "#f1f5f9",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontWeight: "500"
                    }}>
                      ☕ Coffee/Tea Maker
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom / Action Section: Pinned to bottom, filling the card */}
              <div className="hd-booking-card-bottom" style={{ marginTop: "auto", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                {/* Price block */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "2px" }}>
                  <strong style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.01em" }}>
                    {formattedPrice}
                  </strong>
                  {hasValidOriginalPrice && (
                    <span style={{ fontSize: "14px", color: "#94a3b8", textDecoration: "line-through", fontWeight: "normal" }}>
                      {formattedOriginalPrice}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "11.5px", color: "#64748b", margin: "0 0 12px 0" }}>
                  Per night (total with taxes &amp; fees)
                </p>

                {/* Buttons: 2 equal columns, height 42px */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectOffer(primaryOffer);
                      setCurrentStep(2);
                    }}
                    disabled={selectingOfferId !== ""}
                    style={{
                      height: "42px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "bold",
                      background: "#ff0000",
                      color: "#ffffff",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "opacity 0.15s ease",
                      padding: "0 8px",
                      whiteSpace: "nowrap"
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <BedDouble size={15} />
                    <span>Reserve Rooms</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection("Rooms")}
                    style={{
                      height: "42px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "bold",
                      background: "#ffffff",
                      color: "#ff0000",
                      border: "1.5px solid #ff0000",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "background 0.15s ease",
                      padding: "0 8px",
                      whiteSpace: "nowrap"
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#fff5f5")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    <Building2 size={15} />
                    <span>View All Rooms</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      {/* AMENITIES CARD */}
      <section className="hd-content-card" id="section-facilities">
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#1e3a5f", margin: "0 0 14px 0" }}>
          Amenities
        </h2>

        <div className="hd-amenities-row">
          {displayAmenities.map((amenityName, idx) => {
            const palette = circlePalette[idx % circlePalette.length];
            return (
              <div key={idx} className="hd-amenity-col">
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: palette.bg,
                  color: palette.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 6px auto",
                  flexShrink: 0
                }}>
                  {getAmenityLucideIcon(amenityName)}
                </div>
                <span style={{
                  fontSize: "11px",
                  color: "#475569",
                  textAlign: "center",
                  lineHeight: "1.25",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {amenityName}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* About this hotel (Description & Languages) [PNB_083] */}
      <section className="hd-content-card" id="section-about">
        <div style={{ marginBottom: "12px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#1e3a5f", margin: "0 0 2px 0" }}>About this hotel</h2>
        </div>
        {hotel.description && hotel.description.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(showAllDesc ? uniqueDescriptions : uniqueDescriptions.slice(0, 3)).map((descGroup, idx) => {
              const isOpen = openDescIndex === idx;
              const title = descGroup.name && descGroup.name !== "Overview" ? descGroup.name : "Overview";
              return (
                <div key={idx} style={{ border: "1px solid #f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setOpenDescIndex(isOpen ? -1 : idx)}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: isOpen ? "#f8fafc" : "#fff", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.2s" }}
                  >
                    <h3 style={{ fontSize: "14px", fontWeight: "600", color: isOpen ? "#0f172a" : "#475569", margin: 0 }}>{title}</h3>
                    <ChevronDown size={16} color="#94a3b8" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 14px 14px 14px", background: "#f8fafc", fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                      {Array.isArray(descGroup.detail) ? (
                        descGroup.detail.map((text, tidx) => (
                          <p key={tidx} style={{ margin: tidx === 0 ? "0 0 6px 0" : "6px 0" }}>
                            {text}
                          </p>
                        ))
                      ) : (
                        <p style={{ margin: 0 }}>{descGroup.detail}</p>
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
                style={{ background: "transparent", color: "#ff0000", border: "none", padding: "4px 0", fontSize: "13px", fontWeight: "bold", cursor: "pointer", alignSelf: "flex-start", marginTop: "2px" }}
              >
                {showAllDesc ? "View less" : `View all ${uniqueDescriptions.length} sections`}
              </button>
            )}
          </div>
        )}

        {/* Languages Spoken [PNB_083] */}
        {(() => {
          const hotelData = hotel || {};
          const rawLanguages = hotelData?.languages?.length
            ? hotelData.languages
            : (hotelData?.Languages?.length ? hotelData.Languages : ["English", "Hindi", "Telugu"]);
          
          const supportedLanguages = Array.from(new Set(rawLanguages));
          if (!supportedLanguages.some(l => typeof l === 'string' && l.toLowerCase() === 'telugu')) {
            supportedLanguages.push("Telugu");
          }

          return (
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#1e3a5f", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🗣️</span>
                <span>Languages Spoken</span>
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                {supportedLanguages.map((lang, lIdx) => (
                  <span
                    key={lIdx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 12px",
                      background: "#f1f5f9",
                      color: "#334155",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      borderRadius: "9999px",
                      border: "1px solid #e2e8f0",
                      lineHeight: "1.4"
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ff0000", flexShrink: 0 }}></span>
                    <span>{lang}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      {/* Hotel Policies Section */}
      {(hotel.hotelPolicy || (hotel.policyAndInstruction && hotel.policyAndInstruction.length > 0)) && (
        <section className="hd-content-card" id="section-policies">
          <h2 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#1e3a5f" }}>Hotel Policies &amp; Information</h2>

          {hotel.hotelPolicy && (!hotel.policyAndInstruction || hotel.policyAndInstruction.length === 0) && (
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: "1.5" }}>{hotel.hotelPolicy}</p>
          )}

          {hotel.policyAndInstruction && hotel.policyAndInstruction.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(() => {
                const renderedTexts = new Set();
                const allPolicies = hotel.policyAndInstruction.reduce((acc, current) => {
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
                      } catch (e) { }
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
                    <div key={idx} style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "10px", border: "1px solid #eef2f6" }}>
                      <strong style={{ display: "block", fontSize: "13px", color: "#0f172a", margin: "0 0 4px 0" }}>
                        {policyName}
                      </strong>
                      {formattedData.map((subPolicy, sIdx) => {
                        const showSubName = subPolicy.subName && subPolicy.subName.trim().toLowerCase() !== policyName.trim().toLowerCase();
                        return (
                          <div key={sIdx} style={{ marginBottom: "4px" }}>
                            {showSubName && <strong style={{ fontSize: "12px", color: "#334155", display: "block" }}>{subPolicy.subName}</strong>}
                            {subPolicy.finalDetails.map((desc, dIdx) => (
                              <p key={dIdx} style={{ fontSize: "12px", color: "#64748b", margin: "0 0 2px 0", lineHeight: "1.4" }}>• {desc}</p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                }).filter(Boolean);

                const visiblePolicies = showAllPolicies ? allPolicies : allPolicies.slice(0, POLICY_PREVIEW_COUNT);

                return (
                  <>
                    {visiblePolicies}
                    {allPolicies.length > POLICY_PREVIEW_COUNT && (
                      <button
                        type="button"
                        onClick={() => setShowAllPolicies(!showAllPolicies)}
                        style={{ background: "transparent", color: "#ff0000", border: "none", padding: "2px 0", fontSize: "13px", fontWeight: "bold", cursor: "pointer", alignSelf: "flex-start", marginTop: "2px" }}
                      >
                        {showAllPolicies ? "View less policies" : `View all policies (${allPolicies.length})`}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </section>
      )}

      {/* Property Views Section */}
      {views.length > 0 && (
        <section className="hd-content-card" id="section-property-views">
          <h2 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "600", color: "#1e3a5f" }}>Property Views</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
            {views.map((item, idx) => (
              <div key={idx} style={{ fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #eef2f6" }}>
                <span style={{ fontSize: "15px" }}>{getViewSymbol(item)}</span>
                <span style={{ fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dining Section */}
      {dining.length > 0 && (
        <section className="hd-content-card" id="section-dining">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1e3a5f" }}>Dining &amp; Culinary</h2>
            {dining.length > DINING_PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() => setListModal({ title: "Dining & Culinary", items: dining, type: "dining" })}
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "4px 10px", color: "#ff0000", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
              >
                View All ({dining.length})
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
            {dining.slice(0, DINING_PREVIEW_COUNT).map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: "8px", fontSize: "13px", color: "#334155" }}>
                <span style={{ fontSize: "15px" }}>{getDiningSymbol(item)}</span>
                <span style={{ fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby Attractions Section */}
      {attractions.length > 0 && (
        <section className="hd-content-card" id="section-nearby-attractions">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1e3a5f" }}>Nearby Attractions</h2>
            {attractions.length > ATTRACTION_PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() => setListModal({ title: "Nearby Attractions", items: attractions, type: "attraction" })}
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "4px 10px", color: "#ff0000", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
              >
                View All ({attractions.length})
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "12px" }}>
            {attractions.slice(0, ATTRACTION_PREVIEW_COUNT).map((item, idx) => {
              const isObj = typeof item === 'object' && item !== null;
              const name = isObj ? (item.name || item.title || "") : String(item);
              const distance = isObj ? (item.distance || item.dist || "") : "";
              const categoryTag = isObj ? (item.category || item.type || "Attraction") : "Attraction";
              const symbol = getAttractionSymbol(name);

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    gap: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "15px",
                      color: "#dc2626",
                      flexShrink: 0
                    }}>
                      {symbol || <MapPin size={15} color="#dc2626" />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: "0.86rem",
                          fontWeight: 600,
                          color: "#1e293b",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                        title={name}
                      >
                        {name}
                      </div>
                      <div style={{
                        fontSize: "0.72rem",
                        fontWeight: 500,
                        color: "#64748b",
                        marginTop: "1px",
                        textTransform: "capitalize"
                      }}>
                        {categoryTag}
                      </div>
                    </div>
                  </div>

                  {distance && (
                    <span style={{
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      color: "#2563eb",
                      background: "#eff6ff",
                      border: "1px solid #dbeafe",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      whiteSpace: "nowrap",
                      flexShrink: 0
                    }}>
                      {distance}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Available Rooms & Rates List Card */}
      <section className="hd-content-card" id="section-rooms">
        <div style={{ marginBottom: "14px" }}>
          <h2 style={{ margin: "0 0 3px 0", fontSize: "16px", fontWeight: "600", color: "#1e3a5f" }}>Available Rooms &amp; Rates</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            {roomsCount > 1
              ? `Select Room ${selectedMultiRooms.length + 1} of ${roomsCount} to begin your reservation.`
              : `Select a room type to begin your reservation. Live rates guaranteed.`}
          </p>
        </div>

        <div>
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
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "10px" }}>
              <p style={{ margin: 0, fontSize: "13px" }}>No active rooms returned for the selected dates. Please search for different dates.</p>
            </div>
          )}
        </div>
      </section>

      {/* Location Map Section */}
      {hotel.address && (
        <section className="hd-content-card" id="section-map">
          <div style={{ marginBottom: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1e3a5f" }}>Location</h2>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
              <MapPin size={15} color="#ff0000" />
              <span>{hotel.address}</span>
            </p>
          </div>
          <div style={{ position: "relative", width: "100%", height: "240px", borderRadius: "10px", overflow: "hidden", border: "1px solid #e6e9f0" }}>
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

      {/* Lightbox Modal (Clicking any image opens the existing gallery) */}
      {lightboxIndex !== null && displayedImages.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${hotel.name} photo gallery`}
          onClick={() => setLightboxIndex(null)}
          style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(10, 15, 30, 0.95)", backdropFilter: "blur(6px)" }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close gallery"
            style={{ position: "absolute", top: "20px", right: "24px", border: 0, background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: "50%", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", zIndex: 10 }}
          >
            <X size={22} strokeWidth={2.5} />
          </button>

          {/* Prev */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex - 1 + displayedImages.length) % displayedImages.length);
            }}
            aria-label="Previous image"
            style={{ position: "absolute", left: "20px", border: 0, background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: "50%", width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", zIndex: 10 }}
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>

          {/* Fixed-size image frame */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(88vw, 960px)", height: "72vh", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "14px", overflow: "hidden", background: "#0f172a", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", flexShrink: 0 }}
          >
            <img
              src={displayedImages[lightboxIndex]}
              alt={`${hotel.name} - ${lightboxIndex + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", display: "block" }}
            />
          </div>

          {/* Next */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % displayedImages.length);
            }}
            aria-label="Next image"
            style={{ position: "absolute", right: "20px", border: 0, background: "rgba(255,255,255,0.12)", color: "#fff", borderRadius: "50%", width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)", zIndex: 10 }}
          >
            <ChevronRight size={28} strokeWidth={2.5} />
          </button>

          {/* Counter + thumbnails strip */}
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: "14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", fontWeight: 500 }}>{lightboxIndex + 1} / {displayedImages.length}</span>
            <div style={{ display: "flex", gap: "6px", maxWidth: "min(88vw, 960px)", overflowX: "auto", padding: "0 4px" }}>
              {displayedImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  style={{ flexShrink: 0, width: "54px", height: "38px", border: idx === lightboxIndex ? "2px solid #fff" : "2px solid transparent", borderRadius: "6px", overflow: "hidden", cursor: "pointer", padding: 0, opacity: idx === lightboxIndex ? 1 : 0.55, transition: "opacity 0.2s, border 0.2s" }}
                >
                  <img src={img} alt={`thumb-${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List Modal for Dining and Attractions */}
      {listModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setListModal(null)}
          style={{ position: "fixed", inset: 0, zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "550px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h3 style={{ margin: "0 0 2px 0", fontSize: "16px", fontWeight: "bold", color: "#1e3a5f" }}>{listModal.title}</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{hotel.name}</p>
              </div>
              <button
                onClick={() => setListModal(null)}
                style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {listModal.items.map((item, idx) => {
                  let name, iconElement;

                  if (listModal.type === "dining") {
                    name = item;
                    iconElement = <span style={{ fontSize: "14px" }}>{getDiningSymbol(item)}</span>;
                  } else if (listModal.type === "attraction") {
                    const isObj = typeof item === 'object';
                    name = isObj ? item.name : item;
                    const distance = isObj ? item.distance : "";
                    iconElement = <span style={{ fontSize: "14px" }}>{getAttractionSymbol(name)}</span>;
                    return (
                      <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {iconElement}
                          <span>{name}</span>
                        </div>
                        {distance && <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>{distance}</span>}
                      </div>
                    );
                  }

                  return (
                    <div key={idx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}>
                      {iconElement}
                      <span>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
