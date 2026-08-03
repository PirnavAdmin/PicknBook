import React, { useEffect, useState } from "react";
import {
  Search,
  Ticket,
  ShieldCheck,
  Award,
  MapPin,
  Tag,
  Percent,
  RefreshCw,
  CheckCircle2,
  Zap,
  Headphones,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import pickNBookLogo from "../assets/images/brand/pick-n-book-logo.png";
import "../STYLES/FlightLoadingScreen.css";

const SLIDE_IMAGES = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000&q=85&fit=crop&auto=format", /* Airplane wing over sunset */
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1000&q=85&fit=crop&auto=format", /* Executive cabin window */
  "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=1000&q=85&fit=crop&auto=format", /* Commercial jet in sky */
  "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=1000&q=85&fit=crop&auto=format", /* First class passenger suite */
];

const SLIDES = [
  {
    id: 0,
    type: "deals",
    bgImage: SLIDE_IMAGES[0],
    titleStart: "Unlock Exclusive Flight ",
    titleHighlight: "Deals",
    subtitle: "Finding the lowest fares just for you.",
    steps: [
      { id: 0, icon: Tag, label: "Exclusive flight offers" },
      { id: 1, icon: Percent, label: "Save more on every booking" },
      { id: 2, icon: RefreshCw, label: "Flexible travel options" },
      { id: 3, icon: CheckCircle2, label: "Hassle-free experience" },
    ],
  },
  {
    id: 1,
    type: "welcome",
    bgImage: SLIDE_IMAGES[1],
    titleStart: "Welcome to ",
    titleMiddle: "Pick ",
    titleHighlight: "N",
    titleEnd: " Book",
    subtitle: "Finding the best fares from 500+ airlines.",
    steps: [
      { id: 0, icon: Search, label: "Search best flights" },
      { id: 1, icon: Ticket, label: "Compare fares from airlines" },
      { id: 2, icon: ShieldCheck, label: "Secure your perfect journey" },
      { id: 3, icon: Award, label: "Best deals guaranteed" },
    ],
  },
  {
    id: 2,
    type: "details",
    bgImage: SLIDE_IMAGES[2],
    titleStart: "It’s the details that ",
    titleHighlightSerif: "journey perfect",
    subtitle: "Connecting to major global airlines...",
    steps: [
      { id: 0, icon: Search, label: "Searching best flights" },
      { id: 1, icon: Ticket, label: "Comparing fares from airlines" },
      { id: 2, icon: ShieldCheck, label: "Finding you the best options" },
      { id: 3, icon: Award, label: "Almost there" },
    ],
  },
  {
    id: 3,
    type: "comfort",
    bgImage: SLIDE_IMAGES[3],
    titleStart: "Enjoy Premium ",
    titleHighlight: "Comfort & Speed",
    subtitle: "Instant confirmation with 24/7 dedicated support.",
    steps: [
      { id: 0, icon: Zap, label: "Verified live seats" },
      { id: 1, icon: FileText, label: "Instant e-tickets" },
      { id: 2, icon: Shield, label: "Zero hidden charges" },
      { id: 3, icon: Headphones, label: "24/7 Priority support" },
    ],
  },
];

export default function FlightLoadingScreen({
  sourceCity = "",
  destinationCity = "",
  customMessage = "",
}) {
  const [progress, setProgress] = useState(15);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-progress bar from 15% to 94%
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) return 94;
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return next > 94 ? 94 : next;
      });
    }, 300);

    return () => clearInterval(timer);
  }, []);

  // AUTOMATIC CONTINUOUS SLIDE ROTATION every 2.2 seconds
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 2200);

    return () => clearInterval(slideTimer);
  }, []);

  const currentSlide = SLIDES[activeSlide];

  return (
    <div className="fls-overlay">
      <div className="fls-card fls-slide-card">
        {/* ── LEFT COLUMN: AUTOMATICALLY FADING BACKGROUND SLIDES ── */}
        <div className="fls-poster-side">
          {SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`fls-slide-bg ${idx === activeSlide ? "active" : ""}`}
              style={{ backgroundImage: `url(${slide.bgImage})` }}
            />
          ))}

          <div className="fls-poster-overlay">
            {/* Top Row: Welcome Pill + Carousel Indicator Dots */}
            <div className="fls-top-nav-row">
              <div className="fls-welcome-pill">
                <MapPin size={14} className="fls-pin-icon" />
                <span>Welcome on board</span>
              </div>

              {/* Carousel Indicators / Dots */}
              <div className="fls-carousel-dots">
                {SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`fls-dot ${i === activeSlide ? "active" : ""}`}
                    onClick={() => setActiveSlide(i)}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>


          </div>
        </div>

        {/* ── RIGHT COLUMN: DYNAMIC SLIDE CONTENT ── */}
        <div className="fls-right-content">
          {/* Logo & Top Right Manual Arrow Navigation */}
          <div className="fls-brand-row">
            <div className="fls-brand-logo">
              <img
                src={pickNBookLogo}
                alt="Pick N Book"
                className="fls-brand-logo-img"
              />
            </div>

            {/* Top Right Navigation Arrow Buttons */}
            <div className="fls-arrow-nav">
              <button
                type="button"
                className="fls-arrow-btn"
                onClick={() =>
                  setActiveSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
                }
                aria-label="Previous slide"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="fls-arrow-btn"
                onClick={() =>
                  setActiveSlide((prev) => (prev + 1) % SLIDES.length)
                }
                aria-label="Next slide"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Dynamic Animated Headline per Active Slide */}
          <div className="fls-headline-wrapper">
            {currentSlide.type === "deals" && (
              <h1 className="fls-headline fls-slide-anim">
                Unlock Exclusive Flight{" "}
                <span className="fls-magenta">Deals</span>
              </h1>
            )}

            {currentSlide.type === "welcome" && (
              <h1 className="fls-headline fls-slide-anim">
                Welcome to
                <br />
                Pick <span className="fls-magenta">N</span> Book
              </h1>
            )}

            {currentSlide.type === "details" && (
              <h1 className="fls-headline fls-slide-anim">
                It’s the details that
                <br />
                make a <span className="fls-serif-magenta">journey perfect</span>
              </h1>
            )}

            {currentSlide.type === "comfort" && (
              <h1 className="fls-headline fls-slide-anim">
                Enjoy Premium{" "}
                <span className="fls-magenta">Comfort & Speed</span>
              </h1>
            )}

            <div className="fls-status-heading">
              {customMessage || currentSlide.subtitle}
            </div>
          </div>

          {/* Persistent Progress Bar & Flying Plane */}
          <div className="fls-progress-container">
            <div className="fls-track-bg" />
            <div className="fls-track-fill" style={{ width: `${progress}%` }}>
              <div className="fls-plane-head">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="#dc1e26"
                  className="fls-progress-plane-svg"
                >
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Dynamic 4-Step Columns per Slide */}
          <div className="fls-steps-row">
            {currentSlide.steps.map((step, sIdx) => {
              const IconComp = step.icon;
              return (
                <div
                  key={step.id}
                  className={`fls-step-col active fls-slide-anim-step-${sIdx}`}
                >
                  <div className="fls-step-icon-wrap">
                    <IconComp size={20} />
                  </div>
                  <span className="fls-step-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Dotted World Map Background Decor */}
          <div className="fls-bg-map-decor">
            <svg
              viewBox="0 0 320 120"
              className="fls-map-svg"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M 20 100 Q 140 40 300 30"
                stroke="#dc1e26"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.35"
              />
              <circle cx="20" cy="100" r="3" fill="#dc1e26" opacity="0.6" />
              <circle cx="160" cy="58" r="3" fill="#dc1e26" opacity="0.6" />
              <path d="M 295 24 L 305 30 L 297 36 Z" fill="#dc1e26" opacity="0.7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
