/* eslint-disable */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  ArrowLeftRight,
  BedDouble,
  Building2,
  Bus,
  CalendarDays,
  ChevronDown,
  Clock3,
  MessageSquareText,
  Minus,
  MapPin,
  Plane,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  Clock,
  IndianRupee,
  Tag,
  Headphones,
  Lock,
  Route,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ThumbsUp,
  ArrowLeft,
  Snowflake,
  Armchair,
  Ticket,
  Handshake,
  Star,
  Quote,
  Mail,
  Gift,
  Sparkles,
  Send,
} from "lucide-react";
import HotelSearchWidget from "../../components/HotelSearchWidget";
import PlaceAutocomplete from "../../components/PlaceAutocomplete";
import offerGreenBusImg from "../../assets/images/buses/offer_green_bus.svg";
import offerYellowBusImg from "../../assets/images/buses/offer_yellow_bus.svg";
import offerBlueBusImg from "../../assets/images/buses/offer_blue_bus.svg";
import sunsetHighwayBg from "../../assets/images/buses/sunset-highway-bg.svg";
import luxuryBusImg from "../../assets/images/buses/bus-booking-3d-illustration.svg";
import busBooking3dIllustration from "../../assets/images/buses/bus-booking-3d-illustration.svg";
import betterBookingHabits3d from "../../assets/images/buses/better-booking-habits-3d.svg";
import travelServiceRoute from "../../assets/images/illustrations/travel-service-route.png";
import travelServiceFares from "../../assets/images/illustrations/travel-service-fares.png";
import travelServiceTraveller from "../../assets/images/illustrations/travel-service-traveller.png";
import flightServiceRoute from "../../assets/images/illustrations/flight-service-route.png";
import flightServiceFares from "../../assets/images/illustrations/flight-service-fares.png";
import flightServiceTraveller from "../../assets/images/illustrations/flight-service-traveller.png";
import hotelServiceSearch from "../../assets/images/illustrations/hotel-service-search.png";
import hotelServiceRooms from "../../assets/images/illustrations/hotel-service-rooms.png";
import hotelServiceCheckin from "../../assets/images/illustrations/hotel-service-checkin.png";
import flightSectionBanner from "../../assets/images/illustrations/flight-section-banner.png";
import flightSectionNewBanner from "../../assets/images/image.png";
import flightHeroThemeImg from "../../assets/images/illustrations/flight-hero-theme.png";
import flightHeroThemeVideo from "../../assets/images/Give_me_a_background_screen_HD_1080p.mp4";
import busHeroVideo from "../../assets/images/PickNBook_SingleScreen_Color_HD.mp4";
import hotelHeroVideo from "../../assets/images/remove_cotage_make_different_HD_no_Gemini.mp4";
import hotelSectionBanner from "../../assets/images/illustrations/hotel-reception-banner.jpg";
import busCoastBanner from "../../assets/images/illustrations/bus-coast-banner.jpg";
import picknbookLogin from "../../assets/images/picknbook-login.png";
import picknbookAllTravelBanner from "../../assets/images/illustrations/picknbook-all-travel-banner.jpg";
import airIndiaExpress from "../../assets/images/brands/air-india-express.png";
import airIndia from "../../assets/images/brands/air-india.png";
import akasaAir from "../../assets/images/brands/akasa-air.png";
import airAsia from "../../assets/images/brands/airasia.png";
import emirates from "../../assets/images/brands/emirates.png";
import indigo from "../../assets/images/brands/indigo.png";
import lufthansa from "../../assets/images/brands/lufthansa.png";
import qatarAirways from "../../assets/images/brands/qatar-airways.png";
import spiceJet from "../../assets/images/airlines/Spicejet.png";
import { POPULAR_RTC_OPERATORS } from "../../data/popularBuses";
import "../../STYLES/HomePage.css";
import { toDisplayDate } from "../../utils/apiDateFormat";
import { getActiveOffers, getPublicFeaturedOffers } from "../../services/adminFeaturedOffersService";
import { listHotBusRoutes, searchBusCities } from "../../services/busBookingService";
import { listHotFlightRoutes } from "../../services/flightBookingService";
import { searchHotels } from "../../services/hotelBookingService";
import { toApiUrl } from "../../services/apiClient";
import { usePromo } from "../../contexts/PromoContext";

const hikerLandscapeBg = picknbookAllTravelBanner;


function AiFlightLogoIcon({ className, size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="aiFlightBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <filter id="aiSparkleGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 3D Circular Badge Base */}
      <circle cx="50" cy="50" r="46" fill="url(#aiFlightBadgeBg)" stroke="#60A5FA" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="5 3" />

      {/* AI Stars & Sparkles */}
      <path d="M 72 21 L 74.5 26.5 L 80 29 L 74.5 31.5 L 72 37 L 69.5 31.5 L 64 29 L 69.5 26.5 Z" fill="#FACC15" filter="url(#aiSparkleGlowFilter)" />
      <path d="M 24 65 L 25.5 68.5 L 29 70 L 25.5 71.5 L 24 75 L 22.5 71.5 L 19 70 L 22.5 68.5 Z" fill="#93C5FD" />
      <path d="M 77 62 L 78 64.5 L 80.5 65.5 L 78 66.5 L 77 69 L 76 66.5 L 73.5 65.5 L 76 64.5 Z" fill="#93C5FD" />

      {/* Flight Neural Trail */}
      <path d="M 21 73 Q 33 67 43 53" stroke="#93C5FD" strokeWidth="2.5" strokeDasharray="3 3" strokeLinecap="round" />

      {/* Stylized White 3D Airplane */}
      <g transform="translate(17, 14) scale(0.66)">
        <path
          d="M74.5 25.5C76 24 78 24.5 79 26.5C80 28.5 79.5 30.5 78 32L53.5 56.5L50.5 78.5C50 81.5 47 83 44.5 81.5L34 74.5L25 81.5C23.5 82.5 21.5 82 21 80.5C20.5 79 21 77.5 22 76.5L28.5 69L20 62L12 65C10.5 65.5 9 65 8.5 63.5C8 62 8.5 60.5 10 59.5L23.5 48.5L36 21C37 18.5 39.5 17.5 42 19L51.5 25.5L74.5 25.5Z"
          fill="#FFFFFF"
          filter="drop-shadow(0px 3px 5px rgba(0,0,0,0.25))"
        />
        <path
          d="M51.5 25.5 L40 44 L56.5 53.5 Z"
          fill="#60A5FA"
          opacity="0.8"
        />
      </g>
    </svg>
  );
}

function TravelAiLogoIcon({ className, size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="travelAiGradBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <filter id="travelAiGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 3D Circular Base Badge */}
      <circle cx="50" cy="50" r="46" fill="url(#travelAiGradBg)" stroke="#60A5FA" strokeWidth="2.5" />

      {/* Futuristic Latitude & Longitude Trajectory Lines */}
      <ellipse cx="50" cy="50" rx="36" ry="18" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" transform="rotate(-20 50 50)" />
      <ellipse cx="50" cy="50" rx="36" ry="36" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.2" strokeDasharray="4 3" />

      {/* Glowing AI Stars & Sparkles */}
      <path d="M 74 20 L 76.5 25.5 L 82 28 L 76.5 30.5 L 74 36 L 71.5 30.5 L 66 28 L 71.5 25.5 Z" fill="#FACC15" filter="url(#travelAiGlow)" />
      <path d="M 24 64 L 25.5 67.5 L 29 69 L 25.5 70.5 L 24 74 L 22.5 70.5 L 19 69 L 22.5 67.5 Z" fill="#93C5FD" />
      <circle cx="76" cy="64" r="2.5" fill="#38BDF8" />

      {/* Curved Neural Flight Trajectory */}
      <path d="M 22 70 Q 40 40 76 28" stroke="#38BDF8" strokeWidth="2.5" strokeDasharray="3 3" strokeLinecap="round" />

      {/* Stylized 3D White Airplane / Travel Icon */}
      <g transform="translate(24, 20) scale(0.68)">
        <path
          d="M74.5 25.5C76 24 78 24.5 79 26.5C80 28.5 79.5 30.5 78 32L53.5 56.5L50.5 78.5C50 81.5 47 83 44.5 81.5L34 74.5L25 81.5C23.5 82.5 21.5 82 21 80.5C20.5 79 21 77.5 22 76.5L28.5 69L20 62L12 65C10.5 65.5 9 65 8.5 63.5C8 62 8.5 60.5 10 59.5L23.5 48.5L36 21C37 18.5 39.5 17.5 42 19L51.5 25.5L74.5 25.5Z"
          fill="#FFFFFF"
          filter="drop-shadow(0px 3px 5px rgba(0,0,0,0.3))"
        />
        <path
          d="M51.5 25.5 L40 44 L56.5 53.5 Z"
          fill="#38BDF8"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}

function AiPandaLogoIcon({ className, size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="aiPandaBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1F5F9" />
        </linearGradient>
        <filter id="pandaGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* 3D Circular Badge Ring */}
      <circle cx="50" cy="50" r="46" fill="url(#aiPandaBg)" stroke="#E2E8F0" strokeWidth="2" />

      <g transform="translate(0, 5)">
        {/* Panda Black Ears */}
        <circle cx="30" cy="27" r="12" fill="#0F172A" />
        <circle cx="30" cy="27" r="7" fill="#334155" />
        <circle cx="70" cy="27" r="12" fill="#0F172A" />
        <circle cx="70" cy="27" r="7" fill="#334155" />

        {/* 3D White Head */}
        <ellipse cx="50" cy="47" rx="27" ry="23" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" filter="url(#pandaGlow)" />

        {/* Cute Black Eye Patches */}
        <ellipse cx="38" cy="45" rx="7.5" ry="8.5" fill="#0F172A" transform="rotate(-12 38 45)" />
        <ellipse cx="62" cy="45" rx="7.5" ry="8.5" fill="#0F172A" transform="rotate(12 62 45)" />

        {/* Expressive Eyes with Highlights */}
        <circle cx="39" cy="44" r="3.2" fill="#FFFFFF" />
        <circle cx="40" cy="43.5" r="1.6" fill="#000000" />
        <circle cx="61" cy="44" r="3.2" fill="#FFFFFF" />
        <circle cx="60" cy="43.5" r="1.6" fill="#000000" />

        {/* Nose */}
        <ellipse cx="50" cy="52" rx="4" ry="2.8" fill="#0F172A" />

        {/* Happy Smile & Tongue */}
        <path d="M 46 55.5 Q 50 60.5 54 55.5" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
        <path d="M 48 57.5 Q 50 61.5 52 57.5 Z" fill="#F43F5E" />

        {/* Rosy Pink Cheeks */}
        <ellipse cx="28" cy="51" rx="4.5" ry="2.5" fill="#FDA4AF" opacity="0.8" />
        <ellipse cx="72" cy="51" rx="4.5" ry="2.5" fill="#FDA4AF" opacity="0.8" />

        {/* Little Paws */}
        <ellipse cx="30" cy="67" rx="7" ry="5.5" fill="#0F172A" />
        <ellipse cx="70" cy="67" rx="7" ry="5.5" fill="#0F172A" />

        {/* Pink Speech Bubble (...) Top Right */}
        <g transform="translate(63, 11)">
          <path d="M 0 10 C 0 4.5 4.5 0 10 0 C 15.5 0 20 4.5 20 10 C 20 15.5 15.5 20 10 20 C 7.5 20 5.2 19 3.5 17.5 L 0 21 L 1.5 16.5 C 0.5 14.8 0 12.5 0 10 Z" fill="#F43F5E" />
          <circle cx="6" cy="10" r="1.5" fill="#FFFFFF" />
          <circle cx="10" cy="10" r="1.5" fill="#FFFFFF" />
          <circle cx="14" cy="10" r="1.5" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}

const CLASS_OPTIONS = [
  "Economy",
  "Premium Economy",
  "Business",
  "Premium Business",
  "First Class",
];

const FLIGHT_TRIP_TYPES = [
  { value: "oneway", label: "One Way" },
  { value: "twoway", label: "Round Trip" },
  { value: "multicity", label: "Multi City" },
];

const USE_DIRECT_API_IN_DEV =
  String(process.env.REACT_APP_USE_DIRECT_API_IN_DEV || "").toLowerCase() ===
  "true";
const IS_LOCAL_DEV =
  process.env.NODE_ENV === "development" &&
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
const PLACES_API_URL =
  IS_LOCAL_DEV && !USE_DIRECT_API_IN_DEV
    ? "/api/Places"
    : process.env.REACT_APP_PLACES_API_URL || "/api/Places";
const FEATURED_OFFER_ASSET_PATHS = [
  "uploads",
  "upload",
  "images",
  "image",
  "files",
  "media",
  "assets",
  "offers",
];

const BUS_TRIP_TYPES = [
  { value: "oneway", label: "One Way" },
  { value: "twoway", label: "Two Way" },
];

const DEFAULT_BUS_FEATURED_OFFERS = [
  {
    id: "bus-offer-1",
    title: "wheelsbus",
    couponCode: "wheelsbus",
    bookingType: "Bus",
    badgeLabel: "SPECIAL OFFER",
    theme: "pink",
    endDateUtc: "2026-07-25T23:59:59Z",
    couponExpiresAtUtc: "2026-07-25T23:59:59Z",
  },
  {
    id: "bus-offer-2",
    title: "June10",
    couponCode: "June10",
    bookingType: "Bus",
    badgeLabel: "EXCLUSIVE OFFER",
    theme: "green",
    endDateUtc: "2026-08-08T23:59:59Z",
    couponExpiresAtUtc: "2026-08-08T23:59:59Z",
  },
  {
    id: "bus-offer-3",
    title: "BUS50",
    couponCode: "BUS50",
    bookingType: "Bus",
    badgeLabel: "50% OFF",
    theme: "yellow",
    endDateUtc: "2026-10-08T23:59:59Z",
    couponExpiresAtUtc: "2026-10-08T23:59:59Z",
  },
  {
    id: "bus-offer-4",
    title: "JULYfair",
    couponCode: "JULYfair",
    bookingType: "Bus",
    badgeLabel: "SPECIAL OFFER",
    theme: "blue",
    endDateUtc: "2026-07-31T23:59:59Z",
    couponExpiresAtUtc: "2026-07-31T23:59:59Z",
  },
];


const POPULAR_FLIGHTS = [
  {
    id: "flight-1",
    route: "Delhi to Mumbai",
    fromCity: "Delhi",
    toCity: "Mumbai",
    summary: "Multiple daily departures and flexible timings.",
    searches: 1520,
  },
  {
    id: "flight-2",
    route: "Delhi to New York",
    fromCity: "Delhi",
    toCity: "New York",
    summary: "Premium long-haul options with one-stop routes.",
    searches: 1480,
  },
  {
    id: "flight-3",
    route: "Delhi to Dubai",
    fromCity: "Delhi",
    toCity: "Dubai",
    summary: "Fast visa-friendly routes with top carriers.",
    searches: 1390,
  },
  {
    id: "flight-4",
    route: "Kolkata to Patna",
    fromCity: "Kolkata",
    toCity: "Patna",
    summary: "Affordable direct routes for frequent travelers.",
    searches: 1210,
  },
  {
    id: "flight-5",
    route: "Pune to Chennai",
    fromCity: "Pune",
    toCity: "Chennai",
    summary: "Quick connections with excellent morning slots.",
    searches: 980,
  },
  {
    id: "flight-6",
    route: "Bangalore to Jaipur",
    fromCity: "Bangalore",
    toCity: "Jaipur",
    summary: "Business and economy seats available every day.",
    searches: 940,
  },
  {
    id: "flight-7",
    route: "Hyderabad to Kolkata",
    fromCity: "Hyderabad",
    toCity: "Kolkata",
    summary: "Convenient schedules for weekend travel plans.",
    searches: 870,
  },
  {
    id: "flight-8",
    route: "Mumbai to Doha",
    fromCity: "Mumbai",
    toCity: "Doha",
    summary: "Competitive fares on popular Gulf routes.",
    searches: 820,
  },
  {
    id: "flight-9",
    route: "Hyderabad to Proddatur",
    fromCity: "Hyderabad",
    toCity: "Proddatur",
    summary: "Competitive fares on most Gulf routes.",
    searches: 760,
  },
];

const FALLBACK_BUS_ROUTES = [
  {
    id: "bus-fallback-1",
    fromCity: "Mumbai",
    toCity: "Pune",
    searches: 1842,
  },
  {
    id: "bus-fallback-2",
    fromCity: "Bengaluru",
    toCity: "Chennai",
    searches: 1520,
  },
  {
    id: "bus-fallback-3",
    fromCity: "Delhi",
    toCity: "Jaipur",
    searches: 1480,
  },
  {
    id: "bus-fallback-4",
    fromCity: "Hyderabad",
    toCity: "Bengaluru",
    searches: 1390,
  },
  {
    id: "bus-fallback-5",
    fromCity: "Chennai",
    toCity: "Bengaluru",
    searches: 1210,
  },
  {
    id: "bus-fallback-6",
    fromCity: "Pune",
    toCity: "Goa",
    searches: 980,
  },
  {
    id: "bus-fallback-7",
    fromCity: "Hyderabad",
    toCity: "Vijayawada",
    searches: 870,
  },
  {
    id: "bus-fallback-8",
    fromCity: "Delhi",
    toCity: "Agra",
    searches: 750,
  },
];

/* â”€â”€â”€ City photo lookup â€” full names + IATA codes + aliases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const CITY_IMAGES = {
  /* â”€â”€ Hyderabad â”€â”€ */
  hyderabad: "https://images.unsplash.com/photo-1598001836732-e6e7f4e16df2?w=560&q=75&fit=crop&auto=format",
  hyd: "https://images.unsplash.com/photo-1598001836732-e6e7f4e16df2?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Mumbai â”€â”€ */
  mumbai: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=560&q=75&fit=crop&auto=format",
  bombay: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=560&q=75&fit=crop&auto=format",
  bom: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=560&q=75&fit=crop&auto=format",
  /* ─── Delhi / New Delhi ─── */
  delhi: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=560&q=75&fit=crop&auto=format",
  "new delhi": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=560&q=75&fit=crop&auto=format",
  del: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=560&q=75&fit=crop&auto=format",
  ixi: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=560&q=75&fit=crop&auto=format",
  /* ─── Bengaluru / Bangalore ─── */
  bengaluru: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=560&q=75&fit=crop&auto=format",
  bangalore: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=560&q=75&fit=crop&auto=format",
  blr: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=560&q=75&fit=crop&auto=format",
  bng: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=560&q=75&fit=crop&auto=format",
  /* ─── Chennai ─── */
  chennai: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=560&q=75&fit=crop&auto=format",
  madras: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=560&q=75&fit=crop&auto=format",
  maa: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=560&q=75&fit=crop&auto=format",
  /* ─── Kolkata ─── */
  kolkata: "https://images.unsplash.com/photo-1558431382-27e303142255?w=560&q=75&fit=crop&auto=format",
  calcutta: "https://images.unsplash.com/photo-1558431382-27e303142255?w=560&q=75&fit=crop&auto=format",
  ccu: "https://images.unsplash.com/photo-1558431382-27e303142255?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Pune â”€â”€ */
  pune: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=560&q=75&fit=crop&auto=format",
  pnq: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Ahmedabad â”€â”€ */
  ahmedabad: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=560&q=75&fit=crop&auto=format",
  amd: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Jaipur â”€â”€ */
  jaipur: "https://images.unsplash.com/photo-1477587458883-47145ed6979c?w=560&q=75&fit=crop&auto=format",
  jai: "https://images.unsplash.com/photo-1477587458883-47145ed6979c?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Goa â”€â”€ */
  goa: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=560&q=75&fit=crop&auto=format",
  panaji: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=560&q=75&fit=crop&auto=format",
  goi: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Vijayawada â”€â”€ */
  vijayawada: "https://images.unsplash.com/photo-1598001836732-e6e7f4e16df2?w=560&q=75&fit=crop&auto=format",
  vga: "https://images.unsplash.com/photo-1598001836732-e6e7f4e16df2?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Visakhapatnam / Vizag â”€â”€ */
  visakhapatnam: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=560&q=75&fit=crop&auto=format",
  vizag: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=560&q=75&fit=crop&auto=format",
  vtz: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Agra â”€â”€ */
  agra: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=560&q=75&fit=crop&auto=format",
  agr: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Kochi / Cochin â”€â”€ */
  kochi: "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?w=560&q=75&fit=crop&auto=format",
  cochin: "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?w=560&q=75&fit=crop&auto=format",
  cok: "https://images.unsplash.com/photo-1593693411515-c20261bcad6e?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Coimbatore â”€â”€ */
  coimbatore: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=560&q=75&fit=crop&auto=format",
  cjb: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Patna â”€â”€ */
  patna: "https://images.unsplash.com/photo-1558431382-27e303142255?w=560&q=75&fit=crop&auto=format",
  pat: "https://images.unsplash.com/photo-1558431382-27e303142255?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Proddatur â”€â”€ */
  proddatur: "https://images.unsplash.com/photo-1598001836732-e6e7f4e16df2?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Lucknow â”€â”€ */
  lucknow: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=560&q=75&fit=crop&auto=format",
  lko: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ International â”€â”€ */
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=560&q=75&fit=crop&auto=format",
  dxb: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=560&q=75&fit=crop&auto=format",
  "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=560&q=75&fit=crop&auto=format",
  nyc: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=560&q=75&fit=crop&auto=format",
  jfk: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=560&q=75&fit=crop&auto=format",
  doha: "https://images.unsplash.com/photo-1570284613060-bf9d6d580e8c?w=560&q=75&fit=crop&auto=format",
  doh: "https://images.unsplash.com/photo-1570284613060-bf9d6d580e8c?w=560&q=75&fit=crop&auto=format",
  singapore: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=560&q=75&fit=crop&auto=format",
  sin: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=560&q=75&fit=crop&auto=format",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=560&q=75&fit=crop&auto=format",
  lhr: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=560&q=75&fit=crop&auto=format",
  /* â”€â”€ Fallbacks â”€â”€ */
  bus_default: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=560&q=75&fit=crop&auto=format",
  flight_default: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=560&q=75&fit=crop&auto=format",
  hotel_default: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=560&q=75&fit=crop&auto=format",
};

/* Ordered list of city keywords for partial substring matching */
const CITY_KEYWORD_MAP = [
  ["hyderabad", "hyderabad"],
  ["mumbai", "mumbai"],
  ["bombay", "mumbai"],
  ["delhi", "delhi"],
  ["bengaluru", "bengaluru"],
  ["bangalore", "bengaluru"],
  ["chennai", "chennai"],
  ["madras", "chennai"],
  ["kolkata", "kolkata"],
  ["calcutta", "kolkata"],
  ["pune", "pune"],
  ["ahmedabad", "ahmedabad"],
  ["jaipur", "jaipur"],
  ["goa", "goa"],
  ["vijayawada", "vijayawada"],
  ["visakhapatnam", "visakhapatnam"],
  ["vizag", "visakhapatnam"],
  ["agra", "agra"],
  ["kochi", "kochi"],
  ["cochin", "kochi"],
  ["coimbatore", "coimbatore"],
  ["patna", "patna"],
  ["proddatur", "proddatur"],
  ["lucknow", "lucknow"],
  ["dubai", "dubai"],
  ["new york", "new york"],
  ["doha", "doha"],
  ["singapore", "singapore"],
  ["london", "london"],
];

function getCityImage(cityName, fallbackKey = "bus_default") {
  if (!cityName) return CITY_IMAGES[fallbackKey];
  const key = String(cityName).toLowerCase().trim();

  /* 1. Exact match (handles full names and IATA codes) */
  if (CITY_IMAGES[key]) return CITY_IMAGES[key];

  /* 2. Substring match â€” look for a known keyword inside the input */
  for (const [keyword, resolved] of CITY_KEYWORD_MAP) {
    if (key.includes(keyword)) return CITY_IMAGES[resolved];
  }

  /* 3. Input contains a 3-letter IATA code as a whole word â€” try it */
  const iataMatch = key.match(/\b([a-z]{3})\b/);
  if (iataMatch && CITY_IMAGES[iataMatch[1]]) return CITY_IMAGES[iataMatch[1]];

  return CITY_IMAGES[fallbackKey];
}

/* â”€â”€â”€ 6 distinct hotel-property photos â€” one per card slot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const HOTEL_ROOM_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=560&q=80&fit=crop&auto=format", /* pool villa */
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=560&q=80&fit=crop&auto=format", /* luxury bedroom */
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=560&q=80&fit=crop&auto=format", /* hotel lobby */
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=560&q=80&fit=crop&auto=format", /* rooftop pool */
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=560&q=80&fit=crop&auto=format", /* suite room */
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=560&q=80&fit=crop&auto=format", /* resort pool */
];

/* Map IATA city code â†’ full display name */
const CITY_CODE_TO_NAME = {
  hyd: "Hyderabad", bom: "Mumbai", del: "Delhi", blr: "Bengaluru",
  maa: "Chennai", ccu: "Kolkata", pnq: "Pune", amd: "Ahmedabad",
  jai: "Jaipur", goi: "Goa", cok: "Kochi", lko: "Lucknow",
  vtz: "Visakhapatnam", vga: "Vijayawada", agr: "Agra",
  dxb: "Dubai", doh: "Doha", sin: "Singapore", lhr: "London",
};

function normalizeCityName(raw) {
  if (!raw) return "";
  const key = String(raw).toLowerCase().trim();
  return CITY_CODE_TO_NAME[key] || raw.trim();
}

const AIRLINE_BRANDS = [
  { id: "brand-1", image: indigo, name: "IndiGo", scale: 1.2 },
  { id: "brand-2", image: airIndia, name: "Air India", scale: 1.34 },
  { id: "brand-3", image: airAsia, name: "AirAsia", scale: 1.08 },
  { id: "brand-4", image: akasaAir, name: "Akasa Air", scale: 1.18 },
  { id: "brand-5", image: emirates, name: "Emirates", scale: 1.08 },
  { id: "brand-6", image: qatarAirways, name: "Qatar Airways", scale: 1.16 },
  { id: "brand-7", image: lufthansa, name: "Lufthansa", scale: 1.1 },
  { id: "brand-8", image: spiceJet, name: "SpiceJet", scale: 1.14 },
  {
    id: "brand-9",
    image: airIndiaExpress,
    name: "Air India Express",
    scale: 1.08,
  },
];

const REVIEWS = [
  {
    id: "review-1",
    type: "Bus Booking",
    comment: "Two-way booking flow is smooth and payment confirmation is instant.",
    author: "Rohit M.",
    rating: "4.9/5",
  },
  {
    id: "review-2",
    type: "Bus Booking",
    comment: "Seat layout and boarding point details are clear and accurate.",
    author: "Priya S.",
    rating: "4.8/5",
  },
  {
    id: "review-3",
    type: "Bus Booking",
    comment: "Route search is quick and boarding details are easy to follow.",
    author: "Karthik R.",
    rating: "4.7/5",
  },
  {
    id: "review-4",
    type: "Bus Booking",
    comment: "Round trip option helped me plan both routes in one screen.",
    author: "Sneha P.",
    rating: "4.8/5",
  },
  {
    id: "review-5",
    type: "Bus Booking",
    comment: "Date selector opens instantly and return date handling is perfect.",
    author: "Amit K.",
    rating: "4.9/5",
  },
  {
    id: "review-6",
    type: "Bus Booking",
    comment: "Price filters and route details make intercity planning easy.",
    author: "Neha T.",
    rating: "4.6/5",
  },
];

const HIGHLIGHTS = [
  {
    id: "highlight-1",
    icon: Search,
    value: "Fast",
    title: "Search Without Guesswork",
    text: "Compare routes, timings, fares, pickup points, and seat choices in one clean flow.",
  },
  {
    id: "highlight-2",
    icon: ShieldCheck,
    value: "Clear",
    title: "Book With Confidence",
    text: "Check cancellation rules, fare details, and trip information before you confirm.",
  },
  {
    id: "highlight-3",
    icon: Clock3,
    value: "Ready",
    title: "Better For Urgent Plans",
    text: "Find close-to-departure options quickly when your journey changes at the last minute.",
  },
  {
    id: "highlight-4",
    icon: RefreshCw,
    value: "Easy",
    title: "Everything In One Place",
    text: "Keep search, offers, booking, and ticket actions simple from start to finish.",
  },
];

const HOME_BOOKING_STEPS = [
  {
    id: "step-1",
    title: "Search Your Route",
    text: "Enter source, destination, and journey date to compare available buses in one place.",
  },
  {
    id: "step-2",
    title: "Pick The Right Bus",
    text: "Check timings, boarding points, bus type, fare, and cancellation rules before selecting seats.",
  },
  {
    id: "step-3",
    title: "Confirm Securely",
    text: "Add passenger details, complete payment, and keep your ticket reference ready for the journey.",
  },
];

const HOME_GUIDE_NOTES = [
  {
    id: "note-1",
    title: "Close-To-Departure Booking",
    text: "When plans change at the last minute, filter by departure time, pickup point, seat type, and cancellation flexibility. A slightly later boarding time can sometimes give better seat choice and fare clarity.",
  },
  {
    id: "note-2",
    title: "A Cleaner Way To Choose",
    text: "Instead of picking only the cheapest option, compare the whole trip: operator reliability, boarding location, arrival time, amenities, and refund rules. A calmer booking decision usually starts with fewer surprises.",
  },
];

const HOME_SERVICE_BLOCKS = [
  {
    id: "services",
    kicker: "Pick N Book Services",
    title: "Online Bus Booking Made Simple",
    text:
      "Search routes, compare departures, check fares, and keep booking details in one clear flow. Pick N Book is built for quick city-to-city planning without jumping between different tools.",
    points: [
      "Live route search with practical filters",
      "Boarding, dropping, and timing details in one place",
      "Ticket confirmation ready after payment",
    ],
    visual: "route",
    image: travelServiceRoute,
    imageAlt: "Bus route search shown on a mobile booking screen",
  },
  {
    id: "fares",
    kicker: "Fare Clarity",
    title: "Choose The Right Bus At The Right Price",
    text:
      "Compare AC, non-AC, sleeper, seater, private, and RTC-style options by comfort, timing, and cancellation rules before you confirm.",
    points: [
      "AC Sleeper",
      "Non-AC Seater",
      "Semi Sleeper",
      "Volvo / Premium",
      "Express Routes",
      "Night Services",
    ],
    visual: "fare",
    image: travelServiceFares,
    imageAlt: "Bus fare comparison cards with seat and route options",
  },
  {
    id: "benefits",
    kicker: "Better Booking Habits",
    title: "Everything You Need Before You Travel",
    text:
      "A good booking experience should reduce uncertainty. Review route details, passenger information, fare rules, and ticket status before the journey starts.",
    points: [
      "Avoid standing in queues at counters",
      "Review pickup and drop points before payment",
      "Keep booking reference and passenger details handy",
      "Use saved routes for repeat journeys",
    ],
    visual: "traveller",
    image: travelServiceTraveller,
    imageAlt: "Traveller checking ticket details beside a bus stop",
  },
];

const HOME_ASSURANCE_POINTS = [
  {
    id: "assurance-1",
    icon: ShieldCheck,
    title: "Trip Protection",
    text: "Clear cancellation and support paths when plans change.",
  },
  {
    id: "assurance-2",
    icon: Clock3,
    title: "Delay Ready",
    text: "Keep route timing, boarding details, and ticket status easy to check.",
  },
  {
    id: "assurance-3",
    icon: RefreshCw,
    title: "Flexible Changes",
    text: "Compare options with refund rules before you confirm your seat.",
  },
];

const HOME_BUS_FAQS = [
  {
    id: "faq-1",
    question: "How do I book bus tickets online?",
    answer:
      "Choose your source, destination, journey date, and preferred bus. Then select seats, add passenger details, and complete payment to receive your ticket confirmation.",
  },
  {
    id: "faq-2",
    question: "Can I book RTC and private bus operators?",
    answer:
      "Yes. The platform is designed for common routes across RTC operators and private buses, including seater, sleeper, AC, non-AC, and overnight journeys.",
  },
  {
    id: "faq-3",
    question: "What should I check before payment?",
    answer:
      "Always check the final fare, boarding point, cancellation rules, passenger details, and operator policy before payment.",
  },
  {
    id: "faq-4",
    question: "Where can I check boarding point and ticket details?",
    answer:
      "After booking, your ticket page shows route, date, boarding point, passenger details, fare summary, and confirmation reference for quick access.",
  },
];

const HOME_APP_BENEFITS = [
  "Route alerts",
  "PNR and ticket history",
  "Repeat traveller offers",
];

const FLIGHT_HIGHLIGHTS = [
  {
    id: "flight-highlight-1",
    icon: Search,
    value: "Smart",
    title: "Compare Flight Choices",
    text: "Check one-way, round-trip, and multi-city options with fares, timing, and cabin class in one flow.",
  },
  {
    id: "flight-highlight-2",
    icon: ShieldCheck,
    value: "Official",
    title: "Clear Booking Details",
    text: "Review route, passenger, fare, and airline information before moving to payment.",
  },
  {
    id: "flight-highlight-3",
    icon: Clock3,
    value: "Quick",
    title: "Built For Time-Sensitive Travel",
    text: "Find morning, evening, direct, and connecting flight options faster when plans change.",
  },
  {
    id: "flight-highlight-4",
    icon: RefreshCw,
    value: "Flexible",
    title: "Ready For Trip Changes",
    text: "Keep return dates, traveller counts, and cabin choices easy to adjust while searching.",
  },
];

const FLIGHT_SERVICE_BLOCKS = [
  {
    id: "flight-search",
    kicker: "Flight Desk Services",
    title: "Flight Search For Every Trip Type",
    text:
      "Search domestic and international routes, compare flight timings, and keep traveller details aligned from the first search.",
    points: [
      "One-way, round-trip, and multi-city planning",
      "Traveller and cabin class selection",
      "Route, timing, and fare details in one place",
    ],
    visual: "route",
    image: flightServiceRoute,
    imageAlt: "Flight route search shown in a travel booking flow",
  },
  {
    id: "flight-fares",
    kicker: "Fare Clarity",
    title: "Choose The Fare That Fits The Journey",
    text:
      "Compare economy, premium economy, business, and first class options with practical date and traveller controls.",
    points: [
      "Economy",
      "Premium Economy",
      "Business",
      "Premium Business",
      "First Class",
      "International Routes",
    ],
    visual: "fare",
    image: flightServiceFares,
    imageAlt: "Flight fare comparison cards with route options",
  },
  {
    id: "flight-ready",
    kicker: "Before You Fly",
    title: "Keep Check-In And Ticket Actions Close",
    text:
      "A flight booking flow should make it easy to find booking references, review passenger details, and move to web check-in when needed.",
    points: [
      "Open web check-in from the travel desk",
      "Keep PNR and passenger details ready",
      "Review date, route, and cabin before payment",
      "Use saved details for repeat searches",
    ],
    visual: "traveller",
    image: flightServiceTraveller,
    imageAlt: "Traveller checking flight booking details",
  },
];

const FLIGHT_BOOKING_STEPS = [
  {
    id: "flight-step-1",
    title: "Search Flights",
    text: "Enter origin, destination, dates, travellers, and cabin class for the right flight list.",
  },
  {
    id: "flight-step-2",
    title: "Compare Schedules",
    text: "Review direct, connecting, morning, evening, and premium options before choosing.",
  },
  {
    id: "flight-step-3",
    title: "Confirm And Fly",
    text: "Add passenger details, complete payment, and keep the PNR ready for web check-in.",
  },
];

const FLIGHT_GUIDE_NOTES = [
  {
    id: "flight-note-1",
    title: "Flexible Date Planning",
    text: "A nearby departure date or alternate return date can change fare and timing options. Compare the full journey before picking only the lowest price.",
  },
  {
    id: "flight-note-2",
    title: "Better Airport Readiness",
    text: "Keep your PNR, passenger names, baggage rules, terminal information, and web check-in timing ready before travel day.",
  },
];

const FLIGHT_ASSURANCE_POINTS = [
  {
    id: "flight-assurance-1",
    icon: ShieldCheck,
    title: "PNR Ready",
    text: "Keep booking references easy to find after payment.",
  },
  {
    id: "flight-assurance-2",
    icon: Clock3,
    title: "Schedule Aware",
    text: "Review departure, arrival, and connection timing clearly.",
  },
  {
    id: "flight-assurance-3",
    icon: RefreshCw,
    title: "Trip Flexible",
    text: "Adjust dates, cabin, and traveller counts before search.",
  },
];

const FLIGHT_REVIEWS = [
  {
    id: "flight-review-1",
    type: "Flight Booking",
    comment: "Round-trip search made the timing and fare comparison easy.",
    author: "Ananya R.",
    rating: "4.8/5",
  },
  {
    id: "flight-review-2",
    type: "Flight Booking",
    comment: "Traveller and cabin selection stayed clear even for family tickets.",
    author: "Vikram S.",
    rating: "4.7/5",
  },
  {
    id: "flight-review-3",
    type: "Flight Booking",
    comment: "The airline and route sections helped me choose quickly.",
    author: "Meera K.",
    rating: "4.9/5",
  },
  {
    id: "flight-review-4",
    type: "Flight Booking",
    comment: "Web check-in access beside booking tools is very useful.",
    author: "Rahul P.",
    rating: "4.8/5",
  },
  {
    id: "flight-review-5",
    type: "Flight Booking",
    comment: "Multi-city planning feels cleaner than switching between pages.",
    author: "Farah N.",
    rating: "4.7/5",
  },
  {
    id: "flight-review-6",
    type: "Flight Booking",
    comment: "Fare, timing, and airline choices are simple to scan.",
    author: "Nikhil D.",
    rating: "4.8/5",
  },
];

const HOME_FLIGHT_FAQS = [
  {
    id: "flight-faq-1",
    question: "How do I search for flights online?",
    answer:
      "Choose source, destination, departure date, traveller count, and cabin class. For return or multi-city trips, add the extra dates and routes before searching.",
  },
  {
    id: "flight-faq-2",
    question: "Can I search one-way, round-trip, and multi-city flights?",
    answer:
      "Yes. The homepage flight form supports one-way, two-way, and multi-city trip planning with traveller and cabin class details.",
  },
  {
    id: "flight-faq-3",
    question: "What should I check before confirming a flight?",
    answer:
      "Review passenger names, travel dates, departure and arrival timing, fare rules, baggage details, and airline policy before payment.",
  },
  {
    id: "flight-faq-4",
    question: "Where do I complete web check-in?",
    answer:
      "Use the Web Check-In page to open the official airline check-in portal and download your boarding pass when the airline window opens.",
  },
];

const HOME_FLIGHT_APP_BENEFITS = [
  "Saved traveller and route preferences",
  "Quick access to PNR and web check-in",
  "Flight offers for domestic and international routes",
];

const POPULAR_HOTELS = [
  {
    id: "hotel-1",
    city: "Hyderabad",
    name: "Atlas Pearl Suites",
    summary: "Business-friendly stays near HITEC City with breakfast options.",
    searches: 1420,
    price: "3,499",
  },
  {
    id: "hotel-2",
    city: "Bengaluru",
    name: "Cobalt Garden Hotel",
    summary: "Calm rooms, workspace corners, and quick airport access.",
    searches: 1310,
    price: "4,199",
  },
  {
    id: "hotel-3",
    city: "Mumbai",
    name: "Harbour View Residency",
    summary: "Premium city stays with flexible check-in and sea-facing rooms.",
    searches: 1260,
    price: "5,299",
  },
  {
    id: "hotel-4",
    city: "Goa",
    name: "Coral Bay Retreat",
    summary: "Resort-style rooms close to beaches, cafes, and weekend routes.",
    searches: 1188,
    price: "4,899",
  },
  {
    id: "hotel-5",
    city: "Delhi",
    name: "Metro Nest Hotel",
    summary: "Clean city-center rooms for short stays and family travel.",
    searches: 1040,
    price: "2,999",
  },
  {
    id: "hotel-6",
    city: "Jaipur",
    name: "Heritage Courtyard Stay",
    summary: "Boutique comfort with local breakfast and sightseeing access.",
    searches: 920,
    price: "3,199",
  },
];

const HOTEL_HIGHLIGHTS = [
  {
    id: "hotel-highlight-1",
    icon: Search,
    value: "Matched",
    title: "Find Stays By City",
    text: "Search hotels by destination, check-in date, room count, and guest mix in one compact flow.",
  },
  {
    id: "hotel-highlight-2",
    icon: ShieldCheck,
    value: "Clear",
    title: "Review Stay Details",
    text: "Compare price, amenities, cancellation notes, and room highlights before choosing.",
  },
  {
    id: "hotel-highlight-3",
    icon: BedDouble,
    value: "Ready",
    title: "Rooms And Guests Together",
    text: "Keep rooms, adults, children, and dates visible while planning the stay.",
  },
  {
    id: "hotel-highlight-4",
    icon: MapPin,
    value: "Local",
    title: "City-Friendly Planning",
    text: "Scan popular city stays for business trips, family travel, weekend breaks, and stopovers.",
  },
];

const HOTEL_SERVICE_BLOCKS = [
  {
    id: "hotel-search",
    kicker: "Hotel Desk Services",
    title: "Search Stays By City, Date, And Guest Plan",
    text:
      "Choose the destination, check-in, check-out, rooms, and guests before opening hotel results built for city stays.",
    points: [
      "Destination and hotel-area search",
      "Check-in and check-out date clarity",
      "Rooms and guests ready before results",
    ],
    visual: "route",
    image: hotelServiceSearch,
    imageAlt: "Hotel destination search card with stay dates",
  },
  {
    id: "hotel-fares",
    kicker: "Stay Clarity",
    title: "Compare Rooms, Amenities, And Nightly Price",
    text:
      "Scan budget, business, family, boutique, and premium stays with amenities and cancellation notes close to the price.",
    points: [
      "Budget Rooms",
      "Business Hotels",
      "Family Stays",
      "Boutique Hotels",
      "Breakfast Included",
      "Flexible Cancellation",
    ],
    visual: "fare",
    image: hotelServiceRooms,
    imageAlt: "Hotel room comparison cards with prices and amenities",
  },
  {
    id: "hotel-ready",
    kicker: "Before You Check In",
    title: "Keep Check-In Details Ready For Arrival",
    text:
      "Review city, dates, rooms, guests, amenities, and booking references before the stay begins.",
    points: [
      "Check stay dates before selection",
      "Review room and guest details",
      "Keep booking reference handy",
      "Use saved cities for repeat trips",
    ],
    visual: "traveller",
    image: hotelServiceCheckin,
    imageAlt: "Hotel check-in card with luggage and stay details",
  },
];

const HOTEL_BOOKING_STEPS = [
  {
    id: "hotel-step-1",
    title: "Search Stays",
    text: "Enter destination, check-in, check-out, rooms, and guests to open matching hotel options.",
  },
  {
    id: "hotel-step-2",
    title: "Compare Comfort",
    text: "Review amenities, city location, breakfast notes, cancellation terms, and nightly price.",
  },
  {
    id: "hotel-step-3",
    title: "Confirm The Stay",
    text: "Keep guest details, stay dates, fare summary, and booking reference ready for check-in.",
  },
];

const HOTEL_GUIDE_NOTES = [
  {
    id: "hotel-note-1",
    title: "Better Date Planning",
    text: "Hotel price and availability can shift quickly around weekends, events, and holidays. Compare nearby dates before locking the stay.",
  },
  {
    id: "hotel-note-2",
    title: "Choose Beyond Price",
    text: "Check location, breakfast, cancellation rules, room type, guest policy, and check-in timing so the stay matches the actual trip.",
  },
];

const HOTEL_ASSURANCE_POINTS = [
  {
    id: "hotel-assurance-1",
    icon: ShieldCheck,
    title: "Stay Details",
    text: "Dates, guests, room count, and city stay visible before results.",
  },
  {
    id: "hotel-assurance-2",
    icon: BedDouble,
    title: "Room Ready",
    text: "Compare comfort, amenities, and nightly prices clearly.",
  },
  {
    id: "hotel-assurance-3",
    icon: RefreshCw,
    title: "Change Flexible",
    text: "Review flexible cancellation and date choices before booking.",
  },
];

const HOTEL_REVIEWS = [
  {
    id: "hotel-review-1",
    type: "Hotel Booking",
    comment: "The room and guest selector made family stay planning simple.",
    author: "Ishita R.",
    rating: "4.8/5",
  },
  {
    id: "hotel-review-2",
    type: "Hotel Booking",
    comment: "City hotel cards are easy to scan for budget and amenities.",
    author: "Manoj S.",
    rating: "4.7/5",
  },
  {
    id: "hotel-review-3",
    type: "Hotel Booking",
    comment: "Check-in and check-out dates stayed clear through the search.",
    author: "Kavya P.",
    rating: "4.9/5",
  },
  {
    id: "hotel-review-4",
    type: "Hotel Booking",
    comment: "Popular stays helped me choose quickly for a weekend trip.",
    author: "Arjun V.",
    rating: "4.8/5",
  },
  {
    id: "hotel-review-5",
    type: "Hotel Booking",
    comment: "The hotel results page feels consistent with bus and flight.",
    author: "Naina K.",
    rating: "4.7/5",
  },
  {
    id: "hotel-review-6",
    type: "Hotel Booking",
    comment: "Good flow for comparing city stays without clutter.",
    author: "Dev M.",
    rating: "4.8/5",
  },
];

const HOME_HOTEL_FAQS = [
  {
    id: "hotel-faq-1",
    question: "How do I search for hotels online?",
    answer:
      "Choose a destination, check-in date, check-out date, rooms, and guests. The hotel results page shows matching stays with price and amenity details.",
  },
  {
    id: "hotel-faq-2",
    question: "Can I search by rooms and guests?",
    answer:
      "Yes. The hotel form includes a rooms and guests selector for adults, children, and room count.",
  },
  {
    id: "hotel-faq-3",
    question: "What should I check before selecting a hotel?",
    answer:
      "Review stay dates, guest count, room type, nightly price, amenities, cancellation notes, and check-in timing before confirming.",
  },
  {
    id: "hotel-faq-4",
    question: "Can I compare popular city stays?",
    answer:
      "Yes. The hotel mode includes popular city stays and a hotel results page for quick comparison.",
  },
];

const HOME_HOTEL_APP_BENEFITS = [
  "Saved city stay preferences",
  "Room and guest presets",
  "Hotel offers for business and weekend trips",
];

const HOME_MODE_CONTENT = {
  buses: {
    mode: "buses",
    Icon: Bus,
    heroTitleStart: "Collect Moments, ",
    heroTitleEnd: "Not Just Miles.",
    heroSubtitle: "The best journeys aren’t measured in kilometres. They’re measured in the moments that quietly stay with us.",
    heroTags: ["Live Bus Tracking", "Seat Selection", "Boarding Clarity"],
    valueProps: [
      { icon: Bus, title: "Comfortable Journey", desc: "Spacious seats and premium comfort" },
      { icon: ShieldCheck, title: "Safe & Secure", desc: "Your safety is our top priority" },
      { icon: Clock, title: "On Time Performance", desc: "Punctual buses, always on time" },
      { icon: IndianRupee, title: "Best Price Guarantee", desc: "Get the best deals for your journey" }
    ],
    features: [],
    insightsTitle: "Make every bus booking feel clear before you pay.",
    insightsText:
      "Pick N Book helps users compare the full bus journey, not just the price, so the final booking feels easier to trust.",
    highlights: HIGHLIGHTS,
    services: HOME_SERVICE_BLOCKS,
    serviceHeading: "Plan, compare, and book buses with clearer choices",
    guideHeading: "Book Bus Tickets With Less Guesswork",
    guideIntro:
      "A good bus booking flow should help you compare routes quickly, understand the fare clearly, and confirm the ticket without hunting for details later.",
    bookingSteps: HOME_BOOKING_STEPS,
    guideNotes: HOME_GUIDE_NOTES,
    assuranceBadge: "Bus Travel Assured",
    assuranceEnding: "Book bus tickets with confidence",
    assuranceMapLabel: "Live journey view",
    assurancePoints: HOME_ASSURANCE_POINTS,
    assuranceProofs: [
      ["Details verified", "Fare, pickup point, and rules are easy to review."],
      ["Timing matched", "Departure and arrival stay easy to scan."],
      ["Change-ready plan", "Review flexibility before confirming."],
      ["Ticket ready", "Saved in one place after booking."],
    ],
    reviews: REVIEWS,
    faqHeading: "Online Bus Booking FAQs",
    faqs: HOME_BUS_FAQS,
    appKicker: "Quick Booking",
    appTitle: "Book buses faster",
    appText:
      "Save routes, compare fares, and keep tickets ready for city-to-city journeys.",
    appOffer: "Code TRAVELFIRST",
    appBenefits: HOME_APP_BENEFITS,
    aboutTitle: "About Pick N Book Bus Booking",
    aboutParagraphs: [
      "Pick N Book bus booking mode helps you compare routes, fares, travel duration, and seat availability from top private operators and state transport corporations.",
      "With direct operator mappings, clear cancellation terms, boarding clarity, and secure payments, we make city-to-city road travel easy and reliable."
    ],
    bannerBadge: "INTERCITY BUS & SEAT GUARANTEE",
    bannerTitle: "Book Bus Tickets Smarter. Travel Farther.",
    bannerText: "Join over 10 Lakh+ happy passengers who trust Pick N Book for comfortable AC Volvo, sleeper, and luxury bus bookings across 5,000+ routes.",
    bannerStats: [
      ["99.8%", "On-Time Departure"],
      ["5,000+", "Daily Bus Routes"],
      ["0%", "Hidden Fees"],
    ],
    bannerImage: busCoastBanner,
    bannerAlt: "Luxury Bus Travel",
  },
  flights: {
    mode: "flights",
    Icon: Plane,
    heroTitleStart: "Pack Your Dreams, ",
    heroTitleEnd: "We'll Handle the Journey.",
    heroSubtitle: "Book your next flight with ease.",
    heroTags: ["Domestic Flights", "International Routes", "Instant Booking"],
    valueProps: [
      { icon: Plane, title: "Wide Airline Network", desc: "Top carriers across popular routes" },
      { icon: ShieldCheck, title: "Safe & Secure", desc: "Your safety is our top priority" },
      { icon: Clock, title: "On Time Performance", desc: "Punctual flights, always on time" },
      { icon: IndianRupee, title: "Best Price Guarantee", desc: "Get the best deals for your journey" }
    ],
    features: [],
    insightsTitle: "Make every flight search feel organized before you book.",
    insightsText:
      "Pick N Book brings fare comparison, traveller details, cabin choices, and airline actions into a calmer flight booking flow.",
    highlights: FLIGHT_HIGHLIGHTS,
    services: FLIGHT_SERVICE_BLOCKS,
    serviceHeading: "Plan, compare, and book flights with clearer choices",
    guideHeading: "Book Flights With Less Guesswork",
    guideIntro:
      "A good flight booking flow should help you compare timing, fare, cabin class, traveller details, and airline actions before payment.",
    bookingSteps: FLIGHT_BOOKING_STEPS,
    guideNotes: FLIGHT_GUIDE_NOTES,
    assuranceBadge: "Flight Travel Assured",
    assuranceEnding: "Book flights with confidence",
    assuranceMapLabel: "Flight journey view",
    assurancePoints: FLIGHT_ASSURANCE_POINTS,
    assuranceProofs: [
      ["PNR checked", "Booking reference and passenger details stay easy to find."],
      ["Schedule matched", "Departure, arrival, and route timing are simple to scan."],
      ["Cabin ready", "Traveller count and cabin class stay visible before search."],
      ["Check-in ready", "Official airline check-in stays close when you need it."],
    ],
    reviews: FLIGHT_REVIEWS,
    faqHeading: "Online Flight Booking FAQs",
    faqs: HOME_FLIGHT_FAQS,
    appKicker: "Flight Desk",
    appTitle: "Plan flights faster on your next trip",
    appText:
      "Save frequent flight routes, compare airline choices, and keep PNR and check-in actions ready.",
    appOffer: "Use code FLYFIRST",
    appBenefits: HOME_FLIGHT_APP_BENEFITS,
    aboutTitle: "About Pick N Book Flight Booking",
    aboutParagraphs: [
      "Pick N Book flight mode provides a clean search and comparison flow for domestic and international flights, helping you compare carriers, dates, and fare options.",
      "Manage booking passenger details, select your seats, view cabin class conditions, and complete check-in procedures directly from your personalized portal."
    ],
    bannerBadge: "FLIGHT DESK & PASSENGER GUARANTEE",
    bannerTitle: "Book Flights Smarter. Fly Higher.",
    bannerText: "Join over 10 Lakh+ happy passengers who trust Pick N Book for domestic & international flights with real-time fare comparison and web check-in.",
    bannerStats: [
      ["99.9%", "Flight Reliability"],
      ["500+", "Global Airlines"],
      ["0%", "Hidden Fees"],
    ],
    bannerImage: flightSectionNewBanner,
    bannerAlt: "Worldwide Flight Desk",
  },
  hotels: {
    mode: "hotels",
    Icon: Building2,
    heroTitleStart: "Stay Beyond ",
    heroTitleEnd: "The Ordinary.",
    heroSubtitle: "Book premium hotel rooms with best prices, verified stays, easy cancellation, and secure booking.",
    heroTags: ["Premium Stays", "Verified Rooms", "Boarding Clarity"],
    valueProps: [
      { icon: BedDouble, title: "Comfortable Stay", desc: "Premium rooms and premium comfort" },
      { icon: ShieldCheck, title: "Safe & Secure", desc: "Your safety is our top priority" },
      { icon: Clock, title: "Flexible Timings", desc: "Easy check-in, check-out" },
      { icon: IndianRupee, title: "Best Price Guarantee", desc: "Get the best deals for your stay" }
    ],
    features: [],
    insightsTitle: "Make every hotel search feel clear before you choose.",
    insightsText:
      "Pick N Book hotel mode brings destination, dates, room count, guest details, and stay choices into the same calm booking flow.",
    highlights: HOTEL_HIGHLIGHTS,
    services: HOTEL_SERVICE_BLOCKS,
    serviceHeading: "Plan, compare, and book hotels with clearer choices",
    guideHeading: "Book Hotels With Less Guesswork",
    guideIntro:
      "A good hotel booking flow should help you compare city stays, dates, rooms, guest counts, amenities, and fare notes before you select a stay.",
    bookingSteps: HOTEL_BOOKING_STEPS,
    guideNotes: HOTEL_GUIDE_NOTES,
    assuranceBadge: "Hotel Stay Assured",
    assuranceEnding: "Book hotel stays with confidence",
    assuranceMapLabel: "Stay planning view",
    assurancePoints: HOTEL_ASSURANCE_POINTS,
    assuranceProofs: [
      ["Dates checked", "Check-in and check-out stay visible before results."],
      ["Guests matched", "Rooms, adults, and children are easy to review."],
      ["Comfort compared", "Amenities and stay notes stay close to the price."],
      ["Stay ready", "Booking reference and city details stay in one place."],
    ],
    reviews: HOTEL_REVIEWS,
    faqHeading: "Online Hotel Booking FAQs",
    faqs: HOME_HOTEL_FAQS,
    appKicker: "Hotel Desk",
    appTitle: "Plan hotel stays faster",
    appText:
      "Save favourite cities, compare stay options, and keep room and guest details ready.",
    appOffer: "Use code STAYFIRST",
    appBenefits: HOME_HOTEL_APP_BENEFITS,
    aboutTitle: "About Pick N Book Hotel Booking",
    aboutParagraphs: [
      "Pick N Book hotel mode is built for destination-first stay planning with clear dates, room counts, guest details, popular city stays, and simple results.",
      "Whether it is a business trip, weekend break, family stay, or stopover, hotel mode keeps room choices, stay dates, amenities, and booking details easy to compare.",
    ],
    bannerBadge: "STAY & ROOM CONFIRMATION GUARANTEE",
    bannerTitle: "Book Hotels Smarter. Stay Better.",
    bannerText: "Join over 10 Lakh+ happy travelers who trust Pick N Book for verified hotel stays, luxury resorts, and instant check-in confirmation.",
    bannerStats: [
      ["100%", "Stay Assurance"],
      ["10,000+", "Verified Stays"],
      ["0%", "Hidden Fees"],
    ],
    bannerImage: hotelSectionBanner,
    bannerAlt: "Luxury Hotel Stays",
  },
};

function getDateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function normalizeHomeTab(value) {
  return ["flights", "buses", "hotels"].includes(value) ? value : "buses";
}

function createMultiCityLeg(from, to, offsetDays) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    from,
    to,
    departureDate: "",
  };
}

function formatTravellerSummary(adults, children, infants) {
  if (adults <= 0 && children <= 0 && infants <= 0) {
    return "";
  }

  const parts = [`${adults} ${adults > 1 ? "Adults" : "Adult"}`];

  if (children > 0) {
    parts.push(`${children} ${children > 1 ? "Children" : "Child"}`);
  }

  if (infants > 0) {
    parts.push(`${infants} ${infants > 1 ? "Infants" : "Infant"}`);
  }

  return parts.join(", ");
}

function formatHotelGuestSummary(rooms, adults, children) {
  if (!rooms || !adults) return "";
  const roomPart = `${rooms} ${rooms > 1 ? "Rooms" : "Room"}`;
  const adultPart = `${adults} ${adults > 1 ? "Adults" : "Adult"}`;
  const childPart =
    children > 0 ? `, ${children} ${children > 1 ? "Children" : "Child"}` : "";

  return `${roomPart}, ${adultPart}${childPart}`;
}

function getStaticAiReply(message) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("hi") ||
    normalized.includes("hello") ||
    normalized.includes("hey")
  ) {
    return "Hello. I can help with flights, buses, hotels, fares, and booking flow questions.";
  }

  if (
    normalized.includes("flight") ||
    normalized.includes("airline") ||
    normalized.includes("plane")
  ) {
    return "For flights, share source, destination, and travel dates. I can suggest one-way, round-trip, or multi-city flow.";
  }

  if (
    normalized.includes("bus") ||
    normalized.includes("rtc") ||
    normalized.includes("seat")
  ) {
    return "For buses, tell me your route and travel date. I can guide you to seat selection and payment steps.";
  }

  if (
    normalized.includes("price") ||
    normalized.includes("fare") ||
    normalized.includes("cost") ||
    normalized.includes("offer")
  ) {
    return "You can compare fares from the search results page and use active offers shown in the Featured Offers section.";
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("refund") ||
    normalized.includes("reschedule")
  ) {
    return "For cancellation or refunds, go to your bookings section and choose the specific trip to view refund details.";
  }

  return "This is a static AI demo reply. Once your API is connected, I will respond with dynamic answers.";
}

function getInitialAiChatMessages() {
  return [
    {
      id: `ai-welcome-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: "assistant",
      text: "Hi, I am Travel AI. Ask me anything about flights, buses, or hotel bookings.",
    },
  ];
}

function getFeaturedOffersPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload?.$values)) {
    return payload.$values;
  }

  if (Array.isArray(payload?.offers)) {
    return payload.offers;
  }

  if (Array.isArray(payload?.Offers)) {
    return payload.Offers;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.Data)) {
    return payload.Data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.Items)) {
    return payload.Items;
  }

  if (Array.isArray(payload?.value)) {
    return payload.value;
  }

  if (Array.isArray(payload?.Value)) {
    return payload.Value;
  }

  const nestedPayloads = [
    payload?.result,
    payload?.Result,
    payload?.results,
    payload?.Results,
    payload?.payload,
    payload?.Payload,
    payload?.response,
    payload?.Response,
    payload?.data?.$values,
    payload?.Data?.$values,
    payload?.data?.items,
    payload?.Data?.Items,
    payload?.data?.offers,
    payload?.Data?.Offers,
  ];

  for (const nestedPayload of nestedPayloads) {
    const nestedOffers = getFeaturedOffersPayload(nestedPayload);
    if (nestedOffers.length > 0) {
      return nestedOffers;
    }
  }

  return [];
}

function pickOfferValue(source, keys, fallback = "") {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
  }

  return fallback;
}

function normalizeOfferActiveFlag(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalized = String(value).trim().toLowerCase();
  return !["false", "0", "no", "inactive", "disabled", "expired"].includes(normalized);
}

function cleanFeaturedOfferImageUrl(value) {
  let text = String(value || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/%22/gi, "")
    .replace(/\\/g, "/")
    .replace(/^~\//, "/");

  if (!text) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(text)) {
    return text;
  }

  text = text
    .replace(/^.*\/wwwroot\//i, "/")
    .replace(/^\/?wwwroot\//i, "/")
    .replace(/^\/?public\//i, "/");

  if (
    new RegExp(`^(${FEATURED_OFFER_ASSET_PATHS.join("|")})/`, "i").test(text)
  ) {
    return `/${text}`;
  }

  return text;
}

function isNgrokHostname(hostname) {
  const normalizedHostname = String(hostname || "").toLowerCase();
  return (
    normalizedHostname.includes("ngrok-free.dev") ||
    normalizedHostname.includes("ngrok.io")
  );
}

function shouldProxyFeaturedOfferImagePath(pathname) {
  const normalizedPath = String(pathname || "").replace(/^\/+/, "");
  return FEATURED_OFFER_ASSET_PATHS.some((prefix) =>
    normalizedPath.toLowerCase().startsWith(`${prefix.toLowerCase()}/`),
  );
}

function resolveFeaturedOfferImageSrc(imageUrl) {
  const cleanUrl = cleanFeaturedOfferImageUrl(imageUrl);

  if (!cleanUrl) {
    return "";
  }

  if (/^(data:|blob:)/i.test(cleanUrl)) {
    return cleanUrl;
  }

  let resolved = cleanUrl;

  if (!/^(https?:)/i.test(cleanUrl)) {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      resolved = `${window.location.origin}${cleanUrl.startsWith("/") ? "" : "/"}${cleanUrl}`;
    } else {
      resolved = toApiUrl(cleanUrl);
    }
  }

  if (resolved && (resolved.includes("ngrok") || resolved.includes("ngrok-free.dev"))) {
    const sep = resolved.includes("?") ? "&" : "?";
    if (!resolved.includes("ngrok-skip-browser-warning")) {
      resolved = `${resolved}${sep}ngrok-skip-browser-warning=true`;
    }
  }

  return resolved;
}

function formatExpiryDate(dateStr) {
  if (!dateStr) return "Limited time offer";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Limited time offer";
    const options = { day: "numeric", month: "short", year: "numeric" };
    return `Valid till ${date.toLocaleDateString("en-US", options)}`;
  } catch (e) {
    return "Limited time offer";
  }
}

function normalizeFeaturedOffer(offer, index) {
  const id =
    pickOfferValue(offer, ["id", "Id", "offerId", "OfferId", "offerCode", "OfferCode"]) ||
    `offer-${index}`;
  const bookingType = pickOfferValue(offer, ["bookingType", "BookingType"]);
  const isActive =
    offer?.isCouponActive ??
    offer?.IsCouponActive ??
    offer?.isActive ??
    offer?.IsActive ??
    true;
  const imageUrl = pickOfferValue(offer, [
    "imageUrl",
    "ImageUrl",
    "imageURL",
    "ImageURL",
    "image",
    "Image",
    "imagePath",
    "ImagePath",
    "offerImageUrl",
    "OfferImageUrl",
    "bannerImageUrl",
    "BannerImageUrl",
    "bannerImage",
    "BannerImage",
    "banner",
    "Banner",
    "imgUrl",
    "ImgUrl",
    "pictureUrl",
    "PictureUrl",
    "mediaUrl",
    "MediaUrl",
    "thumbnailUrl",
    "ThumbnailUrl",
  ]);

  const promo = offer?.promotion ?? offer?.Promotion ?? null;

  const promotionId = offer?.promotionId ?? offer?.PromotionId ?? promo?.id ?? promo?.Id ?? null;
  const promotionCode = offer?.promotionCode ?? offer?.PromotionCode ?? promo?.code ?? promo?.Code ?? null;
  const promotionTitle = offer?.promotionTitle ?? offer?.PromotionTitle ?? promo?.title ?? promo?.Title ?? null;
  const promotionType = offer?.promotionType ?? offer?.PromotionType ?? promo?.promotionType ?? promo?.PromotionType ?? null;
  const discountType = offer?.discountType ?? offer?.DiscountType ?? promo?.discountType ?? promo?.DiscountType ?? null;
  const discountValue = offer?.discountValue ?? offer?.DiscountValue ?? promo?.discountValue ?? promo?.DiscountValue ?? null;
  const maxDiscountAmount = offer?.maxDiscountAmount ?? offer?.MaxDiscountAmount ?? promo?.maxDiscountAmount ?? promo?.MaxDiscountAmount ?? null;
  const minBookingAmount = offer?.minBookingAmount ?? offer?.MinBookingAmount ?? promo?.minBookingAmount ?? promo?.MinBookingAmount ?? null;
  const previewFinalPrice = offer?.previewFinalPrice ?? offer?.PreviewFinalPrice ?? null;
  const rawConditions = offer?.conditions ?? offer?.Conditions ?? [];
  const conditions = Array.isArray(rawConditions)
    ? rawConditions.map((cond) => {
      const typeRaw = cond?.conditionType ?? cond?.ConditionType;
      const opRaw = cond?.conditionOperator ?? cond?.ConditionOperator;

      let conditionType = String(typeRaw || "");
      if (typeRaw === 1 || conditionType.toLowerCase() === "sourcecity") {
        conditionType = "SourceCity";
      } else if (typeRaw === 2 || conditionType.toLowerCase() === "destinationcity") {
        conditionType = "DestinationCity";
      } else if (typeRaw === 3 || conditionType.toLowerCase() === "bustype") {
        conditionType = "BusType";
      } else if (typeRaw === 4 || conditionType.toLowerCase() === "traveldate") {
        conditionType = "TravelDate";
      }

      let conditionOperator = String(opRaw || "Equals");
      if (opRaw === 1 || conditionOperator.toLowerCase() === "equals") {
        conditionOperator = "Equals";
      } else if (opRaw === 2 || conditionOperator.toLowerCase() === "contains") {
        conditionOperator = "Contains";
      } else if (opRaw === 3 || conditionOperator.toLowerCase() === "between") {
        conditionOperator = "Between";
      }

      return {
        id: cond?.id ?? cond?.Id,
        featuredOfferId: cond?.featuredOfferId ?? cond?.FeaturedOfferId,
        conditionType,
        conditionOperator,
        value1: cond?.value1 ?? cond?.Value1 ?? "",
        value2: cond?.value2 ?? cond?.Value2 ?? "",
        isActive: cond?.isActive ?? cond?.IsActive ?? true,
      };
    })
    : [];

  return {
    id,
    offerCode: pickOfferValue(offer, ["offerCode", "OfferCode", "offerId", "OfferId"]),
    title: pickOfferValue(offer, ["title", "Title", "name", "Name"], "Travel Offer"),
    subtitle: pickOfferValue(offer, ["subtitle", "Subtitle"]),
    description: pickOfferValue(offer, ["description", "Description", "subtitle", "Subtitle"]),
    couponCode: pickOfferValue(offer, ["couponCode", "CouponCode", "code", "Code"]) || promotionCode,
    imageUrl: resolveFeaturedOfferImageSrc(imageUrl),
    bookingType,
    isActive: normalizeOfferActiveFlag(isActive),
    couponExpiresAtUtc: pickOfferValue(offer, ["couponExpiresAtUtc", "CouponExpiresAtUtc"]) || promo?.endDateUtc || promo?.EndDateUtc || null,
    startDateUtc: pickOfferValue(offer, ["startDateUtc", "StartDateUtc"]) || promo?.startDateUtc || promo?.StartDateUtc || null,
    endDateUtc: pickOfferValue(offer, ["endDateUtc", "EndDateUtc"]) || promo?.endDateUtc || promo?.EndDateUtc || null,
    promotionId,
    promotionCode,
    promotionTitle,
    promotionType,
    discountType,
    discountValue,
    maxDiscountAmount,
    minBookingAmount,
    previewFinalPrice,
    conditions
  };
}

function AutoMarquee({ items, className, duration, renderItem, pauseOnHover = true }) {
  const marqueeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const draggedClickRef = useRef(false);
  const hoveredRef = useRef(false);
  const momentumRef = useRef(0);
  const dragStateRef = useRef({
    active: false,
    dragged: false,
    pointerId: null,
    startX: 0,
    lastX: 0,
    lastTime: 0,
    scrollLeft: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const loopItems = [...items, ...items, ...items];

  const normalizeMarqueeScroll = (node) => {
    if (!node || node.scrollWidth <= node.clientWidth) {
      return;
    }

    const segmentWidth = node.scrollWidth / 3;

    if (segmentWidth <= 0) {
      return;
    }

    if (node.scrollLeft < segmentWidth * 0.5) {
      node.scrollLeft += segmentWidth;
    } else if (node.scrollLeft > segmentWidth * 1.5) {
      node.scrollLeft -= segmentWidth;
    }
  };

  useEffect(() => {
    const node = marqueeRef.current;

    if (!node || items.length === 0) {
      return undefined;
    }

    const segmentWidth = node.scrollWidth / 3;
    if (segmentWidth > 0) {
      node.scrollLeft = segmentWidth;
    }

    let previousTime = performance.now();

    const animate = (time) => {
      const currentNode = marqueeRef.current;
      const elapsed = Math.min(time - previousTime, 32);
      previousTime = time;

      if (currentNode && currentNode.scrollWidth > currentNode.clientWidth) {
        const state = dragStateRef.current;

        if (!state.active) {
          if (Math.abs(momentumRef.current) > 0.02) {
            currentNode.scrollLeft += momentumRef.current * elapsed;
            momentumRef.current *= Math.pow(0.92, elapsed / 16.67);
          } else if (!pauseOnHover || !hoveredRef.current) {
            const loopWidth = currentNode.scrollWidth / 3;
            const pixelsPerMs = loopWidth / Math.max(duration * 1000, 1);
            currentNode.scrollLeft += pixelsPerMs * elapsed;
          }

          normalizeMarqueeScroll(currentNode);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [items, duration]);

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const target = event.target;
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("button") ||
      target.closest("a")
    ) {
      return;
    }

    const node = marqueeRef.current;
    if (!node) {
      return;
    }

    momentumRef.current = 0;
    dragStateRef.current = {
      active: true,
      dragged: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: performance.now(),
      scrollLeft: node.scrollLeft,
    };
    draggedClickRef.current = false;
    setIsDragging(true);
    node.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const state = dragStateRef.current;
    const node = marqueeRef.current;

    if (!state.active || !node) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    const now = performance.now();
    const frameElapsed = Math.max(now - state.lastTime, 1);

    if (Math.abs(deltaX) > 15) {
      state.dragged = true;
      draggedClickRef.current = true;
      event.preventDefault();
    }

    node.scrollLeft = state.scrollLeft - deltaX;
    momentumRef.current = -((event.clientX - state.lastX) / frameElapsed);
    state.lastX = event.clientX;
    state.lastTime = now;
    normalizeMarqueeScroll(node);
  };

  const endDrag = (event) => {
    const state = dragStateRef.current;
    const node = marqueeRef.current;

    if (node && state.pointerId !== null) {
      node.releasePointerCapture?.(state.pointerId);
    }

    dragStateRef.current = {
      active: false,
      dragged: false,
      pointerId: null,
      startX: 0,
      lastX: 0,
      lastTime: 0,
      scrollLeft: 0,
    };
    setIsDragging(false);
  };

  const handleClickCapture = (event) => {
    if (draggedClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      draggedClickRef.current = false;
    }
  };

  return (
    <div
      ref={marqueeRef}
      className={`marquee ${className} ${isDragging ? "is-dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
      onClickCapture={handleClickCapture}
      role="region"
      aria-label="Draggable carousel"
    >
      <div
        className="marquee-track"
        style={{ "--marquee-duration": `${duration}s` }}
      >
        {loopItems.map((item, index) => (
          <div className="marquee-slide" key={`${item.id}-${index}`}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedOfferImage({ offer }) {
  const [failed, setFailed] = useState(false);
  const hasImage = offer.imageUrl && !failed;

  useEffect(() => {
    setFailed(false);
  }, [offer.imageUrl]);

  if (!hasImage) {
    return (
      <div className="offer-image-placeholder">
        <span>{offer.bookingType || "Offer"}</span>
      </div>
    );
  }

  return (
    <img
      src={resolveFeaturedOfferImageSrc(offer.imageUrl)}
      alt={offer.title}
      onError={() => setFailed(true)}
    />
  );
}

const formatFlightDate = (dateStr) => {
  if (!dateStr) return { date: "DD/MM/YYYY", day: "" };
  try {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return { date: dateStr, day: "" };
    const options = { day: "numeric", month: "short", year: "numeric" };
    const formattedDate = dateObj.toLocaleDateString("en-GB", options);
    const weekday = dateObj.toLocaleDateString("en-GB", { weekday: "long" });
    return { date: formattedDate, day: weekday };
  } catch (e) {
    return { date: dateStr, day: "" };
  }
};

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = normalizeHomeTab(searchParams.get("tab"));

  const { selectedOffer, setSelectedOffer } = usePromo();
  const aiChatMessagesRef = useRef(null);
  const aiReplyTimerRef = useRef(null);
  const aiChatShellRef = useRef(null);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiChatInput, setAiChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState(
    getInitialAiChatMessages,
  );

  const [flightTripType, setFlightTripType] = useState("oneway");
  const [flightFrom, setFlightFrom] = useState("");
  const [flightTo, setFlightTo] = useState("");
  const [flightFromError, setFlightFromError] = useState("");
  const [flightToError, setFlightToError] = useState("");
  const [flightDepartureDate, setFlightDepartureDate] = useState("");
  const [flightReturnDate, setFlightReturnDate] = useState("");

  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabinClass, setCabinClass] = useState("");
  const [showTravellerDropdown, setShowTravellerDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const travellerFieldRef = useRef(null);
  const classFieldRef = useRef(null);

  const [multiCityLegs, setMultiCityLegs] = useState(() => [
    createMultiCityLeg("", "", 0),
    createMultiCityLeg("", "", 2),
  ]);

  const [busTripType, setBusTripType] = useState("oneway");
  const [busFrom, setBusFrom] = useState("");
  const [busTo, setBusTo] = useState("");
  const [busFromError, setBusFromError] = useState("");
  const [busToError, setBusToError] = useState("");
  const [busDepartureDate, setBusDepartureDate] = useState("");
  const [busReturnDate, setBusReturnDate] = useState("");

  const state = location.state || {};

  const [featuredOffers, setFeaturedOffers] = useState([]);
  const [featuredOffersLoading, setFeaturedOffersLoading] = useState(false);
  const [featuredOffersError, setFeaturedOffersError] = useState("");
  const [offersFilter, setOffersFilter] = useState("all");
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [popularRoutesLoading, setPopularRoutesLoading] = useState(false);
  const [popularRoutesError, setPopularRoutesError] = useState("");
  const [popularFlights, setPopularFlights] = useState([]);
  const [popularFlightsLoading, setPopularFlightsLoading] = useState(false);
  const [popularFlightsError, setPopularFlightsError] = useState("");
  const [popularHotels, setPopularHotels] = useState([]);
  const [popularHotelsLoading, setPopularHotelsLoading] = useState(false);
  const [popularHotelsError, setPopularHotelsError] = useState("");
  const [isDealsDialogOpen, setIsDealsDialogOpen] = useState(false);
  const [offerForDetailPopup, setOfferForDetailPopup] = useState(null);
  const [copied, setCopied] = useState(false);

  const [selectedRtcOperator, setSelectedRtcOperator] = useState(null);
  const [rtcSearchFrom, setRtcSearchFrom] = useState("");
  const [rtcSearchTo, setRtcSearchTo] = useState("");
  const [rtcSearchDate, setRtcSearchDate] = useState(() => getDateInputValue(1));
  const [selectedBusTypes, setSelectedBusTypes] = useState([]);

  const [dragState, setDragState] = useState({ isDown: false, startX: 0, scrollLeft: 0 });
  const [clickPrevented, setClickPrevented] = useState(false);
  const [downCoords, setDownCoords] = useState({ x: 0, y: 0 });

  const handleDragStart = (e) => {
    const container = e.currentTarget;
    setDragState({
      isDown: true,
      startX: e.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft
    });
    setDownCoords({ x: e.clientX, y: e.clientY });
    setClickPrevented(false);
  };

  const handleDragEnd = () => {
    setDragState(prev => ({ ...prev, isDown: false }));
  };

  const handleDragMove = (e) => {
    if (!dragState.isDown) return;
    e.preventDefault();
    const container = e.currentTarget;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragState.startX) * 1.5;
    container.scrollLeft = dragState.scrollLeft - walk;

    if (Math.abs(e.clientX - downCoords.x) > 5 || Math.abs(e.clientY - downCoords.y) > 5) {
      setClickPrevented(true);
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch (err) {
        console.error("Failed to copy", err);
      }
      document.body.removeChild(el);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderOfferConditions = (offer) => {
    const list = [];
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
    };

    // Valid for booking type
    if (offer.bookingType) {
      list.push(
        <li key="booking-type">
          Valid on <strong>{offer.bookingType.charAt(0).toUpperCase() + offer.bookingType.slice(1)}</strong> bookings.
        </li>
      );
    }

    // Discount details
    if (offer.discountValue > 0) {
      if (offer.discountType === "Percentage" || String(offer.discountType).toLowerCase() === "percentage") {
        list.push(
          <li key="discount-val">
            Get a <strong>{offer.discountValue}%</strong> discount on your booking.
          </li>
        );
      } else {
        list.push(
          <li key="discount-val">
            Get a flat <strong>â‚¹{offer.discountValue}</strong> discount on your booking.
          </li>
        );
      }
    }

    // Min booking amount
    if (offer.minBookingAmount > 0) {
      list.push(
        <li key="min-booking">
          Minimum booking amount of <strong>â‚¹{offer.minBookingAmount}</strong> required.
        </li>
      );
    }

    // Max discount amount
    if (offer.maxDiscountAmount > 0) {
      list.push(
        <li key="max-discount">
          Maximum discount limit is <strong>â‚¹{offer.maxDiscountAmount}</strong>.
        </li>
      );
    }

    // Backend condition rules
    if (Array.isArray(offer.conditions)) {
      offer.conditions.forEach((cond, idx) => {
        if (cond.isActive === false) return;
        const key = `cond-${idx}`;
        if (cond.conditionType === "SourceCity" && cond.value1) {
          if (cond.value2) {
            list.push(
              <li key={key}>
                Valid only for travel originating from <strong>{cond.value1}</strong> or <strong>{cond.value2}</strong>.
              </li>
            );
          } else {
            list.push(
              <li key={key}>
                Valid only for travel originating from <strong>{cond.value1}</strong>.
              </li>
            );
          }
        } else if (cond.conditionType === "DestinationCity" && cond.value1) {
          if (cond.value2) {
            list.push(
              <li key={key}>
                Valid only for travel to <strong>{cond.value1}</strong> or <strong>{cond.value2}</strong>.
              </li>
            );
          } else {
            list.push(
              <li key={key}>
                Valid only for travel to <strong>{cond.value1}</strong>.
              </li>
            );
          }
        } else if (cond.conditionType === "TravelDate" && cond.value1) {
          if (cond.value2) {
            list.push(
              <li key={key}>
                Valid for travel dates between <strong>{formatDate(cond.value1)}</strong> and <strong>{formatDate(cond.value2)}</strong>.
              </li>
            );
          } else {
            list.push(
              <li key={key}>
                Valid for travel dates on or before <strong>{formatDate(cond.value1)}</strong>.
              </li>
            );
          }
        } else if (cond.conditionType === "BusType" && cond.value1) {
          if (cond.value2) {
            list.push(
              <li key={key}>
                Valid on <strong>{cond.value1}</strong> and <strong>{cond.value2}</strong> bus types.
              </li>
            );
          } else {
            list.push(
              <li key={key}>
                Valid only on <strong>{cond.value1}</strong> bus types.
              </li>
            );
          }
        }
      });
    }

    if (list.length === 0) {
      list.push(<li key="default">Valid on all bookings of this category.</li>);
    }

    return list;
  };

  useEffect(() => {
    const tab = normalizeHomeTab(searchParams.get("tab"));
    setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        travellerFieldRef.current &&
        !travellerFieldRef.current.contains(event.target)
      ) {
        setShowTravellerDropdown(false);
      }

      if (
        classFieldRef.current &&
        !classFieldRef.current.contains(event.target)
      ) {
        setShowClassDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowTravellerDropdown(false);
    setShowClassDropdown(false);
  }, [activeTab, flightTripType]);

  useEffect(() => {
    if (!isAiChatOpen) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const handleAiChatOutsideClick = (event) => {
        if (
          aiChatShellRef.current &&
          !aiChatShellRef.current.contains(event.target)
        ) {
          setIsAiChatOpen(false);
        }
      };

      document.addEventListener("pointerdown", handleAiChatOutsideClick);
      document.addEventListener("mousedown", handleAiChatOutsideClick);

      return () => {
        document.removeEventListener("pointerdown", handleAiChatOutsideClick);
        document.removeEventListener("mousedown", handleAiChatOutsideClick);
      };
    }, 150);

    return () => clearTimeout(timer);
  }, [isAiChatOpen]);

  useEffect(() => {
    if (!isDealsDialogOpen && !offerForDetailPopup || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDealsDialogOpen, offerForDetailPopup]);

  const dealsDialog =
    isDealsDialogOpen && typeof document !== "undefined"
      ? createPortal(
        <div
          className="deals-dialog-backdrop"
          role="presentation"
          onClick={() => setIsDealsDialogOpen(false)}
        >
          <section
            className="deals-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deals-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="deals-dialog-header">
              <div>
                <span className="section-kicker">This Week</span>
                <h2 id="deals-dialog-title">All Featured Deals</h2>
              </div>
              <button
                type="button"
                className="deals-dialog-close"
                onClick={() => setIsDealsDialogOpen(false)}
                aria-label="Close deals"
              >
                <X size={18} />
                <span>Close</span>
              </button>
            </header>
            <div className="deals-dialog-grid">
              {featuredOffers.map((offer, index) => (
                <article
                  className={`offer-card bg-${index % 5}`}
                  key={offer.id}
                  onClick={() => {
                    setIsDealsDialogOpen(false);
                    setOfferForDetailPopup(offer);
                  }}
                >
                  <div className="offer-card-left">
                    <span className="offer-card-badge">
                      {offer.bookingType ? `${offer.bookingType} Offer` : "Special Offer"}
                    </span>
                    <h3 className="offer-card-title">{offer.title}</h3>
                    <span className="offer-card-validity">
                      {formatExpiryDate(offer.couponExpiresAtUtc || offer.endDateUtc)}
                    </span>
                    {offer.couponCode && (
                      <div className="offer-card-coupon">
                        <Tag size={12} className="coupon-icon" />
                        <span className="coupon-text">{offer.couponCode}</span>
                      </div>
                    )}
                  </div>
                  <div className="offer-card-right-img">
                    <FeaturedOfferImage offer={offer} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>,
        document.body,
      )
      : null;

  const offerDetailDialog =
    offerForDetailPopup && typeof document !== "undefined"
      ? createPortal(
        <div
          className="offer-detail-backdrop"
          role="presentation"
          onClick={() => setOfferForDetailPopup(null)}
        >
          <section
            className="offer-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="offer-detail-header">
              <div>
                <span className="offer-detail-kicker">
                  {offerForDetailPopup.bookingType ? `${offerForDetailPopup.bookingType.toUpperCase()} DEAL` : "OFFER DETAIL"}
                </span>
                <h2 id="offer-detail-title">{offerForDetailPopup.title}</h2>
              </div>
              <button
                type="button"
                className="offer-detail-close"
                onClick={() => setOfferForDetailPopup(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </header>

            <div className="offer-detail-body">
              <p className="offer-detail-desc">
                {offerForDetailPopup.description || offerForDetailPopup.subtitle}
              </p>

              {offerForDetailPopup.couponCode ? (
                <div className="offer-coupon-section">
                  <span className="section-subtitle">Coupon Code</span>
                  <div
                    className="offer-coupon-card"
                    onClick={() => handleCopyCode(offerForDetailPopup.couponCode)}
                    title="Click to copy code"
                  >
                    <div className="coupon-code-val">
                      <code>{offerForDetailPopup.couponCode}</code>
                    </div>
                    <button type="button" className="coupon-copy-btn">
                      {copied ? "Copied!" : "Copy Code"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="offer-coupon-section">
                  <div className="offer-coupon-card promo-auto">
                    <span>Automatic promo discount applied at checkout. No code required!</span>
                  </div>
                </div>
              )}

              <div className="offer-terms-section">
                <span className="section-subtitle">Terms & Conditions</span>
                <ul className="terms-list">
                  {renderOfferConditions(offerForDetailPopup)}
                  <li>This offer cannot be clubbed with any other ongoing promotions.</li>
                  <li>Standard booking terms and cancellation policies apply.</li>
                  {offerForDetailPopup.couponExpiresAtUtc && (
                    <li>Valid for bookings made before {new Date(offerForDetailPopup.couponExpiresAtUtc).toLocaleDateString()}.</li>
                  )}
                </ul>
              </div>

              <div className="offer-detail-actions">
                <button
                  type="button"
                  className="offer-proceed-btn"
                  onClick={() => {
                    const offer = offerForDetailPopup;
                    setOfferForDetailPopup(null);
                    handleOfferBooking(offer);
                  }}
                >
                  Proceed to Booking
                </button>
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )
      : null;

  useEffect(() => {
    if (!isAiChatOpen || !aiChatMessagesRef.current) {
      return;
    }

    aiChatMessagesRef.current.scrollTop =
      aiChatMessagesRef.current.scrollHeight;
  }, [isAiChatOpen, aiChatMessages, isAiTyping]);

  useEffect(
    () => () => {
      if (aiReplyTimerRef.current) {
        clearTimeout(aiReplyTimerRef.current);
      }
    },
    [],
  );

  // Sync offersFilter with activeTab when activeTab changes
  useEffect(() => {
    if (activeTab === "buses") {
      setOffersFilter("bus");
    } else if (activeTab === "hotels") {
      setOffersFilter("hotel");
    } else if (activeTab === "flights") {
      setOffersFilter("flight");
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    const loadFeaturedOffers = async () => {
      setFeaturedOffersLoading(true);
      setFeaturedOffersError("");

      try {
        const response = await getPublicFeaturedOffers();
        const activeOffers = getFeaturedOffersPayload(response)
          .map(normalizeFeaturedOffer)
          .filter((offer) => offer.isActive);

        if (isMounted) {
          setFeaturedOffers(activeOffers);
        }
      } catch (error) {
        if (isMounted) {
          setFeaturedOffersError("Unable to load featured offers.");
        }
      } finally {
        if (isMounted) {
          setFeaturedOffersLoading(false);
        }
      }
    };

    loadFeaturedOffers();
    return () => {
      isMounted = false;
    };
  }, []);

  /* Popular Bus Routes â€” Static Curated Data (No API Hit) */
  useEffect(() => {
    setPopularRoutesLoading(false);
    setPopularRoutesError("");
    setPopularRoutes([
      { id: "bus-hot-1", fromCity: "Hyderabad", toCity: "Bengaluru", searches: 1420 },
      { id: "bus-hot-2", fromCity: "Chennai", toCity: "Bengaluru", searches: 1280 },
      { id: "bus-hot-3", fromCity: "Mumbai", toCity: "Pune", searches: 1150 },
      { id: "bus-hot-4", fromCity: "Delhi", toCity: "Jaipur", searches: 980 },
      { id: "bus-hot-5", fromCity: "Bengaluru", toCity: "Goa", searches: 890 },
      { id: "bus-hot-6", fromCity: "Hyderabad", toCity: "Vijayawada", searches: 840 },
    ]);
  }, []);

  /* Popular Flight Routes â€” Static Curated Data (No API Hit) */
  useEffect(() => {
    setPopularFlightsLoading(false);
    setPopularFlightsError("");
    setPopularFlights([
      { id: "flight-hot-1", route: "Mumbai to Delhi", fromCity: "Mumbai", toCity: "Delhi", summary: "Daily direct flights with top airlines", searches: 3450 },
      { id: "flight-hot-2", route: "Bengaluru to Hyderabad", fromCity: "Bengaluru", toCity: "Hyderabad", summary: "Short distance business travel corridor", searches: 2890 },
      { id: "flight-hot-3", route: "Delhi to Goa", fromCity: "Delhi", toCity: "Goa", summary: "Popular vacation and beach destination", searches: 2640 },
      { id: "flight-hot-4", route: "Chennai to Kolkata", fromCity: "Chennai", toCity: "Kolkata", summary: "Frequent non-stop flight connections", searches: 1980 },
    ]);
  }, []);

  /* Popular Hotels â€” Static Curated Data (No API Hit) */
  useEffect(() => {
    setPopularHotelsLoading(false);
    setPopularHotelsError("");
    setPopularHotels([
      {
        id: "hotel-curated-1",
        city: "Hyderabad",
        name: "Taj Krishna Hyderabad",
        summary: "Luxury stay with pool, spa and fine dining",
        searches: 1420,
        price: "7,499",
        hotelImage: HOTEL_ROOM_IMAGES[0],
      },
      {
        id: "hotel-curated-2",
        city: "Bengaluru",
        name: "The Leela Palace Bengaluru",
        summary: "Grand royal palace hotel in the garden city",
        searches: 1310,
        price: "9,999",
        hotelImage: HOTEL_ROOM_IMAGES[1],
      },
      {
        id: "hotel-curated-3",
        city: "Delhi",
        name: "ITC Maurya New Delhi",
        summary: "Iconic luxury property with signature Bukharas",
        searches: 1200,
        price: "8,250",
        hotelImage: HOTEL_ROOM_IMAGES[2],
      },
      {
        id: "hotel-curated-4",
        city: "Mumbai",
        name: "The Taj Mahal Palace Mumbai",
        summary: "World famous luxury heritage hotel facing Gateway of India",
        searches: 1090,
        price: "12,500",
        hotelImage: HOTEL_ROOM_IMAGES[3],
      },
    ]);
  }, []);


  const handleSwapFlights = () => {
    setFlightFrom(flightTo);
    setFlightTo(flightFrom);
  };

  const handleBookingTabChange = (nextTab) => {
    const normalizedTab = normalizeHomeTab(nextTab);
    setActiveTab(normalizedTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", normalizedTab);
    setSearchParams(nextParams, { replace: true });
  };

  const handleSwapBuses = () => {
    setBusFrom(busTo);
    setBusTo(busFrom);
  };

  const openPopularBusRoutes = (operatorId) => {
    setActiveTab("buses");
    const targetOperator = POPULAR_RTC_OPERATORS.find((op) => op.id === operatorId) || POPULAR_RTC_OPERATORS[0];
    setSelectedRtcOperator(targetOperator);
    setRtcSearchFrom(targetOperator.routes?.[0]?.from || "Bangalore");
    setRtcSearchTo(targetOperator.routes?.[0]?.to || "Tirupathi");

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "buses");
    if (targetOperator?.id) {
      nextParams.set("rtc", targetOperator.id);
    }
    setSearchParams(nextParams, { replace: true });

    window.setTimeout(() => {
      document
        .querySelector(".rtc-landing-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(() => {
    const rtcParam = searchParams.get("rtc");
    if (rtcParam) {
      const match = POPULAR_RTC_OPERATORS.find((op) => op.id === rtcParam);
      if (match) {
        setSelectedRtcOperator(match);
        setRtcSearchFrom(match.routes?.[0]?.from || "Bangalore");
        setRtcSearchTo(match.routes?.[0]?.to || "Tirupathi");
      }
    }
  }, [searchParams]);

  const generateNextWeekDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const timezoneOffset = d.getTimezoneOffset() * 60000;
      const fullDate = new Date(d.getTime() - timezoneOffset).toISOString().slice(0, 10);
      const dayStr = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
      const monthStr = d.toLocaleDateString("en-US", { weekday: "short" });
      dates.push({ fullDate, dayStr, monthStr });
    }
    return dates;
  };

  const changeAdults = (delta) => {
    setAdults((previous) => {
      const next = Math.min(9, Math.max(0, previous + delta));

      if (next === 0) {
        setChildren(0);
        setInfants(0);
        return 0;
      }

      setInfants((previousInfants) => Math.min(previousInfants, next));
      return next;
    });
  };

  const changeChildren = (delta) => {
    setChildren((previous) => Math.min(8, Math.max(0, previous + delta)));
  };

  const changeInfants = (delta) => {
    setInfants((previous) => {
      const candidate = previous + delta;
      return Math.max(0, Math.min(adults, candidate));
    });
  };

  const updateMultiCityLeg = (legId, field, value) => {
    setMultiCityLegs((previousLegs) => {
      const legIndex = previousLegs.findIndex((l) => l.id === legId);
      if (legIndex === -1) return previousLegs;

      const newLegs = [...previousLegs];
      newLegs[legIndex] = { ...newLegs[legIndex], [field]: value };

      // Auto-fill next leg's source when destination is updated
      if (field === "to" && legIndex + 1 < newLegs.length) {
        newLegs[legIndex + 1] = { ...newLegs[legIndex + 1], from: value };
      }

      return newLegs;
    });
  };

  const addMultiCityLeg = () => {
    setMultiCityLegs((previousLegs) => {
      const lastLeg = previousLegs[previousLegs.length - 1];
      const defaultFrom = lastLeg ? lastLeg.to : "";

      return [
        ...previousLegs,
        createMultiCityLeg(defaultFrom, "Mumbai", previousLegs.length + 1),
      ];
    });
  };

  const removeMultiCityLeg = (legId) => {
    setMultiCityLegs((previousLegs) =>
      previousLegs.length === 1
        ? previousLegs
        : previousLegs.filter((leg) => leg.id !== legId),
    );
  };

  const isFlightTwoWay = flightTripType === "twoway";
  const isBusTwoWay = busTripType === "twoway";
  const travellerSummary = formatTravellerSummary(adults, children, infants);
  const hasTravellerSelection = Boolean(travellerSummary);

  const navigateToFlightSearch = (flightPayload) => {
    const flightParams = new URLSearchParams();

    Object.entries(flightPayload).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        flightParams.set(key, value.trim());
      }
    });

    navigate(
      `/search/flights${flightParams.toString() ? `?${flightParams.toString()}` : ""
      }`,
      { state: flightPayload },
    );
  };

  const navigateToBusSearch = (busPayload) => {
    const busParams = new URLSearchParams();

    Object.entries(busPayload).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        busParams.set(key, value.trim());
      }
    });

    navigate(
      `/search/buses${busParams.toString() ? `?${busParams.toString()}` : ""}`,
      { state: busPayload },
    );
  };

  const navigateToHotelSearch = (hotelPayload) => {
    const hotelParams = new URLSearchParams();

    Object.entries(hotelPayload).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        hotelParams.set(key, value.trim());
      }
    });

    navigate(
      `/search/hotels${hotelParams.toString() ? `?${hotelParams.toString()}` : ""
      }`,
      { state: hotelPayload },
    );
  };

  const handleOfferBooking = (offer) => {
    setIsDealsDialogOpen(false);
    setSelectedOffer(offer);

    let source = "";
    let destination = "";
    let travelDate = getDateInputValue(0);

    if (offer.conditions && Array.isArray(offer.conditions)) {
      const activeConditions = offer.conditions.filter((c) => c.isActive !== false);

      const sourceCond = activeConditions.find((c) => c.conditionType === "SourceCity");
      if (sourceCond) {
        source = sourceCond.value1;
      }

      const destCond = activeConditions.find((c) => c.conditionType === "DestinationCity");
      if (destCond) {
        destination = destCond.value1;
      }

      const dateCond = activeConditions.find((c) => c.conditionType === "TravelDate");
      if (dateCond) {
        if (dateCond.value1) {
          travelDate = dateCond.value1;
        }
      }
    }

    if (offer.bookingType === "bus" || offer.bookingType === "Bus") {
      navigateToBusSearch({
        source,
        destination,
        tripType: "oneway",
        departureDate: travelDate,
      });
      return;
    }

    if (offer.bookingType === "hotel" || offer.bookingType === "Hotel") {
      navigateToHotelSearch({
        destination: destination || source || "",
        checkInDate: travelDate,
        checkOutDate: getDateInputValue(1),
        rooms: "1",
        adults: "2",
        children: "0",
        guests: "1 Room, 2 Adults",
      });
      return;
    }

    navigateToFlightSearch({
      source,
      destination,
      tripType: "oneway",
      departureDate: travelDate,
      travellers: "1 Adult",
      cabinClass: "Economy",
    });
  };

  const handlePopularRouteBooking = (route) => {
    navigateToBusSearch({
      source: route.fromCity,
      destination: route.toCity,
      tripType: "oneway",
      departureDate: getDateInputValue(0),
    });
  };

  const handlePopularFlightBooking = (popularFlight) => {
    const [sourceRaw, destinationRaw] = String(popularFlight.route || "").split(/\s+to\s+/i);
    const source = popularFlight.fromCity || sourceRaw?.trim() || "Delhi";
    const destination = popularFlight.toCity || destinationRaw?.trim() || "Mumbai";

    navigateToFlightSearch({
      source,
      destination,
      tripType: "oneway",
      departureDate: getDateInputValue(0),
      travellers: "1 Adult",
      cabinClass: "Economy",
    });
  };

  const handlePopularHotelBooking = (hotel) => {
    navigateToHotelSearch({
      destination: hotel.city,
      checkInDate: getDateInputValue(0),
      checkOutDate: getDateInputValue(1),
      rooms: "1",
      adults: "2",
      children: "0",
      guests: "1 Room, 2 Adults",
    });
  };

  const handleBusFromChange = (value) => {
    setBusFrom(value);
    if (value.trim()) {
      setBusFromError("");
    }
  };

  const handleBusToChange = (value) => {
    setBusTo(value);
    if (value.trim()) {
      setBusToError("");
    }
  };

  const handleFlightFromChange = (value) => {
    setFlightFrom(value);
    if (value.trim()) {
      setFlightFromError("");
    }
  };

  const handleFlightToChange = (value) => {
    setFlightTo(value);
    if (value.trim()) {
      setFlightToError("");
    }
  };

  const handleSearch = () => {
    if (activeTab === "hotels") {
      return;
    }

    if (activeTab === "flights") {
      const isMultiCity = flightTripType === "multicity";
      let hasError = false;

      if (isMultiCity) {
        multiCityLegs.forEach(leg => {
          if (!leg.from.trim() || !leg.to.trim()) {
            hasError = true;
          }
        });
        if (hasError) {
          alert("Please fill all source and destination cities for multi-city legs.");
          return;
        }
      } else {
        const fromVal = flightFrom.trim();
        const toVal = flightTo.trim();

        if (!fromVal) {
          setFlightFromError("Source city is required.");
          hasError = true;
        } else {
          setFlightFromError("");
        }

        if (!toVal) {
          setFlightToError("Destination city is required.");
          hasError = true;
        } else {
          setFlightToError("");
        }

        if (hasError) {
          return;
        }
      }

      const source = isMultiCity ? multiCityLegs[0]?.from || "" : flightFrom;
      const destination = isMultiCity
        ? multiCityLegs[multiCityLegs.length - 1]?.to || ""
        : flightTo;
      const departureDate = isMultiCity
        ? multiCityLegs[0]?.departureDate || ""
        : flightDepartureDate;

      if (!cabinClass) {
        alert("Please select a cabin class.");
        return;
      }

      const flightPayload = {
        source: source.trim(),
        destination: destination.trim(),
        tripType: flightTripType,
        departureDate: departureDate.trim(),
        returnDate: flightTripType === "twoway" ? flightReturnDate.trim() : "",
        travellers: travellerSummary,
        cabinClass,
        legs: flightTripType === "multicity" ? JSON.stringify(multiCityLegs) : "",
      };
      navigateToFlightSearch(flightPayload);
      return;
    }

    const fromVal = busFrom.trim();
    const toVal = busTo.trim();

    let hasError = false;
    if (!fromVal) {
      setBusFromError("Source city is required.");
      hasError = true;
    } else {
      setBusFromError("");
    }

    if (!toVal) {
      setBusToError("Destination city is required.");
      hasError = true;
    } else {
      setBusToError("");
    }

    if (hasError) {
      return;
    }

    const busPayload = {
      source: fromVal,
      destination: toVal,
      tripType: busTripType,
      departureDate: busDepartureDate.trim(),
      returnDate: busTripType === "twoway" ? busReturnDate.trim() : "",
    };
    navigateToBusSearch(busPayload);
  };

  const handleAiChatSubmit = (event) => {
    event.preventDefault();

    const trimmedInput = aiChatInput.trim();
    if (!trimmedInput) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedInput,
    };

    setAiChatMessages((previous) => [...previous, userMessage]);
    setAiChatInput("");
    setIsAiTyping(true);

    if (aiReplyTimerRef.current) {
      clearTimeout(aiReplyTimerRef.current);
    }

    aiReplyTimerRef.current = setTimeout(() => {
      const assistantReply = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: getStaticAiReply(trimmedInput),
      };

      setAiChatMessages((previous) => [...previous, assistantReply]);
      setIsAiTyping(false);
      aiReplyTimerRef.current = null;
    }, 460);
  };

  const handleAiChatReset = () => {
    if (aiReplyTimerRef.current) {
      clearTimeout(aiReplyTimerRef.current);
      aiReplyTimerRef.current = null;
    }

    setIsAiTyping(false);
    setAiChatInput("");
    setAiChatMessages(getInitialAiChatMessages());
  };

  const canResetAiChat =
    isAiTyping || aiChatInput.trim().length > 0 || aiChatMessages.length > 1;

  const travellerField = (
    <div className="field traveller-field" ref={travellerFieldRef}>
      <label>Travellers</label>
      <button
        type="button"
        className={`traveller-trigger ${showTravellerDropdown ? "open" : ""}`}
        onClick={() => setShowTravellerDropdown((previous) => !previous)}
      >
        <span
          className={`traveller-summary ${hasTravellerSelection ? "" : "placeholder"
            }`}
        >
          <Users size={16} />
          <span>
            {hasTravellerSelection ? travellerSummary : "Select travellers"}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`traveller-caret ${showTravellerDropdown ? "open" : ""}`}
        />
      </button>

      {showTravellerDropdown && (
        <div className="traveller-dropdown" onMouseDown={(e) => e.stopPropagation()}>
          <div className="counter-row">
            <div className="counter-copy">
              <strong>Adults</strong>
              <span>12 years and above</span>
            </div>
            <div className="counter-box">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeAdults(-1); }}
                disabled={adults <= 0}
              >
                <Minus size={14} />
              </button>
              <span>{adults}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeAdults(1); }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="counter-row">
            <div className="counter-copy">
              <strong>Child</strong>
              <span>2 to 11 years</span>
            </div>
            <div className="counter-box">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeChildren(-1); }}
                disabled={children <= 0}
              >
                <Minus size={14} />
              </button>
              <span>{children}</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeChildren(1); }}
                disabled={adults <= 0}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="counter-row">
            <div className="counter-copy">
              <strong>Infant</strong>
              <span>Under 2 years</span>
            </div>
            <div className="counter-box">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeInfants(-1); }}
                disabled={infants <= 0}
              >
                <Minus size={14} />
              </button>
              <span>{infants}</span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeInfants(1); }}
                disabled={adults <= 0 || infants >= adults}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className="traveller-done"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTravellerDropdown(false); }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );

  const classField = (
    <div className="field class-field" ref={classFieldRef}>
      <label>Class</label>
      <button
        type="button"
        className={`traveller-trigger ${showClassDropdown ? "open" : ""}`}
        onClick={() => setShowClassDropdown((prev) => !prev)}
      >
        <span
          className={`traveller-summary ${cabinClass ? "" : "placeholder"
            }`}
        >
          <Plane size={16} />
          <span>
            {cabinClass || "Select class"}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`traveller-caret ${showClassDropdown ? "open" : ""}`}
        />
      </button>

      {showClassDropdown && (
        <div className="traveller-dropdown class-dropdown" onMouseDown={(e) => e.stopPropagation()}>
          <ul className="class-options-list">
            {CLASS_OPTIONS.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className={`class-option-btn ${cabinClass === item ? "selected" : ""}`}
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    setCabinClass(item);
                    setShowClassDropdown(false);
                  }}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const filteredOffers = featuredOffers.filter((offer) => {
    if (offersFilter === "all") return true;
    const type = (offer.bookingType || "").toLowerCase();
    if (offersFilter === "flight") return type === "flight" || type === "flights";
    if (offersFilter === "bus") return type === "bus" || type === "buses";
    if (offersFilter === "hotel") return type === "hotel" || type === "hotels";
    return true;
  });

  const homeContent = HOME_MODE_CONTENT[activeTab] || HOME_MODE_CONTENT.flights;
  const ActiveAiIcon =
    activeTab === "buses" ? Bus : activeTab === "hotels" ? BedDouble : Plane;
  const HomeModeIcon = homeContent.Icon;

  return (
    <div className={`homepage homepage-${homeContent.mode}`}>
      <style>{`
        /* â”€â”€â”€ Global Homepage Spacing Overrides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .homepage .hero-section {
          padding-bottom: 0 !important;
        }
        .homepage .offers-section {
          margin-top: 0 !important;
        }

        /* â”€â”€â”€ Solid Opaque Search Container â”€â”€â”€ */
        .homepage .search-panel {
          background: #ffffff !important;
          border: 1px solid #e5e7eb !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        }

        /* Inactive Tab bar background overlay adjustment */
        .homepage .search-panel .tabs {
          background: #f3f4f6 !important;
          border-color: #e5e7eb !important;
        }

        /* Inactive main tabs style overrides */
        .homepage .search-panel .tab {
          color: #4b5563 !important;
          opacity: 1 !important;
          transition: all 0.2s ease !important;
        }
        .homepage .search-panel .tab:hover {
          opacity: 1 !important;
          background: #e5e7eb !important;
          color: #111827 !important;
        }
        .homepage .search-panel .tab.active {
          opacity: 1 !important;
          background: #dc1e26 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(220, 30, 38, 0.3) !important;
        }

        /* Visible field labels */
        .homepage .search-panel .field label,
        .homepage .search-panel .traveller-field label,
        .homepage .search-panel .class-field label {
          color: #4b5563 !important;
          font-weight: 700 !important;
          text-shadow: none !important;
        }

        /* Make fields (inputs) solid white for maximum legibility */
        .homepage .search-panel .control-wrap,
        .homepage .search-panel .traveller-trigger,
        .homepage .search-panel .class-control-wrap {
          background: #ffffff !important;
          border: 1px solid #d1d5db !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
        }

        /* Inactive trip-type chips contrast boost */
        .homepage .search-panel .trip-chip {
          background: #f3f4f6 !important;
          color: #4b5563 !important;
          border: 1px solid #e5e7eb !important;
          font-weight: 700 !important;
        }
        .homepage .search-panel .trip-chip.active {
          background: #dc1e26 !important;
          color: #ffffff !important;
          border-color: #dc1e26 !important;
        }

        /* â”€â”€â”€ Offers Filter Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        .offers-filter-tabs {
          display: inline-flex;
          align-items: center;
          background: rgba(233, 241, 252, 0.6);
          border: 1px solid #c7d9f1;
          border-radius: 99px;
          padding: 4px;
          gap: 4px;
          margin: 0 0 10px 0;
          align-self: flex-start;
        }

        .offers-filter-tab {
          border: 0;
          outline: 0;
          background: transparent;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #2c486c;
          padding: 6px 16px;
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .offers-filter-tab:hover {
          color: #1e3c64;
          background: rgba(255, 255, 255, 0.6);
        }

        .offers-filter-tab.active {
          background: var(--primary, #dc1e26) !important;
          color: #ffffff !important;
          box-shadow: 0 2px 8px rgba(220, 30, 38, 0.2) !important;
        }

        /* Custom Popular Route Card Embedded Styles */
        .pop-route-card {
           box-sizing: border-box;
           background: #ffffff;
           border: 1px solid rgba(225, 230, 235, 0.9);
           border-radius: 16px;
           overflow: hidden;
           width: 280px;
           display: flex;
           flex-direction: column;
           box-shadow: 0 4px 12px rgba(6, 24, 44, 0.06);
           transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s cubic-bezier(0.4,0,0.2,1);
           text-align: left;
           cursor: pointer;
        }

        .pop-route-card:hover {
           transform: translateY(-4px);
           box-shadow: 0 12px 28px rgba(6, 24, 44, 0.13);
        }

        /* Image header â€” flush, no side gaps */
        .pop-route-img-wrap {
           width: 100%;
           height: 160px;
           overflow: hidden;
           flex-shrink: 0;
           position: relative;
           margin: 0;
           padding: 0;
           display: block;
        }

        .pop-route-img-wrap img {
           width: 100%;
           height: 100%;
           object-fit: cover;
           object-position: center;
           display: block;
           transition: transform 0.35s ease;
        }

        .pop-route-card:hover .pop-route-img-wrap img {
           transform: scale(1.06);
        }

        /* Badge row overlaid on image bottom */
        .pop-route-img-overlay {
           position: absolute;
           bottom: 0;
           left: 0;
           right: 0;
           padding: 28px 12px 10px;
           background: linear-gradient(to top, rgba(10,15,25,0.72) 0%, transparent 100%);
           display: flex;
           justify-content: space-between;
           align-items: flex-end;
           pointer-events: none;
        }

        .pop-route-tag-search {
           background: #e14e2a;
           color: #ffffff;
           padding: 3px 10px;
           border-radius: 999px;
           font-size: 0.62rem;
           font-weight: 800;
           letter-spacing: 0.04em;
        }

        .pop-route-tag-searches {
           background: rgba(255,255,255,0.15);
           color: #ffffff;
           border: 1px solid rgba(255,255,255,0.35);
           padding: 2px 8px;
           border-radius: 999px;
           font-size: 0.62rem;
           font-weight: 700;
           backdrop-filter: blur(4px);
        }

        /* Card body */
        .pop-route-body {
           padding: 14px 14px 0;
           display: flex;
           flex-direction: column;
           flex: 1;
        }

        .pop-route-cities-row {
           display: flex;
           align-items: center;
           justify-content: space-between;
           width: 100%;
           gap: 8px;
        }

        .pop-route-city {
           font-size: 1.05rem;
           font-weight: 700;
           color: #1e2c3a;
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           flex: 1;
        }

        .pop-route-city.from {
           text-align: left;
           text-transform: capitalize;
        }

        .pop-route-city.to {
           text-align: right;
           text-transform: capitalize;
        }

        .pop-route-icon-circle {
           width: 28px;
           height: 28px;
           min-width: 28px;
           min-height: 28px;
           border-radius: 50%;
           border: 1px solid #f9dbce;
           background: #fdf2e9;
           display: flex;
           align-items: center;
           justify-content: center;
           color: #e14e2a;
           margin: 0 4px;
        }

        .pop-route-trending {
           color: #7a8c9e;
           font-size: 0.72rem;
           margin-top: 8px;
           font-weight: 500;
        }

        .pop-route-meta-row {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-top: 12px;
           width: 100%;
           border-top: 1px dashed rgba(225, 230, 235, 0.8);
           padding-top: 10px;
        }

        .pop-route-meta-left {
           color: #e14e2a;
           font-size: 0.68rem;
           font-weight: 700;
           letter-spacing: 0.02em;
        }

        .pop-route-book-btn {
           background: #e14e2a;
           color: #ffffff;
           font-weight: 700;
           font-size: 0.8rem;
           letter-spacing: 0.06em;
           border: none;
           border-radius: 0 0 16px 16px;
           width: 100%;
           padding: 11px 0;
           cursor: pointer;
           text-align: center;
           margin-top: 14px;
           transition: background 0.2s, transform 0.1s;
        }

        .pop-route-book-btn:hover {
           background: #b73e21;
        }

        .pop-route-book-btn:active {
           transform: scale(0.98);
        }

         .popular-routes-marquee .marquee-slide {
            width: 300px;
            padding: 12px 20px 12px 0;
         }          /* Custom Offers Scrollable Row and Selected Highlighting */
          .offers-scroll-row {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding: 12px 4px 20px;
            scroll-behavior: smooth;
          }
          .offers-scroll-row::-webkit-scrollbar {
            height: 8px;
          }
          .offers-scroll-row::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.03);
            border-radius: 10px;
          }
          .offers-scroll-row::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 10px;
          }
          .offers-scroll-row::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.2);
          }
                /* â”€â”€â”€ Pastel Offer Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
          .homepage .offer-card,
          .deals-dialog-grid .offer-card {
            position: relative;
            min-width: 255px;
            max-width: 255px;
            height: auto !important;
            min-height: auto !important;
            flex-shrink: 0;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                        box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 8px rgba(15, 23, 42, 0.03);
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 12px 14px;
            box-sizing: border-box;
            border: 1px solid rgba(0, 0, 0, 0.05) !important;
          }
          .homepage .offer-card:hover,
          .deals-dialog-grid .offer-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(15, 23, 42, 0.06);
          }

          /* Pastel backgrounds with !important to override main theme values */
          .homepage .offer-card.bg-0, .deals-dialog-grid .offer-card.bg-0 { background: #FFF7ED !important; border-color: #FED7AA !important; }
          .homepage .offer-card.bg-1, .deals-dialog-grid .offer-card.bg-1 { background: #F0FDF4 !important; border-color: #BBF7D0 !important; }
          .homepage .offer-card.bg-2, .deals-dialog-grid .offer-card.bg-2 { background: #FFF1F2 !important; border-color: #FECDD3 !important; }
          .homepage .offer-card.bg-3, .deals-dialog-grid .offer-card.bg-3 { background: #ECFEFF !important; border-color: #A5F3FC !important; }
          .homepage .offer-card.bg-4, .deals-dialog-grid .offer-card.bg-4 { background: #FEFCE8 !important; border-color: #FEF08A !important; }

          .offer-card-left {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            gap: 6px;
            flex: 1;
            margin-right: 8px;
            height: auto;
            z-index: 2;
            pointer-events: none;
          }

          .offer-card-badge {
            font-size: 0.55rem;
            font-weight: 700;
            color: #4b5563;
            background: rgba(0, 0, 0, 0.05);
            padding: 1px 5px;
            border-radius: 99px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .offer-card-title {
            font-size: 0.9rem;
            font-weight: 800;
            color: #1f2937 !important;
            margin: 1px 0 0 0;
            line-height: 1.15;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-align: left;
            text-shadow: none !important;
          }

          .offer-card-validity {
            font-size: 0.6rem;
            font-weight: 500;
            color: #6b7280;
            margin-top: 1px;
            margin-bottom: 0;
          }

          .offer-card-coupon {
            display: flex;
            align-items: center;
            gap: 3px;
            background: #ffffff;
            border: 1px dashed #d1d5db;
            padding: 1px 4px;
            border-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            margin-top: 2px;
          }

          .coupon-icon {
            color: #ef4444;
          }

          .coupon-text {
            font-size: 0.6rem;
            font-weight: 800;
            color: #ef4444;
            letter-spacing: 0.05em;
          }

          /* Decorative image positioned adjacent (relative flex column) */
          .offer-card-right-img {
            position: relative;
            width: 80px;
            height: 80px;
            border-radius: 10px;
            overflow: hidden;
            z-index: 1;
            pointer-events: none;
            flex-shrink: 0;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.04);
          }

         .offer-card-right-img img {
           width: 100%;
           height: 100%;
           object-fit: cover;
         }

         .offer-card-right-img .offer-image-placeholder {
           width: 100%;
           height: 100%;
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 0.55rem;
           font-weight: 800;
           color: #ef4444;
           background: rgba(255, 255, 255, 0.8);
         }

         /* Deals dialog grid styling overrides */
         .deals-dialog-grid .offer-card {
           min-width: 0;
           max-width: none;
           height: auto !important;
           min-height: auto !important;
         }

         /* â”€â”€â”€ Skeleton Loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
         .offer-skeleton-card {
           min-width: 340px;
           max-width: 340px;
           height: 150px;
           flex-shrink: 0;
           display: flex;
           flex-direction: row;
           background: #ffffff;
           border: 1px solid #e8ecf1;
           border-radius: 14px;
           overflow: hidden;
           box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
         }
         .skeleton-thumb {
           width: 120px;
           flex-shrink: 0;
           background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
         }
         .skeleton-body {
           flex: 1;
           padding: 14px 16px;
           display: flex;
           flex-direction: column;
           gap: 8px;
         }
         .skeleton-badge {
           height: 14px;
           width: 50px;
           background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
           border-radius: 4px;
         }
         .skeleton-title {
           height: 16px;
           width: 80%;
           background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
           border-radius: 4px;
         }
         .skeleton-desc {
           height: 12px;
           width: 60%;
           background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
           border-radius: 4px;
         }
         .skeleton-code {
           margin-top: auto;
           height: 22px;
           width: 90px;
           background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
           background-size: 400% 100%;
           animation: skeleton-loading 1.4s ease infinite;
           border-radius: 4px;
         }
         @keyframes skeleton-loading {
           0% {
             background-position: 100% 50%;
           }
           100% {
             background-position: 0% 50%;
           }
         }

          /* Deals Dialog Backdrop & Modal Styles */
          .deals-dialog-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: grid;
            place-items: center;
            padding: 20px;
            animation: fade-in-backdrop 0.25s ease both;
          }
          .deals-dialog {
            background: #ffffff;
            border-radius: 24px;
            width: 100%;
            max-width: 780px;
            max-height: 80vh;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid #e2e8f0;
            overflow: hidden;
            animation: slide-up-modal 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            display: flex;
            flex-direction: column;
          }
          .deals-dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #f1f5f9;
            position: relative;
          }
          .deals-dialog-header h2 {
            font-size: 1.3rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .deals-dialog-header .section-kicker {
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--primary, #dc1e26);
            margin-bottom: 2px;
            display: block;
          }
          .deals-dialog-close {
            background: #f1f5f9 !important;
            border: none !important;
            color: #64748b !important;
            padding: 8px 16px !important;
            border-radius: 50px !important;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-weight: 700 !important;
            font-size: 0.75rem !important;
            transition: all 0.2s ease !important;
          }
          .deals-dialog-close:hover {
            background: #e2e8f0 !important;
            color: #0f172a !important;
          }
          .deals-dialog-grid {
            padding: 24px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
            overflow-y: auto;
            max-height: calc(80vh - 80px);
          }


          /* Details Modal Backdrop */
          .offer-detail-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.5);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: grid;
            place-items: center;
            padding: 20px;
            animation: fade-in-backdrop 0.25s ease both;
          }

          @keyframes fade-in-backdrop {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          /* Details Modal Sheet */
          .offer-detail-modal {
            background: #ffffff;
            border-radius: 24px;
            width: 100%;
            max-width: 500px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid #e2e8f0;
            overflow: hidden;
            animation: slide-up-modal 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            display: flex;
            flex-direction: column;
          }

          @keyframes slide-up-modal {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .offer-detail-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 24px 24px 16px;
            border-bottom: 1px solid #f1f5f9;
            position: relative;
          }

          .offer-detail-kicker {
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--primary, #dc1e26);
            margin-bottom: 4px;
            display: block;
          }

          .offer-detail-header h2 {
            font-size: 1.35rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            line-height: 1.2;
          }

          .offer-detail-close {
            background: #f1f5f9 !important;
            border: none !important;
            color: #64748b !important;
            width: 32px;
            height: 32px;
            border-radius: 50% !important;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease !important;
          }

          .offer-detail-close:hover {
            background: #e2e8f0 !important;
            color: #0f172a !important;
          }

          .offer-detail-body {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            overflow-y: auto;
            max-height: 70vh;
          }

          .offer-detail-desc {
            font-size: 0.95rem;
            line-height: 1.5;
            color: #475569;
            margin: 0;
          }

          .offer-coupon-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .section-subtitle {
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
          }

          .offer-coupon-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 12px;
            padding: 12px 16px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .offer-coupon-card:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
          }

          .offer-coupon-card.promo-auto {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            cursor: default;
            color: #065f46;
            font-size: 0.85rem;
            font-weight: 600;
            text-align: center;
            justify-content: center;
            padding: 14px;
          }

          .coupon-code-val code {
            font-family: monospace;
            font-size: 1.2rem;
            font-weight: 800;
            letter-spacing: 0.05em;
            color: #0f172a;
          }

          .coupon-copy-btn {
            background: var(--primary, #dc1e26) !important;
            border: none !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            font-size: 0.75rem !important;
            padding: 6px 14px !important;
            border-radius: 8px !important;
            transition: all 0.2s ease !important;
          }

          .coupon-copy-btn:hover {
            background: #b8141b !important;
          }

          .offer-terms-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .terms-list {
            margin: 0;
            padding-left: 20px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .terms-list li {
            font-size: 0.82rem;
            color: #475569;
            line-height: 1.4;
          }

          .offer-detail-actions {
            margin-top: 8px;
          }

          .offer-proceed-btn {
            width: 100%;
            background: linear-gradient(135deg, var(--primary, #dc1e26), #b8141b) !important;
            border: none !important;
            color: #ffffff !important;
            font-weight: 800 !important;
            font-size: 0.95rem !important;
            padding: 14px 0 !important;
            border-radius: 12px !important;
            cursor: pointer;
            box-shadow: 0 10px 20px rgba(220, 30, 38, 0.15);
            transition: all 0.25s ease !important;
          }

          .offer-proceed-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 14px 28px rgba(220, 30, 38, 0.22);
          }

          .offer-proceed-btn:active {
            transform: translateY(0);
          }

          /* â”€â”€â”€ Flight Video & Hero Wallpaper Styles (21:9 Aspect Ratio) â”€â”€â”€ */
          /* â”€â”€â”€ 18:6 Ultra-Wide Flight Hero & Horizontal Search Bar â”€â”€â”€ */
          .homepage-flights.hero-section,
          .homepage-buses.hero-section {
            position: relative !important;
            overflow: visible !important;
            width: 100% !important;
            min-height: 380px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 30px 20px !important;
            background: transparent !important;
            z-index: 40 !important;
          }

          .flight-hero-wallpaper {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
            z-index: 0 !important;
            pointer-events: none !important;
            background: transparent !important;
          }

          .flight-hero-wallpaper-video {
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            object-fit: cover !important;
            object-position: center !important;
            aspect-ratio: auto !important;
            filter: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          .home-ai-chat,
          .home-ai-toggle,
          .home-ai-plane-orb,
          .flight-hero-wallpaper-overlay {
            display: none !important;
          }
          .homepage-flights .flight-hero-header {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            text-align: left !important;
            margin-bottom: 60px !important;
            margin-top: 20px !important;
            z-index: 10 !important;
            width: 100% !important;
          }
          .homepage-flights .flight-hero-title {
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif !important;
            font-size: clamp(28px, 4vw, 44px) !important;
            font-weight: 900 !important;
            color: #ffffff !important;
            text-shadow: 0 3px 12px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.6) !important;
            margin-bottom: 8px !important;
            letter-spacing: -0.01em !important;
            line-height: 1.2 !important;
            text-transform: none !important;
          }

          .homepage-flights .flight-hero-title-highlight {
            color: #dc1e26 !important;
            text-shadow: 0 3px 12px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.6) !important;
          }

          .homepage-flights .flight-hero-subtitle {
            font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif !important;
            font-size: clamp(15px, 1.8vw, 20px) !important;
            font-weight: 700 !important;
            color: rgba(255, 255, 255, 0.95) !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5) !important;
            margin-top: 4px !important;
            opacity: 1 !important;
            letter-spacing: 0.02em !important;
          }
          .homepage-flights.hero-section,
          .homepage-buses.hero-section,
          .homepage-hotels.hero-section {
            width: 100% !important;
            height: auto !important;
            min-height: 480px !important;
            display: flex !important;
            align-items: flex-end !important;
            justify-content: center !important;
            padding: 60px 20px 20px !important;
            box-sizing: border-box !important;
            z-index: 40 !important;
            position: relative !important;
          }

          .homepage-flights .flight-hero-header {
            position: absolute !important;
            top: 40px !important;
            left: 40px !important;
            right: auto !important;
            text-align: left !important;
            max-width: 600px !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            z-index: 50 !important;
          }

          .homepage-flights .hero-grid {
            width: 100% !important;
            max-width: 1220px !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }

          /* Premium Glassy Flight Search Bar */
          .homepage-flights .search-panel {
            width: 100% !important;
            max-width: 1240px !important;
            height: auto !important;
            min-height: 95px !important;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.2)) !important;
            backdrop-filter: blur(24px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
            border-radius: 24px !important;
            padding: 16px 24px !important;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
            border: 1px solid rgba(255, 255, 255, 0.6) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.85) !important;
            border-left: 1px solid rgba(255, 255, 255, 0.85) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            position: relative !important;
            z-index: 20 !important;
          }

          .homepage-buses .hero-content,
          .homepage-flights .hero-content,
          .homepage-hotels .hero-content {
            width: 100% !important;
            max-width: 1240px !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            position: static !important;
            height: 100% !important;
            align-self: stretch !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
          }

          .homepage-buses .hero-header-left,
          .homepage-hotels .hero-header-left {
            position: absolute !important;
            top: 40px !important;
            left: 40px !important;
            right: auto !important;
            text-align: left !important;
            max-width: 600px !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* ── Premium Glassmorphic Bus & Hotel Search Bar ── */
          .homepage-buses .hero-grid,
          .homepage-hotels .hero-grid {
            width: 100% !important;
            max-width: 1220px !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }

          .homepage-buses .search-panel,
          .homepage-flights .search-panel,
          .homepage-hotels .search-panel {
            width: 100% !important;
            max-width: 1240px !important;
            height: auto !important;
            min-height: 95px !important;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.15)) !important;
            backdrop-filter: blur(28px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(28px) saturate(160%) !important;
            border-radius: 24px !important;
            padding: 16px 24px !important;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 10px rgba(0, 0, 0, 0.08) !important;
            border: 1px solid rgba(255, 255, 255, 0.6) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.85) !important;
            border-left: 1px solid rgba(255, 255, 255, 0.85) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            margin: 16px auto -230px !important;
            transform: translateY(30px) !important;
            position: relative !important;
            z-index: 20 !important;
          }

          .homepage-flights .search-panel .tabs-wrap,
          .homepage-buses .search-panel .tabs-wrap,
          .homepage-hotels .search-panel .tabs-wrap,
          .homepage-flights .search-panel .popular-searches-row {
            display: none !important;
          }

          .homepage-flights .search-panel {
            margin: 16px auto -250px !important;
            transform: translateY(50px) !important;
          }

          .homepage-hotels .hero-header-left {
            position: absolute !important;
            top: 40px !important;
            left: 40px !important;
            right: auto !important;
            text-align: left !important;
            max-width: 600px !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .homepage-hotels .hero-title-left {
            color: #ffffff !important;
            font-size: clamp(34px, 4.4vw, 56px) !important;
            font-weight: 800 !important;
            line-height: 1.12 !important;
            letter-spacing: -0.02em !important;
            margin-bottom: 12px !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45) !important;
          }

          .homepage-hotels .hero-title-left .hero-title-highlight {
            color: #dc2626 !important;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4) !important;
            display: inline !important;
          }

          .homepage-hotels .hero-subtitle-left {
            color: #ffffff !important;
            font-size: 15px !important;
            font-weight: 500 !important;
            line-height: 1.45 !important;
            max-width: 440px !important;
            text-shadow: 0 1px 6px rgba(0, 0, 0, 0.55) !important;
            margin: 0 !important;
            opacity: 0.95 !important;
          }

          .homepage-hotels .search-panel {
            width: 100% !important;
            max-width: 1240px !important;
            height: auto !important;
            min-height: 95px !important;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.15)) !important;
            backdrop-filter: blur(28px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(28px) saturate(160%) !important;
            border-radius: 24px !important;
            padding: 16px 24px !important;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 10px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
            border: 1px solid rgba(255, 255, 255, 0.6) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.85) !important;
            border-left: 1px solid rgba(255, 255, 255, 0.85) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            margin: 16px auto -230px !important;
            transform: translateY(30px) !important;
            position: relative !important;
            z-index: 20 !important;
          }

          /* Left-aligned Trip Chips */
          .homepage-flights .search-panel .trip-switch {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            margin-bottom: 8px !important;
            margin-top: 0 !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
          }

          .homepage-flights .search-panel .trip-chip {
            background: #f1f5f9 !important;
            color: #334155 !important;
            border: none !important;
            border-radius: 18px !important;
            padding: 3px 12px !important;
            font-weight: 800 !important;
            font-size: 0.68rem !important;
            letter-spacing: 0.04em !important;
            text-transform: uppercase !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            transition: all 0.2s ease !important;
          }

          .homepage-flights .search-panel .trip-chip.active {
            background: #dc1e26 !important;
            color: #ffffff !important;
            box-shadow: 0 3px 8px rgba(220, 30, 38, 0.3) !important;
          }

          /* Single Line Row Layout */
          .search-panel .flight-search-bar-row {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            background: transparent !important;
          }

          .search-panel .flight-search-bar-row > * {
            margin: 0 !important;
            flex-shrink: 1 !important;
          }

          /* Seamless Flat Fields with Vertical Line Dividers */
          .search-panel .flight-search-bar-row .field,
          .search-panel .flight-search-bar-row .place-autocomplete,
          .search-panel .flight-search-bar-row .traveller-field,
          .search-panel .flight-search-bar-row .class-field {
            flex: 1 1 auto !important;
            min-width: 80px !important;
            height: 58px !important;
            background: transparent !important;
            border: none !important;
            border-right: 1px solid #e2e8f0 !important;
            border-radius: 0 !important;
            padding: 6px 12px !important;
            margin: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            position: relative !important;
          }

          /* Remove PlaceAutocomplete internal input fixed heights so it matches Departure/Travellers */
          .search-panel .flight-search-bar-row .field-control {
            height: auto !important;
            min-height: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            color: #334155 !important;
            font-size: 0.92rem !important;
            font-weight: 500 !important;
          }

          .search-panel .flight-search-bar-row .field-control::placeholder {
            color: #334155 !important;
            font-weight: 500 !important;
            opacity: 0.9 !important;
          }

          .search-panel .flight-search-bar-row .date-placeholder,
          .search-panel .flight-search-bar-row .date-main-bold,
          .search-panel .flight-search-bar-row .traveller-summary span,
          .search-panel .flight-search-bar-row .class-summary span {
            color: #334155 !important;
            font-weight: 500 !important;
            opacity: 1 !important;
          }

          .search-panel .flight-search-bar-row .source-field,
          .search-panel .flight-search-bar-row .destination-field {
            flex: 1.2 1 auto !important;
          }

          .search-panel .flight-search-bar-row .source-field {
            padding-left: 2px !important;
            border-right: none !important;
          }

          .search-panel .flight-search-bar-row .destination-field {
            padding-left: 12px !important;
          }

          .search-panel .flight-search-bar-row .hotel-destination-field {
            flex: 1.35 1 auto !important;
            padding-left: 8px !important;
            border-right: 1px solid #e2e8f0 !important;
          }

          .search-panel .flight-search-bar-row .hotel-guests-field {
            flex: 1.15 1 auto !important;
            border-right: none !important;
            padding-left: 12px !important;
            padding-right: 8px !important;
          }

          .search-panel .flight-search-bar-row.hotel-search-bar-row .checkin-field,
          .search-panel .flight-search-bar-row.hotel-search-bar-row .checkout-field {
            border-right: 1px solid #e2e8f0 !important;
          }

          .search-panel .flight-search-bar-row .hotel-destination-field svg,
          .search-panel .flight-search-bar-row .checkin-field svg,
          .search-panel .flight-search-bar-row .checkout-field svg,
          .search-panel .flight-search-bar-row .hotel-guests-field svg:first-child {
            color: #dc1e26 !important;
            stroke: #dc1e26 !important;
            flex-shrink: 0 !important;
          }

          .search-panel .flight-search-bar-row.hotel-search-bar-row .hotel-guest-summary-text {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 140px !important;
            display: inline-block !important;
          }

          /* Ensure dropdowns aren't covered by subsequent sibling elements with explicit z-indices */
          .search-panel .flight-search-bar-row .traveller-field {
            z-index: 30 !important;
          }
          .search-panel .flight-search-bar-row .class-field {
            z-index: 25 !important;
          }
          .search-panel .flight-search-bar-row .traveller-field:focus-within,
          .search-panel .flight-search-bar-row .class-field:focus-within {
            z-index: 1200 !important;
          }

          /* Circular Swap Button overlapping boundary */
          .search-panel .flight-search-bar-row .swap-field {
            flex: 0 0 auto !important;
            margin: 0 -10px !important;
            z-index: 10 !important;
            align-self: center !important;
          }

          .search-panel .flight-search-bar-row .swap-btn {
            width: 26px !important;
            height: 26px !important;
            border-radius: 50% !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            color: #dc1e26 !important;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          /* Field Labels (SOURCE, DESTINATION, DEPARTURE, TRAVELLERS, CLASS) - Bold & Dark */
          .search-panel .flight-search-bar-row .field label,
          .search-panel .flight-search-bar-row .traveller-field label,
          .search-panel .flight-search-bar-row .class-field label {
            color: #0f172a !important;
            font-size: 0.68rem !important;
            font-weight: 900 !important;
            letter-spacing: 0.07em !important;
            margin-bottom: 2px !important;
            text-transform: uppercase !important;
            white-space: nowrap !important;
          }
          
          .search-panel .flight-search-bar-row .date-display-wrapper span {
            white-space: nowrap !important;
          }

          /* Red Search Button */
          .search-panel .flight-search-bar-row .search-btn.flight-grid-search-btn {
            flex: 0 0 auto !important;
            width: auto !important;
            min-width: 100px !important;
            height: 36px !important;
            background: #dc1e26 !important;
            color: #ffffff !important;
            border-radius: 9px !important;
            font-weight: 800 !important;
            font-size: 0.65rem !important;
            letter-spacing: 0.04em !important;
            text-transform: uppercase !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            box-shadow: 0 4px 12px rgba(220, 30, 38, 0.3) !important;
            transition: all 0.2s ease !important;
            margin-left: 8px !important;
          }


          .homepage-flights .search-panel .search-btn.flight-grid-search-btn:hover {
            background: #b8141b !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 8px 22px rgba(220, 30, 38, 0.45) !important;
          }

          /* Red Search Hotels Button */
          .search-panel .flight-search-bar-row .search-btn.hotel-search-submit-btn,
          .search-panel .hotel-search-submit-btn {
            flex: 0 0 auto !important;
            width: auto !important;
            min-width: 140px !important;
            height: 38px !important;
            background: #dc2626 !important;
            color: #ffffff !important;
            border-radius: 12px !important;
            font-weight: 800 !important;
            font-size: 0.72rem !important;
            letter-spacing: 0.05em !important;
            text-transform: uppercase !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 7px !important;
            box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35) !important;
            transition: all 0.2s ease !important;
            margin-left: 10px !important;
            padding: 0 22px !important;
            cursor: pointer !important;
            border: none !important;
          }

          .search-panel .flight-search-bar-row .search-btn.hotel-search-submit-btn:hover,
          .search-panel .hotel-search-submit-btn:hover {
            background: #b91c1c !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 18px rgba(220, 38, 38, 0.45) !important;
          }

          .search-panel .flight-search-bar-row .search-btn.hotel-search-submit-btn svg,
          .search-panel .hotel-search-submit-btn svg {
            color: #ffffff !important;
            stroke: #ffffff !important;
          }

          /* ─── Premium Place Autocomplete Dropdown ─── */
          .place-dropdown,
          .bus-place-dropdown {
            position: absolute !important;
            top: calc(100% + 6px) !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            max-height: 320px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            background: #ffffff !important;
            border-radius: 16px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(0, 0, 0, 0.06) !important;
            padding: 6px !important;
            z-index: 9999 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
            box-sizing: border-box !important;
          }

          .place-dropdown::-webkit-scrollbar,
          .bus-place-dropdown::-webkit-scrollbar {
            width: 5px !important;
          }
          .place-dropdown::-webkit-scrollbar-thumb,
          .bus-place-dropdown::-webkit-scrollbar-thumb {
            background: #cbd5e1 !important;
            border-radius: 4px !important;
          }

          .pnb-place-option {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 12px !important;
            width: 100% !important;
            min-height: 48px !important;
            padding: 8px 12px !important;
            background: transparent !important;
            border: none !important;
            border-radius: 10px !important;
            cursor: pointer !important;
            text-align: left !important;
            transition: all 0.15s ease !important;
            box-sizing: border-box !important;
            outline: none !important;
            color: #1e293b !important;
          }

          .pnb-place-option:hover,
          .pnb-place-option:focus {
            background: #f8fafc !important;
            transform: none !important;
          }

          .pnb-place-option:hover .pnb-place-icon-wrap {
            background: #fee2e2 !important;
            color: #dc2626 !important;
          }

          .pnb-place-icon-wrap {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
            background: #f1f5f9 !important;
            color: #64748b !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            transition: all 0.15s ease !important;
          }

          .pnb-place-text {
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            gap: 2px !important;
            min-width: 0 !important;
            flex: 1 !important;
          }

          .pnb-place-primary {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-size: 0.88rem !important;
            font-weight: 700 !important;
            color: #0f172a !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .pnb-place-city {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            text-transform: capitalize !important;
          }

          .pnb-place-code {
            font-size: 0.68rem !important;
            font-weight: 800 !important;
            background: #fee2e2 !important;
            color: #dc2626 !important;
            padding: 1px 6px !important;
            border-radius: 4px !important;
            letter-spacing: 0.04em !important;
            flex-shrink: 0 !important;
          }

          .pnb-place-secondary {
            font-size: 0.74rem !important;
            font-weight: 500 !important;
            color: #64748b !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .place-meta,
          .bus-place-meta {
            padding: 16px 12px !important;
            text-align: center !important;
            font-size: 0.82rem !important;
            font-weight: 500 !important;
            color: #94a3b8 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          /* Ensure hotel destination input is 100% clean and transparent on focus */
          .search-panel .flight-search-bar-row .hotel-destination-field,
          .search-panel .flight-search-bar-row .hotel-destination-field:focus-within,
          .search-panel .flight-search-bar-row .hotel-destination-field .control-wrap,
          .search-panel .flight-search-bar-row .hotel-destination-field:focus-within .control-wrap,
          .search-panel .flight-search-bar-row .field-control,
          .search-panel .flight-search-bar-row .field-control:focus,
          .search-panel .flight-search-bar-row .place-input,
          .search-panel .flight-search-bar-row .place-input:focus {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
          }

          @media (max-width: 100px) {
            /* Disabled the flex wrap so it stays on 1 line even on very small preview screens */
          }
        `}</style>
      <section className={`hero-section ${activeTab === "flights" ? "homepage-flights" : ""} ${activeTab === "buses" ? "homepage-buses" : ""} ${activeTab === "hotels" ? "homepage-hotels" : ""}`}>
        {(activeTab === "flights" || activeTab === "buses" || activeTab === "hotels") && (
          <div className="flight-hero-wallpaper">
            <video
              className="flight-hero-wallpaper-video"
              style={{ display: activeTab === "flights" ? "block" : "none" }}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              src={flightHeroThemeVideo}
            />
            <video
              className="flight-hero-wallpaper-video"
              style={{ display: activeTab === "buses" ? "block" : "none" }}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              src={busHeroVideo}
            />
            <video
              className="flight-hero-wallpaper-video"
              style={{ display: activeTab === "hotels" ? "block" : "none" }}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              src={hotelHeroVideo}
            />
          </div>
        )}
        <div className="hero-content">
          {/* Left-aligned Heading and Subtitle */}
          {activeTab === "flights" ? (
            <div className="flight-hero-header">
              <h1 className="flight-hero-title">
                {homeContent.heroTitleStart}
                <br />
                <span className="flight-hero-title-highlight">{homeContent.heroTitleEnd}</span>
              </h1>
              {homeContent.heroSubtitle && (
                <p className="flight-hero-subtitle">{homeContent.heroSubtitle}</p>
              )}
            </div>
          ) : (
            <div className="hero-header-left">
              <h1 className="hero-title-left">
                {homeContent.heroTitleStart}
                <span className="hero-title-highlight">{homeContent.heroTitleEnd}</span>
              </h1>
              {homeContent.heroSubtitle && (
                <p className="hero-subtitle-left">{homeContent.heroSubtitle}</p>
              )}
            </div>
          )}

          <div className={`hero-grid ${activeTab === "flights" && flightTripType === "multicity" ? "multicity-active" : ""}`}>
            <div className={`search-panel ${activeTab === "flights" && flightTripType === "multicity" ? "is-multicity" : ""}`}>
              <div className="tabs-wrap">
                <div className="tabs" role="tablist" aria-label="Booking type">
                  <button
                    type="button"
                    className={`tab ${activeTab === "flights" ? "active" : ""}`}
                    onClick={() => handleBookingTabChange("flights")}
                  >
                    <Plane size={17} />
                    <span>Flights</span>
                  </button>

                  <button
                    type="button"
                    className={`tab ${activeTab === "buses" ? "active" : ""}`}
                    onClick={() => handleBookingTabChange("buses")}
                  >
                    <Bus size={17} />
                    <span>Buses</span>
                  </button>

                  <button
                    type="button"
                    className={`tab ${activeTab === "hotels" ? "active" : ""}`}
                    onClick={() => handleBookingTabChange("hotels")}
                  >
                    <Building2 size={17} />
                    <span>Hotels</span>
                  </button>
                </div>
              </div>

              {activeTab === "flights" ? (
                <div className="booking-content">
                  <div
                    className="trip-switch"
                    role="tablist"
                    aria-label="Flight trip type"
                  >
                    {FLIGHT_TRIP_TYPES.map((tripType) => {
                      let IconComponent = Plane;
                      if (tripType.value === "twoway") IconComponent = ArrowLeftRight;
                      if (tripType.value === "multicity") IconComponent = Route;
                      return (
                        <button
                          key={tripType.value}
                          type="button"
                          className={`trip-chip ${flightTripType === tripType.value ? "active" : ""
                            }`}
                          onClick={() => setFlightTripType(tripType.value)}
                        >
                          <IconComponent size={14} />
                          <span>{tripType.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {flightTripType === "multicity" ? (
                    <div className="multi-city-list">
                      {multiCityLegs.map((leg) => (
                        <div className="multi-city-row" key={leg.id}>
                          <PlaceAutocomplete
                            label="FROM"
                            value={leg.from}
                            onChange={(nextValue) =>
                              updateMultiCityLeg(leg.id, "from", nextValue)
                            }
                            tripType="flight"
                            field="from"
                            placeholder="Select Source"
                          />

                          <PlaceAutocomplete
                            label="TO"
                            value={leg.to}
                            onChange={(nextValue) =>
                              updateMultiCityLeg(leg.id, "to", nextValue)
                            }
                            tripType="flight"
                            field="to"
                            placeholder="Select Destination"
                          />

                          <div className="field field-with-icon" style={{ position: "relative" }}>
                            <label>Departure</label>
                            <div className="control-wrap">
                              <CalendarDays size={18} />
                              <input
                                type="text"
                                readOnly
                                value={toDisplayDate(leg.departureDate)}
                                placeholder="DD-MM-YYYY"
                                className="field-control with-leading-icon"
                                style={{ cursor: "pointer" }}
                                onClick={() => document.getElementById(`leg-dep-date-${leg.id}`).showPicker?.()}
                              />
                            </div>
                            <input
                              id={`leg-dep-date-${leg.id}`}
                              type="date"
                              value={leg.departureDate}
                              onChange={(event) =>
                                updateMultiCityLeg(
                                  leg.id,
                                  "departureDate",
                                  event.target.value
                                )
                              }
                              style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                            />
                          </div>

                          <div
                            className="multi-actions"
                            aria-label="Multi-city row actions"
                          >
                            <button
                              type="button"
                              className="action-circle action-add"
                              onClick={addMultiCityLeg}
                              title="Add row"
                            >
                              <Plus size={16} />
                            </button>

                            <button
                              type="button"
                              className="action-circle action-delete"
                              onClick={() => removeMultiCityLeg(leg.id)}
                              title="Delete row"
                              disabled={multiCityLegs.length === 1}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="multi-footer-row">
                        {travellerField}
                        {classField}
                        <button
                          type="button"
                          className="search-btn flight-grid-search-btn"
                          onClick={handleSearch}
                        >
                          <Search size={16} />
                          <span>Search Flights</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flight-search-bar-row">
                      <PlaceAutocomplete
                        label="FROM"
                        value={flightFrom}
                        onChange={handleFlightFromChange}
                        tripType="flight"
                        field="from"
                        placeholder="Select Source"
                        error={flightFromError}
                        className="source-field"
                      />

                      <div className="swap-field">
                        <button
                          type="button"
                          className="swap-btn"
                          onClick={handleSwapFlights}
                          aria-label="Swap flight origin and destination"
                        >
                          <ArrowLeftRight size={16} />
                        </button>
                      </div>

                      <PlaceAutocomplete
                        label="TO"
                        value={flightTo}
                        onChange={handleFlightToChange}
                        tripType="flight"
                        field="to"
                        placeholder="Select Destination"
                        error={flightToError}
                        className="destination-field"
                      />

                      <div className="field field-with-icon departure-field" style={{ position: "relative" }}>
                        <label>Departure</label>
                        <div className="control-wrap" style={{ cursor: "pointer" }} onClick={() => document.getElementById("flight-dep-date").showPicker?.()}>
                          <CalendarDays size={18} style={{ color: "#dc1e26", flexShrink: 0 }} />
                          <div className="date-display-wrapper">
                            <span className={flightDepartureDate ? "date-main-bold" : "date-placeholder"}>
                              {flightDepartureDate ? formatFlightDate(flightDepartureDate).date : "DD/MM/YYYY"}
                            </span>
                            {flightDepartureDate && (
                              <span className="date-sub-day">
                                / {formatFlightDate(flightDepartureDate).day}
                              </span>
                            )}
                          </div>
                        </div>
                        <input
                          id="flight-dep-date"
                          type="date"
                          value={flightDepartureDate}
                          onChange={(event) => setFlightDepartureDate(event.target.value)}
                          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                        />
                      </div>

                      {isFlightTwoWay && (
                        <div className="field field-with-icon return-field" style={{ position: "relative" }}>
                          <label>Return</label>
                          <div className="control-wrap" style={{ cursor: "pointer" }} onClick={() => document.getElementById("flight-ret-date").showPicker?.()}>
                            <CalendarDays size={18} style={{ color: "#dc1e26", flexShrink: 0 }} />
                            <div className="date-display-wrapper">
                              <span className={flightReturnDate ? "date-main-bold" : "date-placeholder"}>
                                {flightReturnDate ? formatFlightDate(flightReturnDate).date : "DD/MM/YYYY"}
                              </span>
                              {flightReturnDate && (
                                <span className="date-sub-day">
                                  / {formatFlightDate(flightReturnDate).day}
                                </span>
                              )}
                            </div>
                            <input
                              id="flight-ret-date"
                              type="date"
                              value={flightReturnDate}
                              onChange={(event) => setFlightReturnDate(event.target.value)}
                              style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                            />
                          </div>
                        </div>
                      )}

                      {travellerField}
                      {classField}
                      <button
                        type="button"
                        className="search-btn flight-grid-search-btn"
                        onClick={handleSearch}
                      >
                        <Search size={16} />
                        <span>Search Flights</span>
                      </button>
                    </div>
                  )}

                  {flightTripType !== "multicity" && (
                    <div className="popular-searches-row">
                      <span className="popular-label">Popular Searches:</span>
                      <div className="popular-tags">
                        <button type="button" onClick={() => { handleFlightFromChange("Hyderabad (HYD)"); handleFlightToChange("Chennai (MAA)"); }} className="popular-tag">Hyderabad - Chennai</button>
                        <button type="button" onClick={() => { handleFlightFromChange("Chennai (MAA)"); handleFlightToChange("Mumbai (BOM)"); }} className="popular-tag">Chennai - Mumbai</button>
                        <button type="button" onClick={() => { handleFlightFromChange("Hyderabad (HYD)"); handleFlightToChange("Delhi (DEL)"); }} className="popular-tag">Hyderabad - Delhi</button>
                        <button type="button" onClick={() => { handleFlightFromChange("Chennai (MAA)"); handleFlightToChange("Dubai (DXB)"); }} className="popular-tag">Chennai - Dubai</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === "buses" ? (
                <div className="booking-content">

                  <div className={`flight-search-bar-row ${isBusTwoWay ? "two-way" : "one-way"}`}>
                    <PlaceAutocomplete
                      label="Source"
                      value={busFrom}
                      onChange={handleBusFromChange}
                      tripType="bus"
                      field="from"
                      placeholder="Source"
                      error={busFromError}
                      className="source-field"
                    />

                    <div className="swap-field">
                      <button
                        type="button"
                        className="swap-btn"
                        onClick={handleSwapBuses}
                        aria-label="Swap bus origin and destination"
                      >
                        <ArrowLeftRight size={16} />
                      </button>
                    </div>

                    <PlaceAutocomplete
                      label="Destination"
                      value={busTo}
                      onChange={handleBusToChange}
                      tripType="bus"
                      field="to"
                      placeholder="Destination"
                      error={busToError}
                      className="destination-field"
                    />

                    <div className="field field-with-icon departure-field" style={{ position: "relative" }}>
                      <label>Departure</label>
                      <div className="control-wrap">
                        <CalendarDays size={18} />
                        <input
                          type="text"
                          readOnly
                          value={toDisplayDate(busDepartureDate)}
                          placeholder="DD-MM-YYYY"
                          className="field-control with-leading-icon"
                          style={{ cursor: "pointer" }}
                          onClick={() => document.getElementById("bus-dep-date").showPicker?.()}
                        />
                      </div>
                      <input
                        id="bus-dep-date"
                        type="date"
                        value={busDepartureDate}
                        onChange={(event) => setBusDepartureDate(event.target.value)}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      />
                    </div>

                    {isBusTwoWay && (
                      <div className="field field-with-icon return-field" style={{ position: "relative" }}>
                        <label>Return</label>
                        <div className="control-wrap">
                          <CalendarDays size={18} />
                          <input
                            type="text"
                            readOnly
                            value={toDisplayDate(busReturnDate)}
                            placeholder="DD-MM-YYYY"
                            className="field-control with-leading-icon"
                            style={{ cursor: "pointer" }}
                            onClick={() => document.getElementById("bus-ret-date").showPicker?.()}
                          />
                          <input
                            id="bus-ret-date"
                            type="date"
                            value={busReturnDate}
                            onChange={(event) => setBusReturnDate(event.target.value)}
                            style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="search-btn flight-grid-search-btn"
                      onClick={handleSearch}
                    >
                      <Search size={16} />
                      <span>Search Buses</span>
                    </button>
                  </div>
                </div>
              ) : (
                <HotelSearchWidget
                  onSearch={navigateToHotelSearch}
                  initialDestination={state.hotelDestination || ""}
                  initialCheckIn={state.hotelCheckInDate || ""}
                  initialCheckOut={state.hotelCheckOutDate || ""}
                  initialRoomsConfig={state.hotelRoomsConfig || null}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bus-offers-section section-shell">
        <div className="bus-offers-content-shell">
          {/* Top Header Row */}
          <div className="bus-offers-header-row">
            <div>
              <h2 className="bus-offers-title">Featured Offers</h2>
              <p className="bus-offers-subtitle">
                Best deals on buses. Grab them before they're gone!
              </p>
            </div>

            <button
              type="button"
              className="bus-offers-view-all"
              onClick={() => setIsDealsDialogOpen(true)}
            >
              <span>View all deals</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Category Filter Tabs Bar */}
          <div className="bus-offers-tabs-bar">
            <button
              type="button"
              className={`bus-offers-tab-btn ${offersFilter === "all" ? "active" : ""}`}
              onClick={() => setOffersFilter("all")}
            >
              <Tag size={13} />
              <span>All Offers</span>
            </button>
            <button
              type="button"
              className={`bus-offers-tab-btn ${offersFilter === "flight" ? "active" : ""}`}
              onClick={() => setOffersFilter("flight")}
            >
              <Plane size={13} />
              <span>Flights</span>
            </button>
            <button
              type="button"
              className={`bus-offers-tab-btn ${offersFilter === "bus" ? "active" : ""}`}
              onClick={() => setOffersFilter("bus")}
            >
              <Bus size={13} />
              <span>Buses</span>
            </button>
            <button
              type="button"
              className={`bus-offers-tab-btn ${offersFilter === "hotel" ? "active" : ""}`}
              onClick={() => setOffersFilter("hotel")}
            >
              <Building2 size={13} />
              <span>Hotels</span>
            </button>
          </div>

          {/* Auto-Scrolling Featured Offers Marquee */}
          <AutoMarquee
            items={filteredOffers.length > 0 ? filteredOffers : DEFAULT_BUS_FEATURED_OFFERS}
            className="offer-marquee"
            duration={24}
            pauseOnHover={false}
            renderItem={(offer, idx) => {
              const themeNames = ["theme-pink", "theme-green", "theme-yellow", "theme-blue"];
              const themeClass = offer.theme ? `theme-${offer.theme}` : themeNames[idx % 4];

              const rawCode = offer.couponCode || offer.code || offer.title || "BUSOFFER";
              let code = rawCode;
              if (!rawCode || /^coupon[_-]?code/i.test(rawCode)) {
                const sampleCodes = ["SAVER500", "FESTIVE15", "SUPERBUS", "LUXURY25", "ACVOLVO100", "NIGHTS50"];
                code = sampleCodes[idx % sampleCodes.length];
              }

              const badgeText = offer.badgeLabel || (idx % 3 === 0 ? "SPECIAL OFFER" : idx % 3 === 1 ? "EXCLUSIVE OFFER" : "50% OFF");

              const rawAdminImg = offer.imageUrl || offer.image || offer.bannerUrl || offer.bannerImage || offer.imgUrl || offer.mediaUrl || offer.banner;
              let apiOfferImg = null;
              if (rawAdminImg && typeof rawAdminImg === "string" && rawAdminImg.trim()) {
                const trimmed = rawAdminImg.trim();
                apiOfferImg = /^https?:\/\//i.test(trimmed) || /^data:image/i.test(trimmed) ? trimmed : toApiUrl(trimmed);
              }

              return (
                <article
                  key={offer.id || idx}
                  className={`bus-card-unit ${themeClass}`}
                  onClick={() => setOfferForDetailPopup(offer)}
                >
                  {/* Top Bar: Icon + Category */}
                  <div className="bus-card-top-bar">
                    <div className="bus-card-icon-badge">
                      <Bus size={15} />
                    </div>
                    <span className="bus-card-cat">BUS OFFER</span>
                  </div>

                  {/* Center Info: Code & Validity */}
                  <div className="bus-card-center">
                    <h3 className="bus-card-code">{code}</h3>
                    <p className="bus-card-expiry">
                      {formatExpiryDate(offer.couponExpiresAtUtc || offer.endDateUtc)}
                    </p>
                  </div>

                  {/* Bottom Badge Pill */}
                  <div className="bus-card-bottom-bar">
                    <span className="bus-card-tag-pill">{badgeText}</span>
                  </div>

                  {/* Top Right Starburst / Badge Ribbon */}
                  <div className="bus-card-starburst">
                    {badgeText}
                  </div>

                  {/* Only API Provided Image (No Static Fallbacks) */}
                  {apiOfferImg && (
                    <img
                      src={apiOfferImg}
                      alt={offer.title || "Offer Graphic"}
                      className="bus-card-vehicle-graphic"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                </article>
              );
            }}
          />
        </div>
      </section>

      {/* TRAVEL DESK SERVICES Banner Section - Dynamic per active tab */}
      {(() => {
        const isFlight = activeTab === "flights";
        const isHotel = activeTab === "hotels";

        const config = isFlight
          ? {
            headline: <>Your Flight.<br /><span className="td-highlight-red">Our Priority.</span></>,
            subtitle: "Discover the best flight routes, compare fares, and book tickets in just a few clicks. Fast, easy, and reliable - all in one place.",
            features: [
              { icon: <Search size={17} />, title: "Smart Search", desc: "Find flights across hundreds of routes with smart filters." },
              { icon: <Clock3 size={17} />, title: "Live Flight Status", desc: "Get real-time departure, arrival & delay updates instantly." },
              { icon: <Ticket size={17} />, title: "Best Fares", desc: "Compare prices and choose the best deals that fit your budget." },
              { icon: <ShieldCheck size={17} />, title: "Safe & Secure", desc: "Secure payments and verified bookings for peace of mind." },
            ],
            btnIcon: <Plane size={16} />,
            btnLabel: "Search Flights Now",
            btnAction: () => setActiveTab("flights"),
            bgImage: sunsetHighwayBg,
            vehicleImg: flightSectionNewBanner,
            vehicleAlt: "Flight Booking Illustration",
            vehicleTag: "",
            stats: [
              { color: "red", icon: <Plane size={15} />, value: "500+", label: "Airlines" },
              { color: "purple", icon: <Users size={15} />, value: "10L+", label: "Happy Customers" },
              { color: "crimson", icon: <MapPin size={15} />, value: "300+", label: "Destinations" },
              { color: "dark", icon: <Headphones size={15} />, value: "24/7", label: "Support Available" },
            ],
            phoneGreeting: "Book Your Flight!",
            phoneSub: "Where are you flying to?",
            phoneField1Icon: <Plane size={13} className="td-field-icon" />,
            phoneField1Label: "From",
            phoneField1Value: "Delhi",
            phoneField2Icon: <Plane size={13} className="td-field-icon" />,
            phoneField2Label: "To",
            phoneField2Value: "Mumbai",
            phoneDateLabel: "Travel Date",
            phoneDateValue: "25 May, 2025",
            phoneSubmitLabel: "Search Flights",
          }
          : isHotel
            ? {
              headline: <>Your Stay.<br /><span className="td-highlight-red">Our Priority.</span></>,
              subtitle: "Discover the best hotels, compare rates, and book your perfect stay in just a few clicks. Fast, easy, and reliable - all in one place.",
              features: [
                { icon: <Search size={17} />, title: "Smart Search", desc: "Find hotels across hundreds of destinations with smart filters." },
                { icon: <BedDouble size={17} />, title: "Room Availability", desc: "Get live room availability & pricing updates instantly." },
                { icon: <Ticket size={17} />, title: "Best Rates", desc: "Compare prices and choose the best deals that fit your budget." },
                { icon: <ShieldCheck size={17} />, title: "Safe & Secure", desc: "Secure payments and verified bookings for peace of mind." },
              ],
              btnIcon: <Building2 size={16} />,
              btnLabel: "Search Hotels Now",
              btnAction: () => setActiveTab("hotels"),
              bgImage: sunsetHighwayBg,
              vehicleImg: hotelSectionBanner,
              vehicleAlt: "Hotel Booking Illustration",
              vehicleTag: "",
              stats: [
                { color: "red", icon: <Building2 size={15} />, value: "2000+", label: "Hotels Listed" },
                { color: "purple", icon: <Users size={15} />, value: "10L+", label: "Happy Customers" },
                { color: "crimson", icon: <MapPin size={15} />, value: "200+", label: "Cities Covered" },
                { color: "dark", icon: <Headphones size={15} />, value: "24/7", label: "Support Available" },
              ],
              phoneGreeting: "Book Your Hotel!",
              phoneSub: "Where are you staying?",
              phoneField1Icon: <MapPin size={13} className="td-field-icon" />,
              phoneField1Label: "Destination",
              phoneField1Value: "Goa",
              phoneField2Icon: <BedDouble size={13} className="td-field-icon" />,
              phoneField2Label: "Rooms",
              phoneField2Value: "1 Room, 2 Adults",
              phoneDateLabel: "Check-in Date",
              phoneDateValue: "25 May, 2025",
              phoneSubmitLabel: "Search Hotels",
            }
            : {
              headline: <>Your Journey.<br /><span className="td-highlight-red">Our Priority.</span></>,
              subtitle: "Discover the best bus routes, compare fares, and book your tickets in just a few clicks. Fast, easy, and reliable - all in one place.",
              features: [
                { icon: <Search size={17} />, title: "Smart Search", desc: "Find buses across thousands of routes with smart filters." },
                { icon: <Clock3 size={17} />, title: "Real-time Updates", desc: "Get live timings, seat availability & prices instantly." },
                { icon: <Ticket size={17} />, title: "Best Fares", desc: "Compare prices and choose the best deals that fit your budget." },
                { icon: <ShieldCheck size={17} />, title: "Safe & Secure", desc: "Secure payments and verified bookings for peace of mind." },
              ],
              btnIcon: <Bus size={16} />,
              btnLabel: "Search Buses Now",
              btnAction: () => openPopularBusRoutes(),
              bgImage: sunsetHighwayBg,
              vehicleImg: busCoastBanner,
              vehicleAlt: "Pick N Book Luxury Bus",
              vehicleTag: "",
              stats: [
                { color: "red", icon: <MapPin size={15} />, value: "5000+", label: "Routes Covered" },
                { color: "purple", icon: <Users size={15} />, value: "10L+", label: "Happy Customers" },
                { color: "crimson", icon: <Handshake size={15} />, value: "1000+", label: "Trusted Partners" },
                { color: "dark", icon: <Headphones size={15} />, value: "24/7", label: "Support Available" },
              ],
              phoneGreeting: "Hello, Traveller!",
              phoneSub: "Where are you going?",
              phoneField1Icon: <Bus size={13} className="td-field-icon" />,
              phoneField1Label: "From",
              phoneField1Value: "City A",
              phoneField2Icon: <Bus size={13} className="td-field-icon" />,
              phoneField2Label: "To",
              phoneField2Value: "City B",
              phoneDateLabel: "Journey Date",
              phoneDateValue: "25 May, 2025",
              phoneSubmitLabel: "Search Buses",
            };

        return (
          <section className="td-services-section section-shell">
            <div className="td-services-card">
              <div className="td-services-body-grid">
                {/* Left White Copy & Features Column */}
                <div className="td-services-left-col">
                  <h2 className="td-services-headline">{config.headline}</h2>
                  <div className="td-services-underline" />
                  <p className="td-services-paragraph">{config.subtitle}</p>

                  <div className="td-services-features-list">
                    {config.features.map((f, i) => (
                      <div className="td-feature-item" key={i}>
                        <div className="td-feature-icon-box">{f.icon}</div>
                        <div className="td-feature-text">
                          <strong>{f.title}</strong>
                          <p>{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="td-services-actions-row">
                    <button
                      type="button"
                      className="td-search-now-btn"
                      onClick={config.btnAction}
                    >
                      {config.btnIcon}
                      <span>{config.btnLabel}</span>
                      <ChevronRight size={16} className="td-btn-arrow" />
                    </button>
                    <div className="td-need-help-pill">
                      <div className="td-help-icon-circle">
                        <Headphones size={15} />
                      </div>
                      <div className="td-help-meta">
                        <strong>Need Help?</strong>
                        <span>24/7 Customer Support</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: BG + Stats + Visual Mockup */}
                <div className="td-services-right-col" style={{ backgroundImage: `url(${config.bgImage})` }}>
                  <div className="td-curved-divider-overlay" />

                  <div className="td-floating-stats-glass-bar">
                    {config.stats.map((s, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <div className="td-glass-stat-divider" />}
                        <div className="td-glass-stat-item">
                          <div className={`td-stat-icon-circle ${s.color}`}>{s.icon}</div>
                          <div className="td-stat-info">
                            <strong>{s.value}</strong>
                            <span>{s.label}</span>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="td-services-visual-stage">
                    <div className="td-bus-visual-wrap">
                      {config.vehicleTag && <div className="td-bus-display-tag">{config.vehicleTag}</div>}
                      <img src={config.vehicleImg} alt={config.vehicleAlt} className="td-stage-bus-img" />
                    </div>

                    <div className="td-phone-device-frame">
                      <div className="td-phone-notch" />
                      <div className="td-phone-inner-screen">
                        <div className="td-phone-greeting">
                          <span className="td-greeting-title">{config.phoneGreeting}</span>
                          <span className="td-greeting-sub">{config.phoneSub}</span>
                        </div>
                        <div className="td-phone-field-box">
                          {config.phoneField1Icon}
                          <div className="td-field-labels">
                            <span className="td-field-lbl">{config.phoneField1Label}</span>
                            <strong>{config.phoneField1Value}</strong>
                          </div>
                        </div>
                        <div className="td-phone-field-box">
                          {config.phoneField2Icon}
                          <div className="td-field-labels">
                            <span className="td-field-lbl">{config.phoneField2Label}</span>
                            <strong>{config.phoneField2Value}</strong>
                          </div>
                        </div>
                        <div className="td-phone-field-box">
                          <CalendarDays size={13} className="td-field-icon" />
                          <div className="td-field-labels">
                            <span className="td-field-lbl">{config.phoneDateLabel}</span>
                            <strong>{config.phoneDateValue}</strong>
                          </div>
                        </div>
                        <button type="button" className="td-phone-main-submit-btn">
                          {config.phoneSubmitLabel}
                        </button>
                        <div className="td-phone-bottom-nav">
                          <div className="td-nav-item active">
                            <CalendarDays size={11} /><span>My Bookings</span>
                          </div>
                          <div className="td-nav-item">
                            <Tag size={11} /><span>Offers</span>
                          </div>
                          <div className="td-nav-item">
                            <Headphones size={11} /><span>Help Center</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="td-stage-suitcase-graphic">
                      <div className="td-straw-hat-decor" />
                      <div className="td-suitcase-body" />
                      <div className="td-plant-pot-decor" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {
        activeTab === "buses" && (
          <section className="popular-routes-section section-shell">
            <div className="section-header">
              <div>
                <span className="section-kicker">POPULAR BUS ROUTES</span>
                <h2>Most Booked Bus Routes</h2>
              </div>
            </div>

            {popularRoutesLoading ? (
              <div className="popular-routes-loading">Loading popular routes...</div>
            ) : popularRoutesError ? (
              <div className="popular-routes-error">{popularRoutesError}</div>
            ) : popularRoutes.length === 0 ? (
              <div className="popular-routes-empty">No popular routes available.</div>
            ) : (
              <AutoMarquee
                items={popularRoutes}
                className="popular-routes-marquee"
                duration={36}
                renderItem={(route, idx) => {
                  const BUS_PHOTOS = [
                    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80&fit=crop&auto=format",
                    "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&q=80&fit=crop&auto=format",
                    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80&fit=crop&auto=format",
                    "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?w=600&q=80&fit=crop&auto=format"
                  ];
                  const cityImg = getCityImage(route.toCity || route.fromCity, "");
                  const busImg = cityImg || BUS_PHOTOS[idx % BUS_PHOTOS.length];

                  return (
                    <article
                      className="pop-route-card"
                      key={route.id || idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => handlePopularRouteBooking(route)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePopularRouteBooking(route); } }}
                    >
                      <div className="pop-route-img-wrap">
                        <img
                          src={busImg}
                          alt={`${route.fromCity} to ${route.toCity}`}
                          loading="lazy"
                          onError={(e) => { e.target.onerror = null; e.target.src = BUS_PHOTOS[idx % BUS_PHOTOS.length]; }}
                        />
                        <div className="pop-route-img-overlay">
                          <span className="pop-route-tag-search">BUS</span>
                        </div>
                      </div>
                      <div className="pop-route-body">
                        <div className="pop-route-cities-row">
                          <span className="pop-route-city from" title={route.fromCity}>{route.fromCity}</span>
                          <div className="pop-route-icon-circle"><Bus size={13} /></div>
                          <span className="pop-route-city to" title={route.toCity}>{route.toCity}</span>
                        </div>
                      </div>
                      <button type="button" className="pop-route-book-btn"
                        onClick={(e) => { e.stopPropagation(); handlePopularRouteBooking(route); }}
                      >BOOK BUS</button>
                    </article>
                  );
                }}
              />
            )}
          </section>
        )
      }

      {dealsDialog}
      {offerDetailDialog}



      {
        activeTab === "flights" && (
          <>
            <section className="popular-section section-shell">
              <div className="section-header">
                <div>
                  <span className="section-kicker">Popular Picks</span>
                  <h2>Trending Flight Routes</h2>
                </div>
              </div>

              {popularFlightsLoading ? (
                <div className="popular-routes-loading">Loading popular flights...</div>
              ) : popularFlightsError ? (
                <div className="popular-routes-error">{popularFlightsError}</div>
              ) : popularFlights.length === 0 ? (
                <div className="popular-routes-empty">No popular flights available.</div>
              ) : (
                <AutoMarquee
                  items={popularFlights}
                  className="popular-routes-marquee flight-routes-marquee"
                  duration={38}
                  renderItem={(flight) => (
                    <article
                      className="pop-route-card pop-flight-card"
                      key={flight.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handlePopularFlightBooking(flight)}
                    >
                      <div className="pop-route-img-wrap">
                        <img
                          src={getCityImage(flight.toCity, "flight_default")}
                          alt={`${flight.fromCity} to ${flight.toCity}`}
                          loading="lazy"
                          onError={(e) => { e.target.onerror = null; e.target.src = CITY_IMAGES.flight_default; }}
                        />
                        <div className="pop-route-img-overlay">
                          <span className="pop-route-tag-search">FLIGHT</span>
                        </div>
                      </div>
                      <div className="pop-route-body">
                        <div className="pop-route-cities-row">
                          <span className="pop-route-city from" title={flight.fromCity}>{flight.fromCity}</span>
                          <div className="pop-route-icon-circle"><Plane size={13} /></div>
                          <span className="pop-route-city to" title={flight.toCity}>{flight.toCity}</span>
                        </div>
                      </div>
                      <button type="button" className="pop-route-book-btn"
                        onClick={(e) => { e.stopPropagation(); handlePopularFlightBooking(flight); }}
                      >BOOK FLIGHT</button>
                    </article>
                  )}
                />
              )}
            </section>

            <section className="brands-section section-shell">
              <div className="section-header">
                <div>
                  <h2>Airline Brands</h2>
                </div>
              </div>

              <AutoMarquee
                items={AIRLINE_BRANDS}
                className="brand-marquee"
                duration={30}
                renderItem={(brand) => (
                  <article className="brand-slide">
                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="brand-logo"
                      style={{ "--brand-scale": brand.scale }}
                    />
                    <span>{brand.name}</span>
                  </article>
                )}
              />
            </section>
          </>
        )
      }

      {
        activeTab === "hotels" && (
          <section className="popular-section hotel-popular-section section-shell">
            <div className="section-header">
              <div>
                <span className="section-kicker">Popular Stays</span>
                <h2>Trending Hotel Picks</h2>
              </div>
            </div>

            {popularHotelsLoading ? (
              <div className="popular-routes-loading">Loading popular stays...</div>
            ) : popularHotels.length === 0 ? (
              <div className="popular-routes-empty">No popular stays available.</div>
            ) : (
              <AutoMarquee
                items={popularHotels}
                className="popular-routes-marquee hotel-routes-marquee"
                duration={38}
                renderItem={(hotel, idx) => (
                  <article
                    className="pop-route-card pop-hotel-card"
                    key={hotel.id || idx}
                    role="button"
                    tabIndex={0}
                    onClick={() => handlePopularHotelBooking(hotel)}
                  >
                    <div className="pop-route-img-wrap">
                      <img
                        src={hotel.hotelImage || hotel.image || hotel.imageUrl || HOTEL_ROOM_IMAGES[idx % HOTEL_ROOM_IMAGES.length] || hotelSectionBanner}
                        alt={`${hotel.name} - ${hotel.city}`}
                        loading="lazy"
                        onError={(e) => { e.target.onerror = null; e.target.src = hotelSectionBanner; }}
                      />
                      <div className="pop-route-img-overlay">
                        <span className="pop-route-tag-search">STAY</span>
                      </div>
                    </div>
                    <div className="pop-route-body">
                      <p className="pop-hotel-name">{hotel.name}</p>
                      <p className="pop-hotel-sub">{hotel.city} &nbsp;•&nbsp; From INR {hotel.price}</p>
                    </div>
                    <button type="button" className="pop-route-book-btn"
                      onClick={(e) => { e.stopPropagation(); handlePopularHotelBooking(hotel); }}
                    >BOOK HOTEL</button>
                  </article>
                )}
              />
            )}
          </section>
        )
      }

      {/* Assurance Paragraph Card Section */}
      <section className="assurance-section section-shell">
        <div className="assurance-paragraph-card">
          <div className="assurance-paragraph-header">
            <span className="assurance-badge">
              <ShieldCheck size={16} />
              {homeContent.assuranceBadge}
            </span>
            <h2 className="assurance-paragraph-title">
              {homeContent.assuranceEnding}
            </h2>
          </div>
          <p className="assurance-paragraph-text">
            Every booking made through Pick N Book undergoes real-time verification, transparent fare comparison, and instant confirmation. From exact travel dates, passenger counts, and room amenity conditions to live seat selection and flexible cancellation policies, we ensure your trip parameters are completely validated before you pay. Enjoy complete peace of mind with 24/7 dedicated support.
          </p>
        </div>
      </section>

      {/* Highlight Banner Split Card Section - Dynamic per Tab */}
      <section className="world-class-services-section section-shell" style={{ paddingTop: 0 }}>
        <div className="world-class-banner-card">
          <div className="world-class-banner-copy">
            <span className="banner-badge">{homeContent.bannerBadge || "INTERCITY BUS & SEAT GUARANTEE"}</span>
            <h2>{homeContent.bannerTitle || "Book Bus Tickets Smarter. Travel Farther."}</h2>
            <p>{homeContent.bannerText || "Join over 10 Lakh+ happy passengers who trust Pick N Book for comfortable AC Volvo, sleeper, and luxury bus bookings across 5,000+ routes."}</p>
            <div className="banner-stats-row">
              {(homeContent.bannerStats || [
                ["99.8%", "On-Time Departure"],
                ["5,000+", "Daily Bus Routes"],
                ["0%", "Hidden Fees"],
              ]).map(([val, lbl], index, arr) => (
                <React.Fragment key={lbl}>
                  <div className="banner-stat-item">
                    <strong>{val}</strong>
                    <span>{lbl}</span>
                  </div>
                  {index < arr.length - 1 && <div className="banner-stat-divider" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="world-class-banner-visual">
            <img
              src={homeContent.bannerImage || busCoastBanner}
              alt={homeContent.bannerAlt || "Travel Banner"}
              className="world-class-banner-img"
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section - Matching Image 1 Design Mockup */}
      <section className="client-testimonials-section section-shell">
        <div className="client-testimonials-container">
          {/* Left Scenic Hiker Image Card with Floating Glass Badge */}
          <div className="client-testimonial-left-visual">
            <img
              src={picknbookAllTravelBanner}
              alt="5000+ Satisfied Customers"
              className="client-testimonial-landscape-img"
            />
            {/* Floating Glass Pill Badge */}
            <div className="client-testimonial-badge-pill">
              <div className="client-avatar-stack">
                <span className="avatar-circle av1">AM</span>
                <span className="avatar-circle av2">AJ</span>
                <span className="avatar-circle av3">MK</span>
              </div>
              <div className="client-badge-text">
                <strong>5000+</strong>
                <span>Satisfied Customers</span>
              </div>
            </div>
          </div>

          {/* Right Dark Navy Container */}
          <div className="client-testimonials-right-dark-box">
            <div className="client-testimonials-header">
              <h2 className="client-testimonial-title">
                What Our Client <span className="client-title-muted">Say About Us</span>
              </h2>
            </div>

            {/* Testimonials Auto-Scrolling Marquee */}
            <AutoMarquee
              items={[
                {
                  comment: "Booking our adventure tour with PickNBook was the best decision! Every moment was filled with excitement and wonder.",
                  author: "Alex Martinez",
                  role: "Travel Blogger",
                  initials: "AM",
                },
                {
                  comment: "The hotel booking process was seamless with instant confirmation. Great discounts and zero hidden convenience charges!",
                  author: "Priya Sharma",
                  role: "Corporate Traveler",
                  initials: "PS",
                },
                {
                  comment: "Comparing domestic flight timings and fares on PickNBook is so clear. Best price guarantee really works!",
                  author: "Rahul Verma",
                  role: "Frequent Flyer",
                  initials: "RV",
                },
                {
                  comment: "I travel intercity by Volvo buses often. Live bus tracking and seat selection on PickNBook make every journey smooth.",
                  author: "Sarah Jenkins",
                  role: "Digital Nomad",
                  initials: "SJ",
                },
                {
                  comment: "Booked our resort stay in Goa through PickNBook. Fantastic room options and transparent cancellation terms.",
                  author: "David Chen",
                  role: "Family Traveler",
                  initials: "DC",
                },
                {
                  comment: "Fast customer support and instant refund tracking gave me full confidence for all my trip bookings!",
                  author: "Ananya Roy",
                  role: "Backpacker",
                  initials: "AR",
                },
                {
                  comment: "The UI is so clean and fast. Found cheap flights to Mumbai in under 2 minutes!",
                  author: "Vikram Malhotra",
                  role: "Tech Lead",
                  initials: "VM",
                },
                {
                  comment: "Super convenient seat selection for luxury sleeper buses. Highly recommended for weekend trips!",
                  author: "Sneha Patel",
                  role: "Weekend Explorer",
                  initials: "SP",
                },
                {
                  comment: "Great package deals on luxury hotels in Jaipur. Saved over 30% compared to other platforms.",
                  author: "Rohan Gupta",
                  role: "Luxury Traveler",
                  initials: "RG",
                },
                {
                  comment: "Seamless mobile booking experience! Received e-tickets instantly via SMS and email.",
                  author: "Meera Nair",
                  role: "Solo Traveler",
                  initials: "MN",
                },
              ]}
              className="client-testimonials-marquee"
              duration={12}
              pauseOnHover={false}
              renderItem={(review, idx) => (
                <article className="client-testimonial-card" key={idx}>
                  <div className="client-card-stars-row">
                    {[...Array(5)].map((_, sIdx) => (
                      <Star key={sIdx} size={14} fill="#f59e0b" stroke="#f59e0b" />
                    ))}
                  </div>
                  <p className="client-card-comment">"{review.comment}"</p>
                  <div className="client-card-author-row">
                    <div className="client-card-avatar">{review.initials}</div>
                    <div className="client-card-author-meta">
                      <strong className="client-card-author-name">{review.author}</strong>
                      <span className="client-card-author-role">{review.role}</span>
                    </div>
                  </div>
                </article>
              )}
            />
          </div>
        </div>
      </section>

      {/* Modern Exclusive Offers Newsletter Banner */}
      <section className="modern-signup-section section-shell">
        <div className="modern-signup-card">
          {/* Background Decorative Glow Elements */}
          <div className="modern-signup-glow-circle glow-1" aria-hidden="true" />
          <div className="modern-signup-glow-circle glow-2" aria-hidden="true" />

          <div className="modern-signup-content">
            {/* Left Copy */}
            <div className="modern-signup-copy">
              <h2 className="modern-signup-heading">
                Unlock <span className="highlight-red-text">Exclusive Offers</span> On Your Next Journey
              </h2>
              <p className="modern-signup-subtext">
                Sign up to receive secret flight deals, hotel discount coupons & promo codes directly in your inbox.
              </p>
              <div className="modern-signup-trust-row">
                <span><ShieldCheck size={14} className="trust-icon" /> No Spam Guarantee</span>
                <span className="trust-dot">•</span>
                <span><Tag size={14} className="trust-icon" /> Instant Promo Codes</span>
                <span className="trust-dot">•</span>
                <span><Clock size={14} className="trust-icon" /> Cancel Anytime</span>
              </div>
            </div>

            {/* Right Action Box: Interactive Email Input + Button */}
            <div className="modern-signup-action-box">
              <form
                className="modern-signup-email-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate("/login");
                }}
              >
                <div className="modern-email-input-wrap">
                  <Mail size={18} className="email-field-icon" />
                  <input
                    type="email"
                    placeholder="Enter your email address..."
                    className="modern-email-input"
                    required
                  />
                </div>
                <button type="submit" className="modern-signup-submit-btn">
                  <span>Get Secret Deals</span>
                  <ArrowRight size={16} />
                </button>
              </form>
              <div className="modern-signup-or-login">
                <span>Already a member?</span>
                <button
                  type="button"
                  className="modern-login-link-btn"
                  onClick={() => navigate("/login")}
                >
                  Login / Sign Up →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="india-booking-section section-shell">
        <div className="india-faq-block">
          <div className="section-header india-static-header">
            <div>
              <span className="section-kicker">Help Center</span>
              <h2>{homeContent.faqHeading}</h2>
            </div>
            <button type="button" className="india-faq-link">
              View all FAQs
            </button>
          </div>

          <div className="india-faq-list">
            {homeContent.faqs.map((item) => (
              <details className="india-faq-item" key={item.id}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="india-app-card">
          <div className="india-app-mark" aria-hidden="true">
            <HomeModeIcon size={42} />
            <span>APP</span>
          </div>

          <div className="india-app-copy">
            <span className="section-kicker">{homeContent.appKicker}</span>
            <h2>{homeContent.appTitle}</h2>
            <p>{homeContent.appText}</p>
            <div className="india-offer-chip">{homeContent.appOffer}</div>
          </div>

          <div className="india-app-side">
            <ul className="india-app-benefits">
              {homeContent.appBenefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>

            <div className="india-app-qr" aria-label="App QR code">
              <div className="india-app-qr-code" aria-hidden="true">
                {Array.from({ length: 49 }, (_, index) => (
                  <span
                    key={index}
                    className={
                      [0, 2, 3, 6, 7, 9, 12, 14, 17, 18, 20, 22, 24, 27, 28, 31, 33, 35, 37, 38, 41, 43, 45, 46, 48].includes(index)
                        ? "filled"
                        : undefined
                    }
                  />
                ))}
              </div>
              <strong>Scan QR</strong>
              <span>Get app link</span>
            </div>

          </div>
        </div>

        <div className="india-about-block">
          <h2>{homeContent.aboutTitle}</h2>
          {homeContent.aboutParagraphs && homeContent.aboutParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <div
        className={`home-ai-chat ${activeTab} ${isAiChatOpen ? "open" : "closed"}`}
        ref={aiChatShellRef}
      >
        {!isAiChatOpen && (
          <button
            type="button"
            className="home-ai-toggle"
            aria-expanded={false}
            aria-controls="home-ai-chat-panel"
            aria-label="Open AI chat"
            onClick={() => setIsAiChatOpen(true)}
          >
            <span className="home-ai-help-pill">
              <span className="home-ai-help-spark" />
              <span>May I help you?</span>
            </span>
            <span className="home-ai-plane-orb" aria-hidden="true">
              <TravelAiLogoIcon size={56} />
            </span>
          </button>
        )}

        {isAiChatOpen && (
          <aside
            className="home-ai-chat-panel"
            id="home-ai-chat-panel"
            aria-label="Travel AI Assistant"
          >
            <div className="home-ai-cameo" aria-hidden="true">
              <span className="home-ai-cameo-halo" />
              <TravelAiLogoIcon size={36} />
            </div>

            <div className="home-ai-chat-head">
              <div className="home-ai-chat-head-copy">
                <strong>Travel AI</strong>
                <span className="home-ai-chat-status">
                  May I help you?
                </span>
              </div>
              <div className="home-ai-chat-head-actions" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                <button
                  type="button"
                  className="home-ai-close-btn"
                  onClick={() => setIsAiChatOpen(false)}
                  aria-label="Close AI chat"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="home-ai-reset-btn"
                  onClick={handleAiChatReset}
                  disabled={!canResetAiChat}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="home-ai-chat-messages" ref={aiChatMessagesRef}>
              {aiChatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`home-ai-chat-message ${message.role === "user" ? "user" : "assistant"
                    }`}
                >
                  {message.text}
                </div>
              ))}

              {isAiTyping && (
                <div className="home-ai-chat-message assistant typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>

            <form className="home-ai-chat-form" onSubmit={handleAiChatSubmit}>
              <input
                type="text"
                value={aiChatInput}
                onChange={(event) => setAiChatInput(event.target.value)}
                placeholder="Ask Travel AI..."
                maxLength={220}
              />
              <button type="submit">Send</button>
            </form>
          </aside>
        )}
      </div>

    </div >
  );
}
