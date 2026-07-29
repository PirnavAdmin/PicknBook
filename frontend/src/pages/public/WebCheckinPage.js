/* eslint-disable */
import React from "react";
import {
  CalendarCheck,
  Clock3,
  ExternalLink,
  Plane,
  Search,
  ShieldCheck,
  TicketCheck,
} from "lucide-react";
import goIndigoLogo from "../../assets/images/airlines/indigo.png";
import airIndiaExpressLogo from "../../assets/images/airlines/Air-India_express.jpg";
import spicejetLogo from "../../assets/images/airlines/Spicejet.png";
import akasaAirLogo from "../../assets/images/airlines/AkasaAir.png";
import philippineAirlinesLogo from "../../assets/images/airlines/Philip.png";
import emiratesLogo from "../../assets/images/airlines/Emirates.png";
import qatarAirwaysLogo from "../../assets/images/airlines/qatarairways.png";

const CHECKIN_PROMOS = [
  { id: "window", icon: Clock3, title: "Check-in Window", text: "Usually opens before departure" },
  { id: "secure", icon: ShieldCheck, title: "Official Links", text: "Go directly to airline portals" },
  { id: "boarding", icon: TicketCheck, title: "Boarding Pass", text: "Download after airline check-in" },
  { id: "flight", icon: Plane, title: "Flight Desk", text: "Airline-wise quick access" },
];

const CHECKIN_STEPS = [
  { id: "airline", icon: Search, label: "Choose airline" },
  { id: "pnr", icon: TicketCheck, label: "Enter PNR" },
  { id: "date", icon: CalendarCheck, label: "Confirm journey" },
];

const WebCheckInPage = () => {
  const airlines = [
    {
      id: 1,
      name: "Go Indigo",
      logo: goIndigoLogo,
      altText: "Go Indigo Airline Logo",
      checkInUrl: "https://www.goindigo.in/web-check-in.html",
      color: "#003DA5",
      accentColor: "#FFB800",
    },
    {
      id: 2,
      name: "Air India Express",
      logo: airIndiaExpressLogo,
      altText: "Air India Express Airline Logo",
      checkInUrl: "https://www.airindiaexpress.com/checkin-home",
      color: "#E31937",
      accentColor: "#1C1C1C",
    },
    {
      id: 3,
      name: "SpiceJet",
      logo: spicejetLogo,
      altText: "SpiceJet Airline Logo",
      checkInUrl: "https://www.spicejet.com/#checkin",
      color: "#FFB81C",
      accentColor: "#000000",
    },
    {
      id: 4,
      name: "Akasa Air",
      logo: akasaAirLogo,
      altText: "Akasa Air Airline Logo",
      checkInUrl: "https://www.akasaair.com/check-in",
      color: "#001F5C",
      accentColor: "#FF6B35",
    },
    {
      id: 5,
      name: "Philippine Airlines",
      logo: philippineAirlinesLogo,
      altText: "Philippine Airlines Logo",
      checkInUrl: "https://www.philippineairlines.com/ph/en/check-in-online.html",
      color: "#003D7A",
      accentColor: "#F1A91B",
    },
    {
      id: 6,
      name: "Emirates",
      logo: emiratesLogo,
      altText: "Emirates Airline Logo",
      checkInUrl: "https://www.emirates.com/in/english/manage-booking/online-check-in/",
      color: "#C41E3A",
      accentColor: "#FFFFFF",
    },
    {
      id: 7,
      name: "Qatar Airways",
      logo: qatarAirwaysLogo,
      altText: "Qatar Airways Logo",
      checkInUrl: "https://cki.qatarairways.com/cki/dashboard",
      color: "#6B1E3F",
      accentColor: "#A29BD0",
    },
  ];

  const handleCardClick = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap");

        .web-checkin-page {
          --web-primary: var(--theme-primary, #dc1e26);
          --web-primary-strong: var(--theme-primary-strong, #b8141b);
          --web-navy: var(--theme-navy, #1f2a44);
          --web-muted: #596985;
          --web-border: #E5E7EB;
          --web-bg-image: url(${travelBg});
          min-height: calc(100vh - 88px);
          padding: 18px 14px 30px;
          font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif;
          color: var(--web-navy);
          background:
            linear-gradient(rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.5)),
            var(--web-bg-image) center / cover no-repeat,
            linear-gradient(180deg, #F3F4F6 0%, #ffffff 100%);
        }

        .web-checkin-shell {
          width: min(1120px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .web-checkin-marquee {
          min-height: 56px;
          border: 1px solid var(--web-border);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          gap: 8px;
          overflow: hidden;
          padding: 8px;
          box-shadow: 0 10px 24px rgba(13, 74, 83, 0.08);
        }

        .web-checkin-marquee article {
          flex: 0 0 230px;
          min-height: 38px;
          border-radius: 12px;
          display: grid;
          grid-template-columns: 30px 1fr;
          grid-template-rows: auto auto;
          align-items: center;
          column-gap: 8px;
          padding: 6px 10px;
          background: #ffffff;
          border: 1px solid #E5E7EB;
          animation: web-checkin-scroll 24s linear infinite;
        }

        .web-checkin-marquee span {
          grid-row: 1 / 3;
          width: 28px;
          height: 28px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, var(--web-primary), var(--web-primary-strong));
        }

        .web-checkin-marquee strong {
          font-size: 0.78rem;
          line-height: 1.1;
        }

        .web-checkin-marquee small {
          color: var(--web-muted);
          font-size: 0.64rem;
          line-height: 1.1;
        }

        .web-checkin-hero {
          border: 1px solid var(--web-border);
          border-radius: 22px;
          background:
            radial-gradient(circle at 92% 10%, rgba(220, 30, 38, 0.16), transparent 24%),
            rgba(255, 255, 255, 0.94);
          box-shadow: 0 20px 48px rgba(13, 74, 83, 0.15);
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          min-height: 270px;
        }

        .web-checkin-hero-copy {
          padding: 28px;
          display: grid;
          align-content: center;
          gap: 12px;
        }

        .web-checkin-kicker {
          width: max-content;
          min-height: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: var(--theme-primary-soft, #fef2f2);
          color: var(--web-primary);
          font-size: 0.72rem;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .web-checkin-hero h1 {
          margin: 0;
          font-family: "Space Grotesk", "Trebuchet MS", sans-serif;
          font-size: clamp(2rem, 4vw, 3.25rem);
          line-height: 1;
          letter-spacing: 0;
        }

        .web-checkin-hero p {
          max-width: 560px;
          margin: 0;
          color: var(--web-muted);
          font-size: 0.94rem;
          line-height: 1.55;
        }

        .web-checkin-steps {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .web-checkin-steps article {
          min-height: 34px;
          border-radius: 999px;
          border: 1px solid #E5E7EB;
          background: #F9FAFB;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          font-size: 0.76rem;
          font-weight: 850;
        }

        .web-checkin-steps svg {
          color: var(--web-primary);
        }

        .web-checkin-pass {
          min-height: 270px;
          padding: 24px;
          display: grid;
          align-content: center;
          background:
            radial-gradient(circle at 18% 24%, rgba(255, 255, 255, 0.84), transparent 28%),
            linear-gradient(135deg, #fffcf8 0%, #fef2f2 30%, #dc1e26 100%);
        }

        .web-checkin-pass-card {
          border-radius: 20px;
          background: #ffffff;
          border: 1px solid rgba(244, 201, 187, 0.9);
          box-shadow: 0 16px 34px rgba(13, 74, 83, 0.16);
          overflow: hidden;
        }

        .web-checkin-pass-head {
          min-height: 54px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--web-navy);
          color: #ffffff;
          font-weight: 850;
        }

        .web-checkin-pass-head span {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: var(--web-primary);
        }

        .web-checkin-pass-body {
          padding: 18px;
          display: grid;
          gap: 14px;
        }

        .web-checkin-route {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 12px;
        }

        .web-checkin-route strong {
          font-size: 1.3rem;
        }

        .web-checkin-route small {
          display: block;
          margin-top: 2px;
          color: var(--web-muted);
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .web-checkin-route i {
          width: 74px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--web-primary), #f6b248);
          position: relative;
        }

        .web-checkin-route i::after {
          content: "";
          position: absolute;
          right: -2px;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--web-primary);
          transform: translateY(-50%);
        }

        .web-checkin-pass-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .web-checkin-pass-grid span {
          min-height: 42px;
          border-radius: 12px;
          background: #fff8f4;
          border: 1px solid #E5E7EB;
          display: grid;
          place-items: center;
          color: #34415d;
          font-size: 0.72rem;
          font-weight: 850;
        }

        .web-checkin-airlines {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .web-checkin-airline-card {
          cursor: pointer;
          min-height: 168px;
          border-radius: 18px;
          border: 1px solid var(--web-border);
          background: rgba(255, 255, 255, 0.94);
          padding: 16px;
          display: grid;
          align-content: space-between;
          gap: 14px;
          box-shadow: 0 12px 26px rgba(13, 74, 83, 0.08);
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          position: relative;
          overflow: hidden;
        }

        .web-checkin-airline-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-top: 4px solid var(--airline-color);
          opacity: 0.95;
        }

        .web-checkin-airline-card:hover {
          transform: translateY(-4px);
          border-color: var(--airline-color);
          box-shadow: 0 18px 34px rgba(13, 74, 83, 0.14);
        }

        .web-checkin-logo-wrap {
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .web-checkin-logo-wrap img {
          max-width: 155px;
          max-height: 54px;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .web-checkin-airline-card h2 {
          margin: 0;
          font-size: 0.96rem;
          text-align: center;
        }

        .web-checkin-button {
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          min-height: 38px;
          background: #F9FAFB;
          color: var(--web-navy);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.74rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }

        .web-checkin-airline-card:hover .web-checkin-button {
          background: var(--web-primary);
          border-color: var(--web-primary);
          color: #ffffff;
        }

        .web-checkin-info-row {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 12px;
        }

        .web-checkin-note,
        .web-checkin-window {
          border: 1px solid var(--web-border);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 12px 26px rgba(13, 74, 83, 0.08);
          padding: 16px;
        }

        .web-checkin-note {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .web-checkin-note span,
        .web-checkin-window span {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, var(--web-primary), var(--web-primary-strong));
          flex: 0 0 auto;
        }

        .web-checkin-note strong,
        .web-checkin-window strong {
          display: block;
          font-size: 0.92rem;
        }

        .web-checkin-note small,
        .web-checkin-window small {
          display: block;
          margin-top: 3px;
          color: var(--web-muted);
          font-size: 0.72rem;
          line-height: 1.35;
        }

        .web-checkin-window {
          display: grid;
          grid-template-columns: 40px 1fr;
          align-items: center;
          gap: 12px;
        }

        @keyframes web-checkin-scroll {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(calc(-100% - 8px));
          }
        }

        @media (max-width: 860px) {
          .web-checkin-hero,
          .web-checkin-info-row {
            grid-template-columns: 1fr;
          }

          .web-checkin-hero-copy,
          .web-checkin-pass {
            padding: 20px;
          }

          .web-checkin-route i {
            width: 48px;
          }
        }
      `}</style>

      <main className="web-checkin-page">
        <div className="web-checkin-shell">
          <section className="web-checkin-marquee" aria-label="Web check-in benefits">
            {[...CHECKIN_PROMOS, ...CHECKIN_PROMOS].map((item, index) => (
              <article key={`${item.id}-${index}`}>
                <span>
                  <item.icon size={16} />
                </span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </article>
            ))}
          </section>

          <section className="web-checkin-hero">
            <div className="web-checkin-hero-copy">
              <span className="web-checkin-kicker">
                <Plane size={15} /> Airline Check-in
              </span>
              <h1>Web Check-In</h1>
              <p>
                Open the official airline check-in page, enter your booking details, choose
                available seats, and download your boarding pass.
              </p>
              <div className="web-checkin-steps">
                {CHECKIN_STEPS.map((step) => (
                  <article key={step.id}>
                    <step.icon size={14} />
                    {step.label}
                  </article>
                ))}
              </div>
            </div>

            <div className="web-checkin-pass" aria-hidden="true">
              <div className="web-checkin-pass-card">
                <div className="web-checkin-pass-head">
                  <strong>BOARDING PASS</strong>
                  <span><Plane size={18} /></span>
                </div>
                <div className="web-checkin-pass-body">
                  <div className="web-checkin-route">
                    <div>
                      <strong>PNR</strong>
                      <small>Booking ref</small>
                    </div>
                    <i />
                    <div>
                      <strong>SEAT</strong>
                      <small>After check-in</small>
                    </div>
                  </div>
                  <div className="web-checkin-pass-grid">
                    <span>Flight</span>
                    <span>Gate</span>
                    <span>Board</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="web-checkin-airlines" aria-label="Airline web check-in links">
            {airlines.map((airline) => (
              <article
                key={airline.id}
                className="web-checkin-airline-card"
                style={{ "--airline-color": airline.color }}
                onClick={() => handleCardClick(airline.checkInUrl)}
              >
                <div className="web-checkin-logo-wrap">
                  <img src={airline.logo} alt={airline.altText} />
                </div>
                <h2>{airline.name}</h2>
                <button type="button" className="web-checkin-button">
                  Check In <ExternalLink size={15} />
                </button>
              </article>
            ))}
          </section>

          <section className="web-checkin-info-row" aria-label="Check-in notes">
            <article className="web-checkin-note">
              <span><ShieldCheck size={18} /></span>
              <div>
                <strong>Official airline portals</strong>
                <small>Every card redirects to the airline website in a new tab.</small>
              </div>
            </article>
            <article className="web-checkin-window">
              <span><Clock3 size={18} /></span>
              <div>
                <strong>Check timing before departure</strong>
                <small>Most airlines open web check-in around 24-48 hours before departure.</small>
              </div>
            </article>
          </section>
        </div>
      </main>
    </>
  );
};

export default WebCheckInPage;
