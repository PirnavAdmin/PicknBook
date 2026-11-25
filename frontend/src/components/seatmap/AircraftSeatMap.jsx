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
 * Minimal Coffee Cup Galley Icon
 */
export const GalleyIcon = ({ x, y, isVertical = false }) => {
  const transform = isVertical
    ? `translate(${y}, ${x})`
    : `translate(${x}, ${y})`;
  return (
    <g transform={transform} stroke="#888780" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M -4 -3 L 2 -3 L 2 1 C 2 3.2 -0.2 4 -1 4 C -1.8 4 -4 3.2 -4 1 Z" />
      <path d="M 2 -2 L 4 -2 C 4.8 -2 4.8 0.5 4 0.5 L 2 0.5" />
      <line x1="-5" y1="5" x2="3" y2="5" />
    </g>
  );
};

/**
 * Emergency Exit Box on Fuselage Edge:
 * Horizontal: 24x12 box, rx 3, white fill, stroke #D62828 1.5px
 * Arrow pointing OUT of fuselage: UP on top edge, DOWN on bottom edge.
 * Vertical: 12x24 box, rx 3, white fill, stroke #D62828 1.5px
 * Arrow pointing OUT of fuselage: LEFT on left edge, RIGHT on right edge.
 */
export const EmergencyExit = ({ x, y, direction = "up", isVertical = false }) => {
  if (isVertical) {
    // x and y swapped: x is across fuselage, y is along fuselage
    const isLeft = direction === "up"; // "up" was top edge in horizontal, now left edge
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect
          x={0}
          y={0}
          width={12}
          height={24}
          rx={3}
          fill="#FFFFFF"
          stroke="#D62828"
          strokeWidth="1.5"
        />
        {isLeft ? (
          // Arrow pointing LEFT (outward)
          <path
            d="M 9 12 L 3 12 M 6 9 L 3 12 L 6 15"
            stroke="#D62828"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          // Arrow pointing RIGHT (outward)
          <path
            d="M 3 12 L 9 12 M 6 9 L 9 12 L 6 15"
            stroke="#D62828"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    );
  }

  // Horizontal mode
  const isUp = direction === "up";
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0}
        y={0}
        width={24}
        height={12}
        rx={3}
        fill="#FFFFFF"
        stroke="#D62828"
        strokeWidth="1.5"
      />
      {isUp ? (
        // Arrow pointing UP (outward)
        <path
          d="M 12 9 L 12 3 M 9 6 L 12 3 L 15 6"
          stroke="#D62828"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        // Arrow pointing DOWN (outward)
        <path
          d="M 12 3 L 12 9 M 9 6 L 12 9 L 15 6"
          stroke="#D62828"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
};

export const EmergencyExitBadge = EmergencyExit;

/**
 * Passenger Door Box:
 * Horizontal: 14x12 box, rx 2, white fill, stroke #1D9E75 1.4px
 * Vertical: 12x14 box, rx 2, white fill, stroke #1D9E75 1.4px
 */
export const DoorBox = ({ x, y, isVertical = false }) => {
  if (isVertical) {
    return (
      <rect
        x={x}
        y={y}
        width={12}
        height={14}
        rx={2}
        fill="#FFFFFF"
        stroke="#1D9E75"
        strokeWidth="1.4"
      />
    );
  }
  return (
    <rect
      x={x}
      y={y}
      width={14}
      height={12}
      rx={2}
      fill="#FFFFFF"
      stroke="#1D9E75"
      strokeWidth="1.4"
    />
  );
};

/**
 * ChairSeat Component
 * Realistic chair representation with back bar on the nose side.
 * In horizontal: back bar on left side.
 * In vertical: back bar on top side (chair faces forward/up towards cockpit).
 * Mobile tap hit target: minimum 24px invisible hit area.
 */
export const ChairSeat = ({
  x,
  y,
  seat,
  status = "free",
  isSelected = false,
  tierColors = null,
  isMatchingFilter = true,
  hasActiveFilters = false,
  isVertical = false,
  onSeatClick = () => { },
  onMouseEnter = () => { },
  onMouseLeave = () => { },
}) => {
  const isBooked = status === "booked";

  let fill = NON_PRICE_COLORS.free.fill;
  let stroke = NON_PRICE_COLORS.free.stroke;
  let chairBarColor = NON_PRICE_COLORS.free.chairBar;

  if (isBooked) {
    fill = NON_PRICE_COLORS.booked.fill;
    stroke = NON_PRICE_COLORS.booked.stroke;
    chairBarColor = NON_PRICE_COLORS.booked.chairBar;
  } else if (isSelected) {
    fill = NON_PRICE_COLORS.selected.fill;
    stroke = "#2563EB";
    chairBarColor = NON_PRICE_COLORS.selected.chairBar;
  } else if (status === "paid" && tierColors) {
    fill = tierColors.fill;
    stroke = tierColors.stroke;
    chairBarColor = tierColors.chairBar;
  }

  // Filter highlighting and dimming
  let groupOpacity = 1;
  let groupPointerEvents = isBooked ? "not-allowed" : "pointer";

  if (hasActiveFilters && !isSelected) {
    if (!isMatchingFilter) {
      groupOpacity = 0.14;
      groupPointerEvents = "none";
    }
  }

  const isMatchingFilterActive = hasActiveFilters && isMatchingFilter && !isBooked;
  const strokeWidth = (isMatchingFilterActive || isSelected) ? 1.8 : 1.6;

  // Soft glow in tier colour for filter matches; blue glow for selected seat
  let seatGlowStyle = undefined;
  if (isSelected) {
    seatGlowStyle = {
      filter: "drop-shadow(0 0 3px #2563eb) drop-shadow(0 0 6px #2563eb)",
    };
  } else if (isMatchingFilterActive) {
    const tierColor = tierColors?.baseColor || tierColors?.stroke || stroke;
    seatGlowStyle = {
      filter: `drop-shadow(0 0 3px ${tierColor}) drop-shadow(0 0 6px ${tierColor})`,
    };
  }

  // Coordinate positioning based on orientation
  const seatX = isVertical ? y : x;
  const seatY = isVertical ? x : y;

  return (
    <g
      className={`aircraft-chair-seat ${status} ${isSelected ? "selected" : ""}`}
      style={{
        cursor: groupPointerEvents,
        opacity: groupOpacity,
        pointerEvents: groupPointerEvents === "none" ? "none" : "auto",
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
      {/* 24px minimum hit area for mobile touches */}
      <rect
        x={seatX - 4}
        y={seatY - 4}
        width={24}
        height={24}
        fill="transparent"
        style={{ pointerEvents: groupPointerEvents === "none" ? "none" : "all" }}
      />

      {/* Main Seat Cushion */}
      <rect
        x={seatX}
        y={seatY}
        width={16}
        height={16}
        rx={3.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={seatGlowStyle}
      />

      {/* Chair Back Bar */}
      {isVertical ? (
        // Vertical mode: nose at top, so back bar is on top edge of chair
        <rect
          x={seatX + 2.5}
          y={seatY + 1.5}
          width={11}
          height={3}
          rx={1.5}
          fill={chairBarColor}
        />
      ) : (
        // Horizontal mode: nose at left, so back bar is on left edge of chair
        <rect
          x={seatX + 1.5}
          y={seatY + 2.5}
          width={3}
          height={11}
          rx={1.5}
          fill={chairBarColor}
        />
      )}
    </g>
  );
};

/**
 * AircraftSeatMap Component
 * High-fidelity, API-driven aircraft seat map with responsive orientation.
 * Supports horizontal rendering and vertical phone orientation (nose at top).
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

  // Responsive mode decision
  const isVertical =
    orientation === "vertical" ||
    (orientation === "auto" && containerWidth > 0 && containerWidth < 560);

  const selectedSeatIds = useMemo(() => {
    return new Set(selectedSeats.map((s) => s.id || s.label || `${s.row}${s.col}`));
  }, [selectedSeats]);

  // Distinct paid prices of THIS flight (ascending)
  const distinctPaidPrices = useMemo(() => {
    const prices = new Set();
    rows.forEach((r) => {
      (r.seats || []).forEach((s) => {
        if (s.status === "paid" && s.price > 0) {
          prices.add(s.price);
        }
      });
    });
    return Array.from(prices).sort((a, b) => a - b);
  }, [rows]);

  // Constants per specification
  const S = 16;
  const G = 4;
  const A = 14;
  const cabinGap = 30;
  const wingSpan = 66;
  const fuselagePadding = 46;

  // 1. Cabin Heights & Column Offsets
  const { cabinHeights, cabinColYOffsets, maxL, aisleOffsets } = useMemo(() => {
    const heights = new Map();
    const offsets = new Map();
    const aisles = new Map();
    let maxCabinL = 0;

    cabins.forEach((c) => {
      const groups = c.groups || (c.columns ? [c.columns.filter((l) => l !== "_").join("")] : ["ABC", "DEF"]);
      let currY = 0;
      const colMap = new Map();
      const cabinAisles = [];

      groups.forEach((groupStr, gIdx) => {
        if (gIdx > 0) {
          cabinAisles.push(currY);
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

      heights.set(c.name, currY);
      offsets.set(c.name, colMap);
      aisles.set(c.name, cabinAisles);
      if (currY > maxCabinL) maxCabinL = currY;
    });

    return {
      cabinHeights: heights,
      cabinColYOffsets: offsets,
      maxL: maxCabinL > 0 ? maxCabinL : 4 * S + 3 * G + A,
      aisleOffsets: aisles,
    };
  }, [cabins, S, G, A]);

  // Fuselage Vertical Coordinates (across width in horizontal)
  const H = maxL + fuselagePadding;
  const tp = 82; // wingSpan (66) + 16 padding = 82
  const bt = tp + H;
  const md = tp + H / 2;
  const totalSvgHeight = H + wingSpan * 2 + 20;

  // Geometry: Seat grid centered in fuselage with nose & tail elements removed
  // Symmetrical padding and smooth aerodynamic curved end caps
  const outerPad = 25; // outer margin from SVG edge to fuselage apex
  const capLength = 75; // distance from fuselage apex to first/last seat row
  const x0 = outerPad + capLength; // first row X position = 100
  const frontTip = outerPad; // 25
  const nx = x0 - 28; // 72 - start of straight fuselage cylinder

  const { rowPositions, cabinBands, cabinLetters, cabinAisleStrips, transitionGaps, endX, tail, totalSvgWidth } = useMemo(() => {
    let currX = x0;
    let prevCabin = null;
    let cabinStartX = currX;
    const rPositions = [];
    const bands = [];
    const gaps = [];
    const cLetters = [];
    const aisleStrips = [];

    rows.forEach((r) => {
      if (prevCabin && r.cabin !== prevCabin) {
        // Record previous cabin band and aisle strips
        const cabinEndX = currX - 20 + S;
        bands.push({
          name: prevCabin,
          startX: cabinStartX - 4,
          endX: cabinEndX + 4,
        });

        const aisles = aisleOffsets.get(prevCabin) || [];
        const hPrev = cabinHeights.get(prevCabin) || maxL;
        const y0Prev = md - hPrev / 2 + 5;
        aisles.forEach((aisleYRel) => {
          aisleStrips.push({
            cabin: prevCabin,
            x: cabinStartX - 4,
            y: y0Prev + aisleYRel,
            width: cabinEndX - cabinStartX + 8,
            height: A,
          });
        });

        gaps.push(currX + (cabinGap - 20) / 2);
        currX += cabinGap;
        cabinStartX = currX;
      }

      if (r.cabin !== prevCabin) {
        cLetters.push({
          cabin: r.cabin,
          firstSeatX: currX,
        });
      }

      rPositions.push({
        ...r,
        x: currX,
      });

      prevCabin = r.cabin;
      currX += 20; // rowPitch = 20
    });

    if (prevCabin) {
      const lastRowX = currX - 20;
      const cabinEndX = lastRowX + S;
      bands.push({
        name: prevCabin,
        startX: cabinStartX - 4,
        endX: cabinEndX + 4,
      });

      const aisles = aisleOffsets.get(prevCabin) || [];
      const hPrev = cabinHeights.get(prevCabin) || maxL;
      const y0Prev = md - hPrev / 2 + 5;
      aisles.forEach((aisleYRel) => {
        aisleStrips.push({
          cabin: prevCabin,
          x: cabinStartX - 4,
          y: y0Prev + aisleYRel,
          width: cabinEndX - cabinStartX + 8,
          height: A,
        });
      });
    }

    const lastRowEnd = rPositions.length > 0 ? rPositions[rPositions.length - 1].x + S : x0 + 200;
    const calculatedEndX = lastRowEnd + 28; // end of straight fuselage cylinder
    const calculatedTail = lastRowEnd + capLength; // rear fuselage apex (tail)
    const calculatedTotalSvgWidth = calculatedTail + outerPad; // symmetrical outer margin

    return {
      rowPositions: rPositions,
      cabinBands: bands,
      cabinLetters: cLetters,
      cabinAisleStrips: aisleStrips,
      transitionGaps: gaps,
      endX: calculatedEndX,
      tail: calculatedTail,
      totalSvgWidth: calculatedTotalSvgWidth,
    };
  }, [rows, x0, S, cabinGap, aisleOffsets, cabinHeights, maxL, md, A]);

  // Wing Root Coordinate (36% of cabin length)
  const wx = x0 + (endX - x0) * 0.36;

  // Check if seat matches active filters
  const hasActiveFilters = activeFilters && activeFilters.size > 0;
  const isSeatMatchingFilter = (seat) => {
    if (!hasActiveFilters) return true;
    if (seat.status === "booked") return false;
    if (seat.status === "free" && activeFilters.has("FREE")) return true;
    if (seat.status === "paid" && activeFilters.has(seat.price)) return true;
    return false;
  };

  // Map exit row to X coordinate
  const rowXMap = useMemo(() => {
    const map = new Map();
    rowPositions.forEach((r) => map.set(r.number, r.x));
    return map;
  }, [rowPositions]);

  // Responsive SVG Dimensions: fixed natural width (the width of the full 39-column grid plus padding)
  const { renderedWidth, renderedHeight, viewBoxString } = useMemo(() => {
    if (isVertical) {
      // Plane cross-section width is totalSvgHeight; length is totalSvgWidth
      return {
        renderedWidth: totalSvgHeight,
        renderedHeight: totalSvgWidth,
        viewBoxString: `0 0 ${totalSvgHeight} ${totalSvgWidth}`,
      };
    }
    // Horizontal mode: fixed natural dimensions
    return {
      renderedWidth: totalSvgWidth,
      renderedHeight: totalSvgHeight,
      viewBoxString: `0 0 ${totalSvgWidth} ${totalSvgHeight}`,
    };
  }, [isVertical, totalSvgWidth, totalSvgHeight]);

  // ── 1. WINGS & WINGLETS POLYGONS ──
  // Winglet: (188,1) (199,1.24) (196,1)
  const topWingPoints = useMemo(() => {
    // Points along [dx, fraction] where fraction 1 = wingSpan (66)
    const pts = [
      [wx, tp],
      [wx + 150, tp - wingSpan],
      [wx + 188, tp - wingSpan],
      [wx + 199, tp - wingSpan * 1.24],
      [wx + 196, tp - wingSpan],
      [wx + 192, tp - wingSpan],
      [wx + 125, tp],
    ];
    return isVertical
      ? pts.map(([x, y]) => `${y},${x}`).join(" ")
      : pts.map(([x, y]) => `${x},${y}`).join(" ");
  }, [wx, tp, wingSpan, isVertical]);

  const bottomWingPoints = useMemo(() => {
    const pts = [
      [wx, bt],
      [wx + 150, bt + wingSpan],
      [wx + 188, bt + wingSpan],
      [wx + 199, bt + wingSpan * 1.24],
      [wx + 196, bt + wingSpan],
      [wx + 192, bt + wingSpan],
      [wx + 125, bt],
    ];
    return isVertical
      ? pts.map(([x, y]) => `${y},${x}`).join(" ")
      : pts.map(([x, y]) => `${x},${y}`).join(" ");
  }, [wx, bt, wingSpan, isVertical]);

  // Three flap lines along trailing edge (30px long, red, 0.9px, opacity .45)
  const flapLines = useMemo(() => {
    const lines = [];
    const tValues = [0.28, 0.52, 0.78];
    tValues.forEach((t) => {
      // Top wing trailing edge: from (wx + 125, tp) to (wx + 192, tp - wingSpan)
      const xt = wx + 125 + (192 - 125) * t;
      const yt = tp - wingSpan * t;
      const x2 = xt - 28;
      const y2 = yt + 10;
      lines.push({ x1: xt, y1: yt, x2, y2 });

      // Bottom wing trailing edge
      const yb = bt + wingSpan * t;
      const yb2 = yb - 10;
      lines.push({ x1: xt, y1: yb, x2, y2: yb2 });
    });
    return lines;
  }, [wx, tp, bt, wingSpan]);

  // ── 2. TAIL STABILISERS ──
  // Stabilisers (-26,0) (16,.4) (42,.4) (30,0) at 60px scale
  const topStabiliserPoints = useMemo(() => {
    const pts = [
      [endX - 26, tp],
      [endX + 16, tp - 24],
      [endX + 42, tp - 24],
      [endX + 30, tp],
    ];
    return isVertical
      ? pts.map(([x, y]) => `${y},${x}`).join(" ")
      : pts.map(([x, y]) => `${x},${y}`).join(" ");
  }, [endX, tp, isVertical]);

  const bottomStabiliserPoints = useMemo(() => {
    const pts = [
      [endX - 26, bt],
      [endX + 16, bt + 24],
      [endX + 42, bt + 24],
      [endX + 30, bt],
    ];
    return isVertical
      ? pts.map(([x, y]) => `${y},${x}`).join(" ")
      : pts.map(([x, y]) => `${x},${y}`).join(" ");
  }, [endX, bt, isVertical]);

  // ── 3. FUSELAGE PATH (centered, smooth aerodynamic curved end caps, no nose/tail dead zones) ──
  const fuselagePathD = useMemo(() => {
    const frontCtrl = nx - (nx - frontTip) * 0.6;
    const tailCtrl = endX + (tail - endX) * 0.6;

    if (isVertical) {
      // Swapped (y, x): x is across width, y is along length
      return `M ${tp},${nx} V ${endX} C ${tp},${tailCtrl} ${md - 16},${tail} ${md},${tail} C ${md + 16},${tail} ${bt},${tailCtrl} ${bt},${endX} V ${nx} C ${bt},${frontCtrl} ${md + 16},${frontTip} ${md},${frontTip} C ${md - 16},${frontTip} ${tp},${frontCtrl} ${tp},${nx} Z`;
    }
    return `M ${nx},${tp} H ${endX} C ${tailCtrl},${tp} ${tail},${md - 16} ${tail},${md} C ${tail},${md + 16} ${tailCtrl},${bt} ${endX},${bt} H ${nx} C ${frontCtrl},${bt} ${frontTip},${md + 16} ${frontTip},${md} C ${frontTip},${md - 16} ${frontCtrl},${tp} ${nx},${tp} Z`;
  }, [isVertical, nx, tp, endX, tail, md, bt, frontTip]);

  return (
    <svg
      className="aircraft-seatmap-svg"
      viewBox={viewBoxString}
      width={renderedWidth}
      height={renderedHeight}
      style={{
        display: "block",
        margin: "0 auto",
        maxWidth: "none",
        width: `${renderedWidth}px`,
        height: `${renderedHeight}px`,
      }}
    >
      <defs>
        {/* Fuselage linear gradient across width */}
        {isVertical ? (
          <linearGradient id="fuselageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EEF1F7" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E7EBF3" />
          </linearGradient>
        ) : (
          <linearGradient id="fuselageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EEF1F7" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E7EBF3" />
          </linearGradient>
        )}

        {/* Wing gradient: fuselage (#FFF7F7) to tip (#F9D3D3) */}
        {isVertical ? (
          <>
            <linearGradient id="topWingGrad" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FFF7F7" />
              <stop offset="100%" stopColor="#F9D3D3" />
            </linearGradient>
            <linearGradient id="bottomWingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFF7F7" />
              <stop offset="100%" stopColor="#F9D3D3" />
            </linearGradient>
          </>
        ) : (
          <>
            <linearGradient id="topWingGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FFF7F7" />
              <stop offset="100%" stopColor="#F9D3D3" />
            </linearGradient>
            <linearGradient id="bottomWingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF7F7" />
              <stop offset="100%" stopColor="#F9D3D3" />
            </linearGradient>
          </>
        )}
      </defs>

      {/* ── DRAW ORDER STEP 1: WINGS & STABILISERS ── */}
      <g className="aircraft-wings-layer">
        {/* Top Wing */}
        <polygon
          points={topWingPoints}
          fill="url(#topWingGrad)"
          stroke="#D62828"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Bottom Wing */}
        <polygon
          points={bottomWingPoints}
          fill="url(#bottomWingGrad)"
          stroke="#D62828"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Three Flap Lines along trailing edge */}
        {flapLines.map((line, idx) => (
          <line
            key={`flap-${idx}`}
            x1={isVertical ? line.y1 : line.x1}
            y1={isVertical ? line.x1 : line.y1}
            x2={isVertical ? line.y2 : line.x2}
            y2={isVertical ? line.x2 : line.y2}
            stroke="#D62828"
            strokeWidth="0.9"
            strokeOpacity="0.45"
            strokeLinecap="round"
          />
        ))}

        {/* Engines: Top & Bottom */}
        {[
          { yEng: tp - 33, pylonY: tp - 18, isTop: true },
          { yEng: bt + 33, pylonY: bt + 18, isTop: false },
        ].map((eng, idx) => {
          const nacelleX = wx + 98;
          const intakeX = wx + 84;
          return (
            <g key={`engine-${idx}`}>
              {/* Pylon line to dx 114 */}
              <line
                x1={isVertical ? eng.yEng : nacelleX}
                y1={isVertical ? nacelleX : eng.yEng}
                x2={isVertical ? eng.pylonY : wx + 114}
                y2={isVertical ? wx + 114 : eng.pylonY}
                stroke="#D62828"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Nacelle ellipse: rx 19, ry 8 */}
              <ellipse
                cx={isVertical ? eng.yEng : nacelleX}
                cy={isVertical ? nacelleX : eng.yEng}
                rx={isVertical ? 8 : 19}
                ry={isVertical ? 19 : 8}
                fill="#FFFFFF"
                stroke="#D62828"
                strokeWidth="1.5"
              />
              {/* Intake ellipse: rx 4.5, ry 5.5, fill #FBE3E3 */}
              <ellipse
                cx={isVertical ? eng.yEng : intakeX}
                cy={isVertical ? intakeX : eng.yEng}
                rx={isVertical ? 5.5 : 4.5}
                ry={isVertical ? 4.5 : 5.5}
                fill="#FBE3E3"
                stroke="#D62828"
                strokeWidth="1.2"
              />
            </g>
          );
        })}

        {/* Tail Stabilisers */}
        <polygon
          points={topStabiliserPoints}
          fill="url(#topWingGrad)"
          stroke="#D62828"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <polygon
          points={bottomStabiliserPoints}
          fill="url(#bottomWingGrad)"
          stroke="#D62828"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </g>

      {/* ── DRAW ORDER STEP 2: FUSELAGE ── */}
      <path
        d={fuselagePathD}
        fill="url(#fuselageGrad)"
        stroke="#D62828"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* ── DRAW ORDER STEP 4: CABIN BANDS ── */}
      <g className="aircraft-cabin-bands">
        {cabinBands.map((band) => {
          if (!band.name.toLowerCase().includes("business")) return null;
          if (isVertical) {
            return (
              <rect
                key={`band-${band.name}`}
                x={tp + 2}
                y={band.startX}
                width={H - 4}
                height={band.endX - band.startX}
                rx={4}
                fill="#E1E9FE"
              />
            );
          }
          return (
            <rect
              key={`band-${band.name}`}
              x={band.startX}
              y={tp + 2}
              width={band.endX - band.startX}
              height={H - 4}
              rx={4}
              fill="#E1E9FE"
            />
          );
        })}
      </g>

      {/* ── DRAW ORDER STEP 5: AISLE STRIPS (#E9EEF8 rectangle 14px high) ── */}
      <g className="aircraft-aisle-strips">
        {cabinAisleStrips.map((strip, sIdx) => {
          if (isVertical) {
            return (
              <rect
                key={`aisle-${sIdx}`}
                x={strip.y}
                y={strip.x}
                width={strip.height}
                height={strip.width}
                rx={2}
                fill="#E9EEF8"
              />
            );
          }
          return (
            <rect
              key={`aisle-${sIdx}`}
              x={strip.x}
              y={strip.y}
              width={strip.width}
              height={strip.height}
              rx={2}
              fill="#E9EEF8"
            />
          );
        })}
      </g>

      {/* Galley Icons at Cabin Gaps */}
      <g className="aircraft-galley-icons">
        {transitionGaps.map((gapX, idx) => (
          <GalleyIcon key={`galley-${idx}`} x={gapX} y={md} isVertical={isVertical} />
        ))}
      </g>

      {/* ── DRAW ORDER STEP 6: EXITS & DOORS ── */}
      {/* Doors: 14x12 boxes on both edges at nx - 6 and endX - 8 */}
      <g className="aircraft-doors">
        <DoorBox x={isVertical ? tp - 6 : nx - 6} y={isVertical ? nx - 6 : tp - 6} isVertical={isVertical} />
        <DoorBox x={isVertical ? bt - 6 : nx - 6} y={isVertical ? nx - 6 : bt - 6} isVertical={isVertical} />
        <DoorBox x={isVertical ? tp - 6 : endX - 8} y={isVertical ? endX - 8 : tp - 6} isVertical={isVertical} />
        <DoorBox x={isVertical ? bt - 6 : endX - 8} y={isVertical ? endX - 8 : bt - 6} isVertical={isVertical} />
      </g>

      {/* Emergency Exits at EVERY exit row from API, on BOTH edges */}
      <g className="aircraft-emergency-exits">
        {exitRows.map((rNum) => {
          const rowX = rowXMap.get(rNum);
          if (rowX === undefined) return null;
          const exitBoxX = rowX + S / 2 - 12;

          return (
            <g key={`exit-${rNum}`}>
              <EmergencyExit
                x={isVertical ? tp - 6 : exitBoxX}
                y={isVertical ? exitBoxX : tp - 6}
                direction="up"
                isVertical={isVertical}
              />
              <EmergencyExit
                x={isVertical ? bt - 6 : exitBoxX}
                y={isVertical ? exitBoxX : bt - 6}
                direction="down"
                isVertical={isVertical}
              />
            </g>
          );
        })}
      </g>

      {/* ── DRAW ORDER STEP 7: ROW NUMBERS & SEAT LETTERS (NEVER ROTATED) ── */}
      <g className="aircraft-row-numbers" style={{ pointerEvents: "none" }}>
        {rowPositions.map((r) => {
          if (isVertical) {
            // Left band beside each row
            return (
              <text
                key={`num-${r.number}`}
                x={tp - 10}
                y={r.x + S / 2 + 4}
                textAnchor="end"
                fontSize="14"
                fontWeight="500"
                fill="#5b6472"
              >
                {r.number}
              </text>
            );
          }
          return (
            <text
              key={`num-${r.number}`}
              x={r.x + S / 2}
              y={tp + 17}
              textAnchor="middle"
              fontSize="14"
              fontWeight="500"
              fill="#5b6472"
            >
              {r.number}
            </text>
          );
        })}
      </g>

      <g className="aircraft-seat-letters" style={{ pointerEvents: "none" }}>
        {cabinLetters.map((cl, clIdx) => {
          const colMap = cabinColYOffsets.get(cl.cabin);
          const h = cabinHeights.get(cl.cabin) || maxL;
          const y0 = md - h / 2 + 5;
          if (!colMap) return null;

          return (
            <g key={`letters-${clIdx}`}>
              {Array.from(colMap.entries()).map(([letter, yRel]) => {
                const seatY = y0 + yRel;
                if (isVertical) {
                  // Above the first row of each cabin
                  return (
                    <text
                      key={`let-${cl.cabin}-${letter}`}
                      x={seatY + S / 2}
                      y={cl.firstSeatX - 8}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="500"
                      fill="#5b6472"
                    >
                      {letter}
                    </text>
                  );
                }
                return (
                  <text
                    key={`let-${cl.cabin}-${letter}`}
                    x={cl.firstSeatX - 6}
                    y={seatY + S / 2 + 4}
                    textAnchor="end"
                    fontSize="14"
                    fontWeight="500"
                    fill="#5b6472"
                  >
                    {letter}
                  </text>
                );
              })}
            </g>
          );
        })}
      </g>

      {/* ── DRAW ORDER STEP 8: SEATS (CHAIR SHAPE, NO TEXT INSIDE) ── */}
      <g className="aircraft-seats-layer">
        {rowPositions.map((r) => {
          const colMap = cabinColYOffsets.get(r.cabin);
          const h = cabinHeights.get(r.cabin) || maxL;
          const y0 = md - h / 2 + 5;

          return (
            <g key={`row-seats-${r.number}`}>
              {r.seats.map((seat) => {
                const yRel = colMap ? colMap.get(seat.col) : undefined;
                if (yRel === undefined) return null;

                const seatY = y0 + yRel;
                const isSelected = selectedSeatIds.has(seat.id);
                const isMatchingFilter = isSeatMatchingFilter(seat);

                let tierColors = null;
                if (seat.status === "paid") {
                  const rankIndex = distinctPaidPrices.indexOf(seat.price);
                  tierColors = getTierSeatColors(rankIndex, palette, seatFill);
                }

                return (
                  <ChairSeat
                    key={seat.id}
                    x={r.x}
                    y={seatY}
                    seat={seat}
                    status={seat.status}
                    isSelected={isSelected}
                    tierColors={tierColors}
                    isMatchingFilter={isMatchingFilter}
                    hasActiveFilters={hasActiveFilters}
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

      {/* ── DRAW ORDER STEP 9: SYMBOL OVERLAY LAYER ── */}
      <SymbolLayer
        layout={layout}
        rowPositions={rowPositions}
        cabinHeights={cabinHeights}
        cabinColYOffsets={cabinColYOffsets}
        isVertical={isVertical}
        md={md}
        tp={tp}
        bt={bt}
        nx={nx}
        endX={endX}
        tail={tail}
        maxL={maxL}
      />
    </svg>
  );
};

export const AirlinerBackgroundSVG = AircraftSeatMap;
export const LineIcon = GalleyIcon;

export default AircraftSeatMap;
