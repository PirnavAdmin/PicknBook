import React, { useMemo } from "react";
import {
  PALETTES,
  getTierSeatColors,
  getTierBaseColor,
  NON_PRICE_COLORS,
} from "./palettes";
import SymbolLayer from "./SymbolLayer";
export { SymbolLayer };
export { SymbolBadge } from "./SymbolBadge";
export * from "./seatMeta";

/**
 * Emergency Exit Box with Running Person Icon
 * Sits directly on the upper and lower cabin architectural boundary lines
 */
export const EmergencyExit = ({ x, y, direction = "up" }) => {
  const boxW = 22;
  const boxH = 22;

  return (
    <g transform={`translate(${x}, ${y})`} className="aircraft-emergency-exit-marker">
      {/* Crisp White background with Pick&book red rounded border */}
      <rect
        x={0}
        y={0}
        width={boxW}
        height={boxH}
        rx={4}
        fill="#FFFFFF"
        stroke="#E31E24"
        strokeWidth="1.8"
      />
      {/* Running Person Icon in Pick&book red */}
      <circle cx="11" cy="6" r="2" fill="#E31E24" />
      <path
        d="M 10.5 8.2 L 11.8 10.2 L 15 9.4 M 10.2 10.2 L 8.2 12.2 M 11.5 10.8 L 10.5 14.2 L 8.2 16.5 M 10.5 14.2 L 13.8 16.8"
        stroke="#E31E24"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
};

export const EmergencyExitBadge = EmergencyExit;
export const DoorBox = EmergencyExit;

/**
 * Food / Meal Amenity Badge (Soft pink rounded card with red fork & knife)
 */
export const FoodMealBadge = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="aircraft-amenity-badge food-badge">
      <rect
        x={0}
        y={0}
        width={28}
        height={28}
        rx={6}
        fill="#FFF1F2"
        stroke="#FECDD3"
        strokeWidth="1.2"
      />
      {/* Fork */}
      <path
        d="M 10 8 L 10 12.5 M 8 8 L 8 11.5 C 8 12.8 9 13.8 10 13.8 M 12 8 L 12 11.5 C 12 12.8 11 13.8 10 13.8 M 10 13.8 L 10 20"
        stroke="#E31E24"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Knife */}
      <path
        d="M 17.5 8 C 15.5 9.5 15.5 13 16.5 14.5 L 16.5 20 M 17.5 8 L 17.5 20"
        stroke="#E31E24"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
};

export const GalleyIcon = FoodMealBadge;
export const LineIcon = FoodMealBadge;

/**
 * Washroom Amenity Badge (Soft blue rounded card with blue man & woman)
 */
export const WashroomBadge = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="aircraft-amenity-badge washroom-badge">
      <rect
        x={0}
        y={0}
        width={28}
        height={28}
        rx={6}
        fill="#EFF6FF"
        stroke="#BFDBFE"
        strokeWidth="1.2"
      />
      {/* Man */}
      <circle cx="9.5" cy="8.5" r="1.8" fill="#2563EB" />
      <path
        d="M 8 11.5 L 11 11.5 L 11 15.5 L 10.2 15.5 L 10.2 20 L 8.8 20 L 8.8 15.5 L 8 15.5 Z"
        fill="#2563EB"
      />
      {/* Woman */}
      <circle cx="18" cy="8.5" r="1.8" fill="#2563EB" />
      <path
        d="M 16.5 11.5 L 19.5 11.5 L 20.8 16.2 L 19 16.2 L 19 20 L 17 20 L 17 16.2 L 15.2 16.2 Z"
        fill="#2563EB"
      />
    </g>
  );
};

/**
 * ChairSeat Component
 * Exact 3D rounded appearance matching Image 2:
 * - Available: soft lilac/lavender (#EDE9FE, border #C4B5FD, headrest cushion #DDD6FE)
 * - Selected: Pick&book red (#E31E24, border #B91C1C, headrest cushion #DC2626)
 * - Booked: Neutral grey (#CBD5E1, border #94A3B8, headrest cushion #94A3B8)
 * - Price text rendered directly below available and selected seats.
 */
export const ChairSeat = ({
  x,
  y,
  seat,
  status = "free",
  isSelected = false,
  isVertical = false,
  onSeatClick = () => { },
  onMouseEnter = () => { },
  onMouseLeave = () => { },
}) => {
  const isBooked = status === "booked";

  let fill = "#EDE9FE";
  let stroke = "#C4B5FD";
  let backFill = "#DDD6FE";
  let textColor = "#334155";

  if (isBooked) {
    fill = "#CBD5E1";
    stroke = "#94A3B8";
    backFill = "#94A3B8";
  } else if (isSelected) {
    fill = "#E31E24";
    stroke = "#B91C1C";
    backFill = "#DC2626";
    textColor = "#E31E24";
  }

  const seatX = x;
  const seatY = y;
  const S = 20;

  const priceVal = seat.price;
  const priceLabel =
    priceVal > 0
      ? `₹${priceVal}`
      : status === "free"
        ? "FREE"
        : priceVal !== undefined
          ? `₹${priceVal}`
          : "";

  return (
    <g
      className={`aircraft-chair-seat ${status} ${isSelected ? "selected" : ""}`}
      style={{
        cursor: isBooked ? "not-allowed" : "pointer",
        transition: "opacity 0.15s ease",
      }}
      onClick={(e) => {
        if (!isBooked) {
          e.stopPropagation();
          onSeatClick(seat);
        }
      }}
      onMouseEnter={(e) => onMouseEnter(e, seat)}
      onMouseLeave={onMouseLeave}
    >
      {/* Hit target */}
      <rect
        x={seatX - 3}
        y={seatY - 3}
        width={26}
        height={34}
        fill="transparent"
      />

      {/* Main Seat Cushion */}
      <rect
        x={seatX}
        y={seatY}
        width={S}
        height={S}
        rx={4.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={isSelected ? 1.8 : 1.3}
        style={
          isSelected
            ? { filter: "drop-shadow(0 2px 4px rgba(227, 30, 36, 0.45))" }
            : undefined
        }
      />

      {/* Chair Back / Headrest Cushion on nose side (left) */}
      <rect
        x={seatX + 2}
        y={seatY + 2.5}
        width={3.5}
        height={S - 5}
        rx={1.75}
        fill={backFill}
      />

      {/* Price below seat (only for available and selected seats) */}
      {!isBooked && priceLabel && (
        <text
          x={seatX + S / 2}
          y={seatY + S + 8.5}
          textAnchor="middle"
          fontSize="7.5"
          fontWeight={isSelected ? "700" : "600"}
          fill={textColor}
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          {priceLabel}
        </text>
      )}
    </g>
  );
};

/**
 * AircraftSeatMap Component
 * Exact Pick&book horizontal aircraft seat selection UI recreation matching Image 2:
 * - Complete, horizontally positioned airplane body: rounded nose on left, tail on right.
 * - Upper and lower swept wings with red winglet accents and flap track fairings.
 * - Visible turbofan engines mounted on pylons beneath the wings.
 * - Panoramic dark cockpit windshield with blue reflection on the nose.
 * - Cabin architectural floorplan framed with high-tech Pick&book red outline.
 * - All seats, row letters (A-F), seat numbers, prices, emergency exits, and galley amenities
 *   are contained strictly inside the main aircraft fuselage.
 * - Responsive viewBox auto-scaling so it fills container width prominently on desktop.
 */
export const AircraftSeatMap = ({
  layout,
  selectedSeats = [],
  activeFilters = new Set(),
  palette = "spectrum",
  seatFill = "tinted",
  orientation = "auto",
  containerWidth = 800,
  onSeatClick = () => { },
  onSeatHover = () => { },
  onSeatLeave = () => { },
}) => {
  const { cabins = [], rows = [], exitRows = [] } = layout || {};

  const isVertical =
    orientation === "vertical" ||
    (orientation === "auto" && containerWidth > 0 && containerWidth < 560);

  const selectedSeatIds = useMemo(() => {
    return new Set(selectedSeats.map((s) => s.id || s.label || `${s.row}${s.col}`));
  }, [selectedSeats]);

  // Geometry Constants
  const S = 20; // seat width and height
  const G = 12; // vertical gap between seats in group (room for price text)
  const A = 24; // central aisle gap between ABC and DEF
  const colPitch = 25; // horizontal row pitch (seat width 20px + 5px gap)

  // 1. Cabin Heights & Column Y Offsets
  const { cabinColYOffsets, maxL } = useMemo(() => {
    const offsets = new Map();
    let maxCabinL = 0;

    cabins.forEach((c) => {
      const groups =
        c.groups ||
        (c.columns ? [c.columns.filter((l) => l !== "_").join("")] : ["ABC", "DEF"]);
      let currY = 0;
      const colMap = new Map();

      groups.forEach((groupStr, gIdx) => {
        if (gIdx > 0) {
          currY += A;
        }
        for (let i = 0; i < groupStr.length; i++) {
          const letter = groupStr[i];
          colMap.set(letter, currY);
          currY += S;
          if (i < groupStr.length - 1) {
            currY += G;
          }
        }
      });

      offsets.set(c.name, colMap);
      if (currY > maxCabinL) maxCabinL = currY;
    });

    const standardL = 6 * S + 4 * G + A;
    return {
      cabinColYOffsets: offsets,
      maxL: maxCabinL > 0 ? maxCabinL : standardL,
    };
  }, [cabins, S, G, A]);

  // Fuselage Vertical Coordinates (Fuselage & Cabin Centered at md = 254)
  const md = 254; // fuselage centerline
  const y0 = md - maxL / 2; // seat row A top coordinate (~158)
  const cabinTopY = y0 - 24; // top edge of red cabin border (~134)
  const cabinBotY = y0 + maxL + 24; // bottom edge of red cabin border (~374)
  const tp = cabinTopY - 18; // fuselage exterior top edge (~116)
  const bt = cabinBotY + 18; // fuselage exterior bottom edge (~392)
  const wingSpan = 100; // swept wing vertical projection
  const totalSvgHeight = 508; // total height accommodates wings and stabilizers

  // Horizontal Geometry (Dynamically adapts to rows length)
  const frontTip = 35; // nose cone tip
  const firstRowX = 236; // first seat column X (room for nose, cockpit, amenities & row letters)

  const { rowPositions, lastRowEnd, cabinLeftX, cabinRightX, endX, tail, totalSvgWidth } =
    useMemo(() => {
      let currX = firstRowX;
      const rPositions = [];

      rows.forEach((r) => {
        rPositions.push({
          ...r,
          x: currX,
        });
        currX += colPitch;
      });

      const lRowEnd =
        rPositions.length > 0
          ? rPositions[rPositions.length - 1].x + S
          : firstRowX + 30 * colPitch + S;

      const cLeftX = firstRowX - 86; // left curved edge of red cabin border
      const cRightX = lRowEnd + 58; // right curved edge of red cabin border
      const calculatedEndX = lRowEnd + 85; // end of straight fuselage section
      const calculatedTail = calculatedEndX + 105; // tail cone tip
      const calculatedTotalSvgWidth = calculatedTail + 55; // accommodates red tail fin & stabilizers

      return {
        rowPositions: rPositions,
        lastRowEnd: lRowEnd,
        cabinLeftX: cLeftX,
        cabinRightX: cRightX,
        endX: calculatedEndX,
        tail: calculatedTail,
        totalSvgWidth: calculatedTotalSvgWidth,
      };
    }, [rows, firstRowX, S, colPitch]);

  // Wing Root Coordinates (~32% to ~74% of cabin length)
  const cabinSpan = lastRowEnd - firstRowX;
  const wxRootLeading = firstRowX + cabinSpan * 0.32;
  const wxRootTrailing = firstRowX + cabinSpan * 0.74;
  const wingSweepDx = 220;
  const tipLeadingX = wxRootLeading + wingSweepDx;
  const tipTrailingX = tipLeadingX + 16;

  // Row X Map
  const rowXMap = useMemo(() => {
    const map = new Map();
    rowPositions.forEach((r) => map.set(r.number, r.x));
    return map;
  }, [rowPositions]);

  // Exactly 3 Exit Row Positions (Front, Middle/Overwing, Rear)
  const exitRowNumbers = useMemo(() => {
    if (rowPositions.length === 0) return [5, 15, 31];

    const sortedNums = rowPositions.map((r) => r.number);
    const minNum = sortedNums[0];
    const maxNum = sortedNums[sortedNums.length - 1];

    // 1. Front Exit (e.g. Row 5)
    let front = exitRows.find((n) => n <= minNum + 6 && rowXMap.has(n));
    if (!front) front = rowXMap.has(5) ? 5 : sortedNums[Math.min(4, sortedNums.length - 1)];

    // 2. Middle Exit (e.g. Row 15)
    let mid = exitRows.find((n) => n >= minNum + 10 && n <= maxNum - 8 && rowXMap.has(n));
    if (!mid) {
      const midIdx = Math.floor(sortedNums.length / 2);
      mid = rowXMap.has(15) ? 15 : sortedNums[midIdx];
    }

    // 3. Rear Exit (e.g. Row 31 / last row)
    let rear = exitRows.slice().reverse().find((n) => n >= maxNum - 4 && rowXMap.has(n));
    if (!rear) rear = maxNum;

    const list = [front, mid, rear].filter((n) => n !== undefined);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [rowPositions, exitRows, rowXMap]);

  // SVG ViewBox and Dimensions
  const { renderedWidth, renderedHeight, viewBoxString } = useMemo(() => {
    if (isVertical) {
      return {
        renderedWidth: totalSvgHeight,
        renderedHeight: totalSvgWidth,
        viewBoxString: `0 0 ${totalSvgHeight} ${totalSvgWidth}`,
      };
    }
    return {
      renderedWidth: totalSvgWidth,
      renderedHeight: totalSvgHeight,
      viewBoxString: `0 0 ${totalSvgWidth} ${totalSvgHeight}`,
    };
  }, [isVertical, totalSvgWidth, totalSvgHeight]);

  // 1. TOP WING PATH
  const topWingPath = useMemo(() => {
    const tipY = tp - wingSpan + 6;
    return `
      M ${wxRootLeading - 14},${tp}
      C ${wxRootLeading - 4},${tp - 6} ${wxRootLeading + 14},${tp - 18} ${wxRootLeading + 36},${tp - 30}
      L ${tipLeadingX},${tipY}
      L ${tipLeadingX + 16},${tipY - 14}
      L ${tipLeadingX + 22},${tipY - 12}
      L ${tipTrailingX},${tipY + 12}
      L ${wxRootTrailing + 10},${tp - 8}
      C ${wxRootTrailing},${tp - 3} ${wxRootTrailing - 6},${tp} ${wxRootTrailing - 14},${tp}
      Z
    `.trim();
  }, [wxRootLeading, wxRootTrailing, tp, wingSpan, tipLeadingX, tipTrailingX]);

  // 2. BOTTOM WING PATH
  const bottomWingPath = useMemo(() => {
    const tipY = bt + wingSpan - 6;
    return `
      M ${wxRootLeading - 14},${bt}
      C ${wxRootLeading - 4},${bt + 6} ${wxRootLeading + 14},${bt + 18} ${wxRootLeading + 36},${bt + 30}
      L ${tipLeadingX},${tipY}
      L ${tipLeadingX + 16},${tipY + 14}
      L ${tipLeadingX + 22},${tipY + 12}
      L ${tipTrailingX},${tipY - 12}
      L ${wxRootTrailing + 10},${bt + 8}
      C ${wxRootTrailing},${bt + 3} ${wxRootTrailing - 6},${bt} ${wxRootTrailing - 14},${bt}
      Z
    `.trim();
  }, [wxRootLeading, wxRootTrailing, bt, wingSpan, tipLeadingX, tipTrailingX]);

  // 3. FUSELAGE PATH (Aerodynamic realistic aircraft body)
  const fuselagePathD = useMemo(() => {
    const nx = 145; // transition from nose curve to straight fuselage
    return `
      M ${frontTip},${md}
      C ${frontTip + 22},${md - 72} ${frontTip + 70},${tp} ${nx},${tp}
      L ${endX},${tp}
      C ${endX + 45},${tp} ${tail - 20},${md - 14} ${tail},${md - 8}
      L ${tail + 14},${md - 4}
      C ${tail + 18},${md - 2} ${tail + 18},${md + 2} ${tail + 14},${md + 4}
      L ${tail},${md + 8}
      C ${tail - 20},${md + 14} ${endX + 45},${bt} ${endX},${bt}
      L ${nx},${bt}
      C ${frontTip + 70},${bt} ${frontTip + 22},${md + 72} ${frontTip},${md}
      Z
    `.trim();
  }, [frontTip, md, tp, bt, endX, tail]);

  // 4. CABIN RED ARCHITECTURAL FLOORPLAN BORDER
  const cabinRedBorderD = useMemo(() => {
    const leftX = cabinLeftX;
    const rightX = cabinRightX;
    const topY = cabinTopY;
    const botY = cabinBotY;

    return `
      M ${leftX + 20},${topY}
      L ${rightX - 20},${topY}
      C ${rightX + 12},${topY} ${rightX + 12},${botY} ${rightX - 20},${botY}
      L ${leftX + 20},${botY}
      C ${leftX - 12},${botY} ${leftX - 12},${topY} ${leftX + 20},${topY}
      Z
    `.trim();
  }, [cabinLeftX, cabinRightX, cabinTopY, cabinBotY]);

  return (
    <svg
      className="aircraft-seatmap-svg"
      viewBox={viewBoxString}
      width={renderedWidth}
      height={renderedHeight}
      style={{
        display: "block",
        margin: "0 auto",
        maxWidth: "100%",
        height: "auto",
        userSelect: "none",
      }}
    >
      <defs>
        {/* Soft realistic aircraft elevation shadow */}
        <filter id="aircraftDropShadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#0F172A" floodOpacity="0.08" />
        </filter>

        {/* Fuselage 3D cylindrical metallic lighting gradient */}
        <linearGradient id="fuselage3DGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="4%" stopColor="#E2E8F0" />
          <stop offset="12%" stopColor="#F8FAFC" />
          <stop offset="35%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#FFFFFF" />
          <stop offset="88%" stopColor="#F1F5F9" />
          <stop offset="96%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Nose Dome 3D Highlight */}
        <radialGradient id="noseDomeHighlight" cx="35%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#F8FAFC" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.1" />
        </radialGradient>

        {/* Upper Wing Gradient: Crisp white to subtle metallic silver */}
        <linearGradient id="upperWingGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#F8FAFC" />
          <stop offset="80%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Lower Wing Gradient: Crisp white to subtle metallic silver */}
        <linearGradient id="lowerWingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#F8FAFC" />
          <stop offset="80%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Engine Cowl 3D Cylindrical Gradient */}
        <linearGradient id="engineCowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="14%" stopColor="#E2E8F0" />
          <stop offset="40%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F8FAFC" />
          <stop offset="88%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Cockpit Windshield Gradient: Deep dark navy/charcoal glass */}
        <linearGradient id="cockpitGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="50%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Cockpit Sky Reflection Glare */}
        <linearGradient id="cockpitGlassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#BAE6FD" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Vertical Tail Fin Vibrant Pick&book Red Gradient */}
        <linearGradient id="tailFinRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="35%" stopColor="#E31E24" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>

      {/* ── 1. WINGS, ENGINES & TAIL STABILIZERS LAYER (Flanking the fuselage) ── */}
      <g className="aircraft-wings-layer" filter="url(#aircraftDropShadow)">
        {/* ── TOP WING ── */}
        <path
          d={topWingPath}
          fill="url(#upperWingGrad)"
          stroke="#CBD5E1"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Top Wing Leading Edge Slat Line */}
        <line
          x1={wxRootLeading + 25}
          y1={tp - 20}
          x2={tipLeadingX - 6}
          y2={tp - wingSpan + 10}
          stroke="#94A3B8"
          strokeWidth="1.2"
          strokeDasharray="160 3"
        />

        {/* Top Wing Flap Division Lines */}
        <line
          x1={wxRootLeading + 85}
          y1={tp - 38}
          x2={wxRootLeading + 102}
          y2={tp - 8}
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />
        <line
          x1={wxRootLeading + 135}
          y1={tp - 62}
          x2={wxRootLeading + 150}
          y2={tp - 8}
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />

        {/* Top Wing Flap Track Fairing Canoes */}
        {[
          { x: wxRootLeading + 85, y: tp - 36 },
          { x: wxRootLeading + 132, y: tp - 60 },
          { x: wxRootLeading + 172, y: tp - 84 },
        ].map((c, i) => (
          <ellipse
            key={`top-canoe-${i}`}
            cx={c.x}
            cy={c.y}
            rx={8}
            ry={2.5}
            transform={`rotate(-28 ${c.x} ${c.y})`}
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="0.8"
          />
        ))}

        {/* Top Winglet / Sharklet in Pick&book red */}
        <polygon
          points={`
            ${tipLeadingX - 2},${tp - wingSpan + 6}
            ${tipLeadingX + 16},${tp - wingSpan - 8}
            ${tipLeadingX + 22},${tp - wingSpan - 6}
            ${tipLeadingX + 10},${tp - wingSpan + 14}
          `}
          fill="#E31E24"
          stroke="#B91C1C"
          strokeWidth="1.2"
        />

        {/* ── BOTTOM WING ── */}
        <path
          d={bottomWingPath}
          fill="url(#lowerWingGrad)"
          stroke="#CBD5E1"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Bottom Wing Leading Edge Slat Line */}
        <line
          x1={wxRootLeading + 25}
          y1={bt + 20}
          x2={tipLeadingX - 6}
          y2={bt + wingSpan - 10}
          stroke="#94A3B8"
          strokeWidth="1.2"
          strokeDasharray="160 3"
        />

        {/* Bottom Wing Flap Division Lines */}
        <line
          x1={wxRootLeading + 85}
          y1={bt + 38}
          x2={wxRootLeading + 102}
          y2={bt + 8}
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />
        <line
          x1={wxRootLeading + 135}
          y1={bt + 62}
          x2={wxRootLeading + 150}
          y2={bt + 8}
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />

        {/* Bottom Wing Flap Track Fairing Canoes */}
        {[
          { x: wxRootLeading + 85, y: bt + 36 },
          { x: wxRootLeading + 132, y: bt + 60 },
          { x: wxRootLeading + 172, y: bt + 84 },
        ].map((c, i) => (
          <ellipse
            key={`bot-canoe-${i}`}
            cx={c.x}
            cy={c.y}
            rx={8}
            ry={2.5}
            transform={`rotate(28 ${c.x} ${c.y})`}
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="0.8"
          />
        ))}

        {/* Bottom Winglet / Sharklet in Pick&book red */}
        <polygon
          points={`
            ${tipLeadingX - 2},${bt + wingSpan - 6}
            ${tipLeadingX + 16},${bt + wingSpan + 8}
            ${tipLeadingX + 22},${bt + wingSpan + 6}
            ${tipLeadingX + 10},${bt + wingSpan - 14}
          `}
          fill="#E31E24"
          stroke="#B91C1C"
          strokeWidth="1.2"
        />

        {/* ── ENGINES MOUNTED ON PYLONS UNDER WINGS ── */}
        {[
          { engY: tp - 36, pylonY: tp - 12, isTop: true },
          { engY: bt + 36, pylonY: bt + 12, isTop: false },
        ].map((eng, idx) => {
          const engCenterX = wxRootLeading + 42;
          const engW = 54;
          const engH = 24;
          const intakeX = engCenterX - engW / 2;
          const exhaustX = engCenterX + engW / 2;

          return (
            <g key={`turbofan-engine-${idx}`}>
              {/* Engine Mounting Pylon */}
              <polygon
                points={`
                  ${engCenterX - 12},${eng.engY}
                  ${engCenterX + 20},${eng.engY}
                  ${engCenterX + 14},${eng.pylonY}
                  ${engCenterX - 6},${eng.pylonY}
                `}
                fill="#CBD5E1"
                stroke="#94A3B8"
                strokeWidth="1.2"
              />

              {/* Engine Exhaust Nozzle Cone */}
              <ellipse
                cx={exhaustX}
                cy={eng.engY}
                rx={5.5}
                ry={engH / 2 - 3}
                fill="#475569"
                stroke="#334155"
                strokeWidth="1.2"
              />
              <polygon
                points={`
                  ${exhaustX},${eng.engY - 4}
                  ${exhaustX + 9},${eng.engY}
                  ${exhaustX},${eng.engY + 4}
                `}
                fill="#334155"
              />

              {/* Engine Main Nacelle Cowling */}
              <rect
                x={intakeX}
                y={eng.engY - engH / 2}
                width={engW - 5}
                height={engH}
                rx={7}
                fill="url(#engineCowlGrad)"
                stroke="#94A3B8"
                strokeWidth="1.3"
              />

              {/* Nacelle Cowl Separation Line */}
              <line
                x1={intakeX + 16}
                y1={eng.engY - engH / 2}
                x2={intakeX + 16}
                y2={eng.engY + engH / 2}
                stroke="#CBD5E1"
                strokeWidth="1"
              />

              {/* Turbine Fan Intake Interior */}
              <ellipse
                cx={intakeX}
                cy={eng.engY}
                rx={5}
                ry={engH / 2 - 1.5}
                fill="#0F172A"
                stroke="#64748B"
                strokeWidth="1"
              />

              {/* Fan Spinner Center Cone */}
              <polygon
                points={`
                  ${intakeX + 1},${eng.engY - 2.5}
                  ${intakeX + 6},${eng.engY}
                  ${intakeX + 1},${eng.engY + 2.5}
                `}
                fill="#E2E8F0"
              />
              <circle cx={intakeX + 6} cy={eng.engY} r={1.2} fill="#FFFFFF" />

              {/* Polished Silver Intake Lip Ring */}
              <ellipse
                cx={intakeX}
                cy={eng.engY}
                rx={3.2}
                ry={engH / 2 - 1.5}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />
            </g>
          );
        })}

        {/* ── TAIL STABILIZERS & VERTICAL TAIL FIN ── */}
        {/* Top Horizontal Stabilizer */}
        <polygon
          points={`
            ${endX - 16},${tp + 4}
            ${endX + 68},${tp - 38}
            ${endX + 78},${tp - 35}
            ${endX + 44},${tp + 8}
          `}
          fill="url(#upperWingGrad)"
          stroke="#CBD5E1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Top Stabilizer Red Leading Tip Accent */}
        <polygon
          points={`
            ${endX + 58},${tp - 32}
            ${endX + 68},${tp - 38}
            ${endX + 78},${tp - 35}
            ${endX + 66},${tp - 24}
          `}
          fill="#E31E24"
        />

        {/* Bottom Horizontal Stabilizer */}
        <polygon
          points={`
            ${endX - 16},${bt - 4}
            ${endX + 68},${bt + 38}
            ${endX + 78},${bt + 35}
            ${endX + 44},${bt - 8}
          `}
          fill="url(#lowerWingGrad)"
          stroke="#CBD5E1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Bottom Stabilizer Red Leading Tip Accent */}
        <polygon
          points={`
            ${endX + 58},${bt + 32}
            ${endX + 68},${bt + 38}
            ${endX + 78},${bt + 35}
            ${endX + 66},${bt + 24}
          `}
          fill="#E31E24"
        />

        {/* Vertical Tail Fin in Pick&book Red */}
        <g className="aircraft-vertical-tail-fin">
          {/* White Tail Root Fairing */}
          <polygon
            points={`
              ${endX - 8},${md}
              ${endX + 24},${md - 12}
              ${tail + 24},${md}
              ${endX + 24},${md + 12}
            `}
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />

          {/* Bold Red Vertical Stabilizer Fin */}
          <polygon
            points={`
              ${endX + 16},${md - 5}
              ${tail + 38},${md - 30}
              ${tail + 44},${md - 24}
              ${tail + 26},${md + 16}
              ${endX + 34},${md}
            `}
            fill="url(#tailFinRedGrad)"
            stroke="#B91C1C"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />

          {/* Rudder Hinge Line */}
          <line
            x1={tail + 28}
            y1={md - 22}
            x2={tail + 16}
            y2={md + 10}
            stroke="#991B1B"
            strokeWidth="1.3"
          />

          {/* Fin Leading Edge Highlight */}
          <line
            x1={endX + 20}
            y1={md - 5}
            x2={tail + 37}
            y2={md - 28}
            stroke="#FCA5A5"
            strokeWidth="1.2"
          />
        </g>
      </g>

      {/* ── 2. MAIN FUSELAGE BODY LAYER ── */}
      <g className="aircraft-fuselage-layer" filter="url(#aircraftDropShadow)">
        {/* Fuselage Exterior Aerodynamic Shell */}
        <path
          d={fuselagePathD}
          fill="url(#fuselage3DGrad)"
          stroke="#CBD5E1"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Nose Dome 3D Radial Highlight */}
        <path
          d={`
            M ${frontTip},${md}
            C ${frontTip + 22},${md - 72} ${frontTip + 70},${tp} 145,${tp}
            L 145,${bt}
            C ${frontTip + 70},${bt} ${frontTip + 22},${md + 72} ${frontTip},${md}
            Z
          `}
          fill="url(#noseDomeHighlight)"
        />

        {/* Radome Nose Separation Curve */}
        <path
          d={`
            M ${frontTip + 28},${md - 28}
            C ${frontTip + 32},${md} ${frontTip + 32},${md} ${frontTip + 28},${md + 28}
          `}
          stroke="#CBD5E1"
          strokeWidth="1.2"
          fill="none"
        />

        {/* Four angled cockpit panes, narrowing toward the nose */}
        <g className="aircraft-cockpit-windshield">
          <path
            d={`
              M ${frontTip + 42},${md - 15}
              L ${frontTip + 82},${md - 18}
              L ${frontTip + 78},${md + 3}
              L ${frontTip + 46},${md + 3}
              Z
            `}
            fill="#2B3445"
            stroke="#FFFFFF"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <path d={`M ${frontTip + 42},${md - 15} L ${frontTip + 52},${md - 15.75} L ${frontTip + 51},${md + 3} L ${frontTip + 46},${md + 3} Z`} fill="#718096" opacity="0.55" />
          <path d={`M ${frontTip + 52},${md - 15.75} L ${frontTip + 62},${md - 16.5} L ${frontTip + 60},${md + 3} L ${frontTip + 51},${md + 3} Z`} fill="#718096" opacity="0.45" />
          <path d={`M ${frontTip + 62},${md - 16.5} L ${frontTip + 72},${md - 17.25} L ${frontTip + 69},${md + 3} L ${frontTip + 60},${md + 3} Z`} fill="#718096" opacity="0.4" />
          <path d={`M ${frontTip + 72},${md - 17.25} L ${frontTip + 82},${md - 18} L ${frontTip + 78},${md + 3} L ${frontTip + 69},${md + 3} Z`} fill="#718096" opacity="0.5" />
          <line x1={frontTip + 52} y1={md - 15.75} x2={frontTip + 51} y2={md + 3} stroke="#FFFFFF" strokeWidth="1" />
          <line x1={frontTip + 62} y1={md - 16.5} x2={frontTip + 60} y2={md + 3} stroke="#FFFFFF" strokeWidth="1" />
          <line x1={frontTip + 72} y1={md - 17.25} x2={frontTip + 69} y2={md + 3} stroke="#FFFFFF" strokeWidth="1" />
        </g>
      </g>

      {/* ── 3. CABIN FLOORPLAN RED ARCHITECTURAL BORDER ── */}
      <g className="aircraft-cabin-floorplan-border">
        {/* Red outline framing passenger cabin exactly as shown in Image 2 */}
        <path
          d={cabinRedBorderD}
          fill="#FFFFFF"
          stroke="#E31E24"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </g>

      {/* ── 4. CABIN AMENITIES (FOOD & WASHROOM BADGES) ── */}
      <g className="aircraft-amenities-layer">
        {/* Front Cabin Amenities: Meal on top, Washroom on bottom */}
        <FoodMealBadge x={firstRowX - 58} y={md - 50} />
        <WashroomBadge x={firstRowX - 58} y={md + 22} />

        {/* Rear Cabin Amenities: Washroom on top, Meal on bottom */}
        <WashroomBadge x={lastRowEnd + 18} y={md - 50} />
        <FoodMealBadge x={lastRowEnd + 18} y={md + 22} />
      </g>

      {/* ── 5. EMERGENCY EXITS (Positioned neatly on cabin red border) ── */}
      <g className="aircraft-emergency-exits">
        {exitRowNumbers.map((rNum) => {
          const rowX = rowXMap.get(rNum);
          if (rowX === undefined) return null;
          const exitX = rowX + S / 2 - 11;

          return (
            <g key={`exit-marker-${rNum}`}>
              {/* Top Emergency Exit Box */}
              <EmergencyExit
                x={exitX}
                y={cabinTopY - 11}
                direction="up"
              />
              {/* Bottom Emergency Exit Box */}
              <EmergencyExit
                x={exitX}
                y={cabinBotY - 11}
                direction="down"
              />
            </g>
          );
        })}
      </g>

      {/* ── 6. ROW NUMBERS ABOVE CABIN (Inside red border, above row A) ── */}
      <g className="aircraft-row-numbers" style={{ pointerEvents: "none" }}>
        {rowPositions.map((r) => (
          <text
            key={`row-num-${r.number}`}
            x={r.x + S / 2}
            y={cabinTopY + 16}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="#0F172A"
          >
            {r.number}
          </text>
        ))}
      </g>

      {/* ── 7. SEAT LETTERS (A, B, C | D, E, F) ON LEFT (Inside red border) ── */}
      <g className="aircraft-seat-letters" style={{ pointerEvents: "none" }}>
        {cabins.map((cl, clIdx) => {
          const colMap = cabinColYOffsets.get(cl.name);
          if (!colMap) return null;

          return (
            <g key={`letters-${clIdx}`}>
              {Array.from(colMap.entries()).map(([letter, yRel]) => {
                const seatY = y0 + yRel;
                return (
                  <text
                    key={`let-${cl.name}-${letter}`}
                    x={firstRowX - 18}
                    y={seatY + S / 2 + 4}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fill="#0F172A"
                  >
                    {letter}
                  </text>
                );
              })}
            </g>
          );
        })}
      </g>

      {/* ── 8. SEATS LAYER (Seats with prices below, inside cabin border) ── */}
      <g className="aircraft-seats-layer">
        {rowPositions.map((r) => {
          const colMap = cabinColYOffsets.get(r.cabin);

          return (
            <g key={`row-seats-${r.number}`}>
              {(r.seats || []).map((seat) => {
                const yRel = colMap ? colMap.get(seat.col) : undefined;
                if (yRel === undefined) return null;

                const seatY = y0 + yRel;
                const isSelected = selectedSeatIds.has(seat.id);

                return (
                  <ChairSeat
                    key={seat.id}
                    x={r.x}
                    y={seatY}
                    seat={seat}
                    status={seat.status}
                    isSelected={isSelected}
                    isVertical={isVertical}
                    onSeatClick={onSeatClick}
                    onMouseEnter={onSeatHover}
                    onMouseLeave={onSeatLeave}
                  />
                );
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export const AirlinerBackgroundSVG = AircraftSeatMap;
export default AircraftSeatMap;
