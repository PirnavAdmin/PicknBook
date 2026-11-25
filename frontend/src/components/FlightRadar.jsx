import React, { useEffect, useState, useMemo } from 'react';
import precomputedMapData from '../data/precomputedWorldMap.json';
import indiaStatesMapData from '../data/indiaStatesMap.json';
import { resolveLocation } from '../utils/flightAirports';
import pickNBookLogo from '../assets/images/brand/pick-n-book-logo.png';
import '../STYLES/FlightRadar.css';

/**
 * Project [lon, lat] coordinates into 1000x500 Equirectangular space (for International World Map)
 */
function projectPoint([lon, lat]) {
  const x = ((lon + 180) % 360) * (1000 / 360);
  const y = (90 - lat) * (500 / 180);
  return [x, y];
}

/**
 * Mercator projection fitted to India:
 * bounds lon 68 to 97.6, lat 6.6 to 37.2 (coordinate space)
 */
const {
  lonMin: IND_LON_MIN,
  latMax: IND_LAT_MAX,
  mapScale: IND_MAP_SCALE,
  offsetX: IND_OFFSET_X,
  offsetY: IND_OFFSET_Y
} = indiaStatesMapData.projection;

const toRad = (deg) => (deg * Math.PI) / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2));
const IND_Y_MAX_MERC = mercY(IND_LAT_MAX);

function projectIndiaPoint([lon, lat]) {
  const x = IND_OFFSET_X + (toRad(lon) - toRad(IND_LON_MIN)) * IND_MAP_SCALE;
  const y = IND_OFFSET_Y + (IND_Y_MAX_MERC - mercY(lat)) * IND_MAP_SCALE;
  return [x, y];
}

/**
 * Reusable Airliner Symbol (top-view passenger aircraft with red detailing)
 */
export function AirlinerSymbol({ scale = 1 }) {
  return (
    <g transform={`scale(${scale})`}>
      {/* Dark Offset Shadow Shape */}
      <g transform="translate(2.5, 3.5)" opacity="0.22">
        <path d="M 4, -4.5 L -8, -21 L -12, -20.5 L -4, -4.5 Z" fill="#0f172a" />
        <path d="M 4, 4.5 L -8, 21 L -12, 20.5 L -4, 4.5 Z" fill="#0f172a" />
        <path d="M -16, -2.5 L -22.5, -9 L -24, -8.5 L -20, -2 Z" fill="#0f172a" />
        <path d="M -16, 2.5 L -22.5, 9 L -24, 8.5 L -20, 2 Z" fill="#0f172a" />
        <path
          d="M 23, 0 C 23, 3.2 20, 4.6 13, 4.6 L -18, 4.2 C -21, 4.0 -23.5, 2.2 -24, 0 C -23.5, -2.2 -21, -4.0 -18, -4.2 L 13, -4.6 C 20, -4.6 23, -3.2 23, 0 Z"
          fill="#0f172a"
        />
      </g>

      {/* Main Swept Wings */}
      <path
        d="M 4, -4.5 L -8, -21 L -12, -20.5 L -4, -4.5 Z"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="0.75"
      />
      <path
        d="M 4, 4.5 L -8, 21 L -12, 20.5 L -4, 4.5 Z"
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth="0.75"
      />

      {/* 2 Jet Engines Under Wings */}
      <rect x="-3" y="-12.5" width="9" height="3.2" rx="1.6" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.6" />
      <rect x="-4.2" y="-11.8" width="1.6" height="1.8" rx="0.5" fill="#334155" />
      <rect x="-3" y="9.3" width="9" height="3.2" rx="1.6" fill="#e2e8f0" stroke="#64748b" strokeWidth="0.6" />
      <rect x="-4.2" y="10" width="1.6" height="1.8" rx="0.5" fill="#334155" />

      {/* Horizontal Stabilizers at Tail */}
      <path
        d="M -16, -2.5 L -22.5, -9 L -24, -8.5 L -20, -2 Z"
        fill="#f1f5f9"
        stroke="#94a3b8"
        strokeWidth="0.65"
      />
      <path
        d="M -16, 2.5 L -22.5, 9 L -24, 8.5 L -20, 2 Z"
        fill="#f1f5f9"
        stroke="#94a3b8"
        strokeWidth="0.65"
      />

      {/* Aerodynamic White Fuselage */}
      <path
        d="M 23, 0 C 23, 3.2 20, 4.6 13, 4.6 L -18, 4.2 C -21, 4.0 -23.5, 2.2 -24, 0 C -23.5, -2.2 -21, -4.0 -18, -4.2 L 13, -4.6 C 20, -4.6 23, -3.2 23, 0 Z"
        fill="#ffffff"
        stroke="#64748b"
        strokeWidth="0.8"
      />

      {/* Red Cheat-Lines */}
      <path d="M 17, -4.5 L -18, -4.1 L -18, -3.4 L 17, -3.8 Z" fill="#e5322d" />
      <path d="M 17, 4.5 L -18, 4.1 L -18, 3.4 L 17, 3.8 Z" fill="#e5322d" />

      {/* Dark Cockpit Windows */}
      <path
        d="M 19, -2.4 C 20.3, -1.2 20.3, 1.2 19, 2.4 L 17.2, 2.7 C 17.9, 1.2 17.9, -1.2 17.2, -2.7 Z"
        fill="#0f172a"
      />

      {/* Red Tail Fin (Vertical Stabilizer) */}
      <path d="M -15.5, 0 L -23.8, -1.2 L -23.8, 1.2 Z" fill="#e5322d" />
    </g>
  );
}

/**
 * Reusable Airport Map Marker (Pin + Pulse + White rounded label with thin red border)
 */
export function AirportMapMarker({
  x,
  y,
  code,
  city,
  isDest = false,
  otherX,
  otherY,
  isDomestic = false
}) {
  const pinFill = isDest ? '#E53935' : '#1B2A5C';

  // Badge positioning: place cleanly away from route and map bounds
  const { offsetX, offsetY } = useMemo(() => {
    const topLimit = isDomestic ? 165 : 60;
    let oy = -36;
    let ox = 0;

    if (y < topLimit) {
      oy = 18; // Place below pin if near top boundary
    } else if (otherY !== undefined && otherY < y - 40 && Math.abs(otherX - x) < 35) {
      // Route heads almost vertically upwards, place label below pin
      oy = 18;
    } else {
      oy = -36; // Default sits above pin
    }

    // Keep label within horizontal map boundaries
    const minX = isDomestic ? 120 : 60;
    const maxX = isDomestic ? 530 : 940;
    if (x < minX) {
      ox = 20;
    } else if (x > maxX) {
      ox = -20;
    }

    return { offsetX: ox, offsetY: oy };
  }, [x, y, otherX, otherY, isDomestic]);

  const pillWidth = useMemo(() => {
    const codeLen = (code || '').length;
    const cityLen = (city || '').length;
    const baseW = isDomestic ? 78 : 84;
    return Math.max(baseW, Math.min(150, codeLen * 9 + cityLen * 6.5 + 22));
  }, [code, city, isDomestic]);

  const pillHeight = isDomestic ? 22 : 24;

  return (
    <g transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)})`} className="fr-airport-marker-group">
      {/* 1. Concentric Pulse Ring */}
      <circle cx="0" cy="0" r="4" fill="none" stroke={pinFill} strokeWidth="1.4">
        <animate
          attributeName="r"
          from="4"
          to={isDest ? 24 : 20}
          begin={isDest ? '0.6s' : '0s'}
          dur="1.8s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.85; 0.3; 0"
          begin={isDest ? '0.6s' : '0s'}
          dur="1.8s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke-width"
          values="1.6; 1.0; 0.4"
          begin={isDest ? '0.6s' : '0s'}
          dur="1.8s"
          repeatCount="indefinite"
        />
      </circle>

      {/* 2. Map Pin with white center */}
      <path
        d="M 0 0 C -3.5 -6, -8 -13, -8 -19 C -8 -24, -4.5 -27.5, 0 -27.5 C 4.5 -27.5, 8 -24, 8 -19 C 8 -13, 3.5 -6, 0 0 Z"
        fill={pinFill}
        stroke="#ffffff"
        strokeWidth="1.3"
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.22))"
      />
      <circle cx="0" cy="-19" r="3.2" fill="#ffffff" />

      {/* 3. White rounded label pill with thin red border and soft pink drop-shadow */}
      <g transform={`translate(${offsetX}, ${offsetY})`} className="fr-marker-pill">
        <rect
          x={-pillWidth / 2}
          y={-pillHeight / 2}
          width={pillWidth}
          height={pillHeight}
          rx={pillHeight / 2}
          fill="#ffffff"
          stroke="#E53935"
          strokeWidth="1.2"
          filter="url(#fr-pill-drop-shadow)"
        />
        <text
          x="0"
          y="0"
          dominantBaseline="central"
          textAnchor="middle"
          className="fr-marker-pill-text"
        >
          <tspan className="fr-pill-code" fill="#E53935" fontWeight="800" fontSize={isDomestic ? "11.5px" : "12.5px"}>
            {code}
          </tspan>
          <tspan dx="4" className="fr-pill-city" fill="#0F172A" fontWeight="600" fontSize={isDomestic ? "9.5px" : "10px"}>
            {city}
          </tspan>
        </text>
      </g>
    </g>
  );
}

/**
 * Domestic India Map Loader
 */
export function DomesticFlightLoader({
  srcLoc,
  destLoc,
  sourceCity,
  destinationCity
}) {
  const [domX0, domY0] = useMemo(() => projectIndiaPoint(srcLoc.coords || [78.4294, 17.2403]), [srcLoc]);
  const [domX2, domY2] = useMemo(() => projectIndiaPoint(destLoc.coords || [75.8122, 26.8242]), [destLoc]);

  // Curved red dashed flight route: quadratic Bezier lifted towards North
  const domesticArcD = useMemo(() => {
    const dx = domX2 - domX0;
    const dy = domY2 - domY0;
    const dist = Math.hypot(dx, dy);
    if (!dist) return `M ${domX0} ${domY0} L ${domX2} ${domY2}`;

    const mx = (domX0 + domX2) / 2;
    const my = (domY0 + domY2) / 2;
    const lift = Math.min(55, Math.max(15, 0.35 * dist));
    const nx = -dy / dist;
    const ny = dx / dist;

    let cx = mx + nx * lift;
    let cy = my + ny * lift;
    if (cy > my) {
      cx = mx - nx * lift;
      cy = my - ny * lift;
    }
    if (cy < 145) cy = 145;

    return `M ${domX0.toFixed(2)} ${domY0.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${domX2.toFixed(2)} ${domY2.toFixed(2)}`;
  }, [domX0, domY0, domX2, domY2]);

  return (
    <svg
      className="flight-radar-svg flight-radar-svg--domestic"
      viewBox="85 130 500 540"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="fr-pill-drop-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#e5322d" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Ocean background */}
      <rect x="0" y="0" width="680" height="800" fill="#FDF1F1" opacity="0.9" />

      {/* Elegant flowing wave curves along ocean sides & bottom */}
      <g className="fr-decor-waves">
        <path d="M 40 210 Q 180 180 340 230 T 640 190" fill="none" stroke="#fecdd3" strokeWidth="1.2" opacity="0.4" />
        <path d="M 40 330 Q 160 370 320 310 T 640 350" fill="none" stroke="#fecdd3" strokeWidth="1.2" opacity="0.35" />
        <path d="M 40 450 Q 190 410 360 470 T 640 430" fill="none" stroke="#fecdd3" strokeWidth="1.2" opacity="0.4" />
        <path d="M 40 570 Q 170 620 340 550 T 640 600" fill="none" stroke="#fecdd3" strokeWidth="1.2" opacity="0.35" />
        <path d="M 40 680 Q 200 640 380 710 T 640 660" fill="none" stroke="#fecdd3" strokeWidth="1.2" opacity="0.4" />
      </g>

      {/* Indian States Layer: pastel colors with thin boundaries */}
      <g id="domestic-states-layer">
        {indiaStatesMapData.states.map((s) => (
          <path
            key={s.id}
            d={s.d}
            fill={s.color}
            stroke={indiaStatesMapData.borderColor || '#D9A78F'}
            strokeWidth={indiaStatesMapData.borderWidth || 0.85}
            className="fr-domestic-state"
          />
        ))}
      </g>

      {/* Curved red dashed route with animated marching dashes */}
      <path
        id="domestic-route-arc"
        d={domesticArcD}
        className="fr-domestic-arc"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-24"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Realistic passenger airplane smoothly oriented along the route */}
      <g className="fr-domestic-plane-mover">
        <AirlinerSymbol scale={0.7} />
        <animateMotion
          dur="3.4s"
          repeatCount="indefinite"
          rotate="auto"
          calcMode="linear"
        >
          <mpath href="#domestic-route-arc" />
        </animateMotion>
      </g>

      {/* Origin Marker (Navy Pin + White Pill Label) */}
      <AirportMapMarker
        x={domX0}
        y={domY0}
        code={srcLoc.code}
        city={srcLoc.city || sourceCity}
        isDest={false}
        otherX={domX2}
        otherY={domY2}
        isDomestic={true}
      />

      {/* Destination Marker (Red Pin + White Pill Label) */}
      <AirportMapMarker
        x={domX2}
        y={domY2}
        code={destLoc.code}
        city={destLoc.city || destinationCity}
        isDest={true}
        otherX={domX0}
        otherY={domY0}
        isDomestic={true}
      />
    </svg>
  );
}

/**
 * International World Map Loader
 */
export function InternationalFlightLoader({
  srcLoc,
  destLoc,
  sourceCity,
  destinationCity
}) {
  const [intlX0, intlY0] = useMemo(() => projectPoint(srcLoc.coords || [78.4294, 17.2403]), [srcLoc]);
  const [intlX2, intlY2] = useMemo(() => projectPoint(destLoc.coords || [-0.4543, 51.4700]), [destLoc]);

  // Curved red dashed flight route: great-circle quadratic Bezier lifted towards North
  const intlArcD = useMemo(() => {
    const dx = intlX2 - intlX0;
    const dy = intlY2 - intlY0;
    const dist = Math.hypot(dx, dy);
    if (!dist) return `M ${intlX0} ${intlY0} L ${intlX2} ${intlY2}`;

    const mx = (intlX0 + intlX2) / 2;
    const my = (intlY0 + intlY2) / 2;
    const lift = Math.min(65, Math.max(16, 0.22 * dist));
    const nx = -dy / dist;
    const ny = dx / dist;

    let cx = mx + nx * lift;
    let cy = my + ny * lift;
    if (cy > my) {
      cx = mx - nx * lift;
      cy = my - ny * lift;
    }
    if (cy < 35) cy = 35;

    return `M ${intlX0.toFixed(2)} ${intlY0.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${intlX2.toFixed(2)} ${intlY2.toFixed(2)}`;
  }, [intlX0, intlY0, intlX2, intlY2]);

  return (
    <svg
      className="flight-radar-svg flight-radar-svg--international"
      viewBox="0 20 1000 440"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="fr-pill-drop-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#e5322d" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Ocean Background */}
      <rect x="0" y="0" width="1000" height="500" fill={precomputedMapData.seaColor || '#fff1f0'} opacity="0.9" />

      {/* Elegant flowing wave curves across ocean background */}
      <g className="fr-decor-waves">
        <path d="M 0 100 Q 250 60 500 110 T 1000 80" fill="none" stroke="#fecdd3" strokeWidth="1.4" opacity="0.35" />
        <path d="M 0 200 Q 220 250 500 190 T 1000 230" fill="none" stroke="#fecdd3" strokeWidth="1.4" opacity="0.3" />
        <path d="M 0 310 Q 270 270 520 330 T 1000 290" fill="none" stroke="#fecdd3" strokeWidth="1.4" opacity="0.35" />
        <path d="M 0 420 Q 260 460 510 400 T 1000 440" fill="none" stroke="#fecdd3" strokeWidth="1.4" opacity="0.4" />
      </g>

      {/* World Countries Layer: pastel colors with thin boundaries */}
      <g id="intl-countries-layer">
        {precomputedMapData.countries.map((c) => (
          <path
            key={c.id}
            d={c.d}
            fill={c.color}
            stroke={precomputedMapData.borderColor || '#d9a9a6'}
            strokeWidth={0.75}
            className="fr-country"
          />
        ))}
      </g>

      {/* Curved red dashed route with animated marching dashes */}
      <path
        id="intl-route-arc"
        d={intlArcD}
        className="fr-route-path"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-22"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Realistic passenger airplane smoothly oriented along the route */}
      <g className="fr-intl-plane-mover">
        <AirlinerSymbol scale={0.75} />
        <animateMotion
          dur="4.2s"
          repeatCount="indefinite"
          rotate="auto"
          calcMode="linear"
        >
          <mpath href="#intl-route-arc" />
        </animateMotion>
      </g>

      {/* Origin Marker (Navy Pin + White Pill Label) */}
      <AirportMapMarker
        x={intlX0}
        y={intlY0}
        code={srcLoc.code}
        city={srcLoc.city || sourceCity}
        isDest={false}
        otherX={intlX2}
        otherY={intlY2}
        isDomestic={false}
      />

      {/* Destination Marker (Red Pin + White Pill Label) */}
      <AirportMapMarker
        x={intlX2}
        y={intlY2}
        code={destLoc.code}
        city={destLoc.city || destinationCity}
        isDest={true}
        otherX={intlX0}
        otherY={intlY0}
        isDomestic={false}
      />
    </svg>
  );
}

/**
 * Bottom Route Information Pill
 * Displays: ✈ [SRC] [Src City]  →  ✈ [DEST] [Dest City]
 */
export function FlightRouteInfo({
  srcLoc,
  destLoc,
  sourceCity,
  destinationCity
}) {
  return (
    <div className="fr-route-chip">
      <span className="fr-route-plane-icon" aria-hidden="true">✈</span>
      <span className="fr-route-segment">
        <strong className="fr-route-code">{srcLoc.code}</strong>
        <span className="fr-route-city">{srcLoc.city || sourceCity}</span>
      </span>
      <span className="fr-route-arrow" aria-hidden="true">→</span>
      <span className="fr-route-plane-icon" aria-hidden="true">✈</span>
      <span className="fr-route-segment">
        <strong className="fr-route-code">{destLoc.code}</strong>
        <span className="fr-route-city">{destLoc.city || destinationCity}</span>
      </span>
    </div>
  );
}

/**
 * Main FlightRadar Component (Also exported as FlightSearchLoader)
 */
export default function FlightRadar({
  source = 'HYD',
  dest = 'BOM',
  sourceCity = '',
  destinationCity = ''
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setIsLoaded(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // Dynamically resolve locations
  const srcLoc = useMemo(() => resolveLocation(source || sourceCity, 'HYD'), [source, sourceCity]);
  const destLoc = useMemo(() => resolveLocation(dest || destinationCity, 'BOM'), [dest, destinationCity]);

  // Automatic Domestic vs. International Selection:
  // Domestic = Both airports are within India ('IN')
  // International = Either source or destination is outside India
  const isIndiaDomestic = useMemo(() => {
    return Boolean(
      srcLoc &&
      destLoc &&
      srcLoc.country === 'IN' &&
      destLoc.country === 'IN'
    );
  }, [srcLoc, destLoc]);

  return (
    <div
      className={`flight-radar-screen flight-radar-fullscreen ${isLoaded ? 'is-loaded' : ''} ${isIndiaDomestic ? 'is-domestic' : 'is-international'}`}
      role="region"
      aria-label="Flight search loading screen"
    >
      {/* ── TOP CENTRE: Pick&Book Official Logo ── */}
      <div className="fr-top-logo-container">
        <img
          src={pickNBookLogo}
          alt="Pick&Book"
          className="fr-top-logo"
        />
      </div>

      {/* ── CENTRAL MAP: Domestic India Map vs International World Map ── */}
      {isIndiaDomestic ? (
        <DomesticFlightLoader
          srcLoc={srcLoc}
          destLoc={destLoc}
          sourceCity={sourceCity}
          destinationCity={destinationCity}
        />
      ) : (
        <InternationalFlightLoader
          srcLoc={srcLoc}
          destLoc={destLoc}
          sourceCity={sourceCity}
          destinationCity={destinationCity}
        />
      )}

      {/* ── BOTTOM CENTRE: Large Rounded Route Information Pill ── */}
      <FlightRouteInfo
        srcLoc={srcLoc}
        destLoc={destLoc}
        sourceCity={sourceCity}
        destinationCity={destinationCity}
      />
    </div>
  );
}

export { FlightRadar, FlightRadar as FlightSearchLoader };
