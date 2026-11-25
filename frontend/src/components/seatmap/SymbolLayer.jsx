import React, { useMemo } from "react";
import SymbolBadge from "./SymbolBadge";

/**
 * SymbolLayer renders seat badges and cabin element badges over the aircraft seat map
 * using the exact same coordinate system and grid without modifying underlying layout.
 */
export const SymbolLayer = ({
  layout,
  rowPositions,
  cabinHeights,
  cabinColYOffsets,
  isVertical = false,
  md,
  tp,
  bt,
  nx,
  endX,
  tail = endX + 80,
  maxL = 120,
  onBadgeHover,
  onBadgeLeave,
}) => {
  const rowXMap = useMemo(() => {
    const map = new Map();
    rowPositions.forEach((r) => map.set(r.number, r.x));
    return map;
  }, [rowPositions]);

  // 1. Resolve Cabin Elements
  const cabinElements = useMemo(() => {
    if (Array.isArray(layout?.cabinElements) && layout.cabinElements.length > 0) {
      return layout.cabinElements;
    }

    const elements = [];
    const exitRows = layout?.exitRows || [];
    const hasUpperDeck = Boolean(
      layout?.hasUpperDeck ||
      layout?.aircraft?.hasUpperDeck ||
      (layout?.stairs && layout.stairs.length > 0) ||
      String(layout?.aircraft || "").toLowerCase().includes("380") ||
      String(layout?.aircraft || "").toLowerCase().includes("747")
    );

    // Emergency exit doors at each exit row on top and bottom fuselage edges
    exitRows.forEach((rNum) => {
      elements.push({ type: "exitDoor", row: rNum, side: "top" });
      elements.push({ type: "exitDoor", row: rNum, side: "bottom" });
    });

    // Nose & Tail passenger doors on top and bottom fuselage edges
    elements.push({ type: "exitDoor", side: "nose" });
    elements.push({ type: "exitDoor", side: "tail" });

    // Galleys near nose and tail
    elements.push({ type: "galley", side: "nose" });
    elements.push({ type: "galley", side: "tail" });

    // Washrooms near nose and tail
    elements.push({ type: "lavatory", side: "nose" });
    elements.push({ type: "lavatory", side: "tail" });

    // Stairs only if aircraft has upper deck
    if (hasUpperDeck) {
      elements.push({ type: "stairs", side: "nose" });
    }

    return elements;
  }, [layout]);

  // 2. Render Seat Badges
  const seatBadges = useMemo(() => {
    const badgesToRender = [];

    rowPositions.forEach((r) => {
      const colMap = cabinColYOffsets.get(r.cabin);
      const h = cabinHeights.get(r.cabin) || maxL;
      const y0 = md - h / 2 + 5;

      (r.seats || []).forEach((seat) => {
        // "Hide the badge on booked seats."
        if (seat.status === "booked") return;

        // Determine badge types
        let bList = [];
        if (Array.isArray(seat.badges) && seat.badges.length > 0) {
          bList = seat.badges;
        } else {
          // Fallback derivation
          if (seat.isBassinet) bList.push("bassinet");
          if (seat.isExitRow || seat.isEmergencyExit || seat.isExtraLegroom) bList.push("extraLegroom");
          if (seat.isAccessible || seat.isWheelchair) bList.push("wheelchair");
          if (seat.hasPower || seat.isPower) bList.push("power");
        }

        if (bList.length === 0) return;

        const yRel = colMap ? colMap.get(seat.col) : undefined;
        if (yRel === undefined) return;

        const seatY = y0 + yRel;
        // Top-right corner of 16x16 seat
        let cx;
        let cy;

        if (isVertical) {
          // In vertical: x is seatY across fuselage, y is r.x along fuselage
          cx = seatY + 14;
          cy = r.x + 2;
        } else {
          // In horizontal: x is r.x along fuselage, y is seatY across fuselage
          cx = r.x + 14;
          cy = seatY + 2;
        }

        // Primary badge (first in list)
        const primaryBadge = bList[0];
        badgesToRender.push({
          id: `badge-${seat.id}-${primaryBadge}`,
          type: primaryBadge,
          cx,
          cy,
          seatId: seat.id,
          seat,
        });
      });
    });

    return badgesToRender;
  }, [rowPositions, cabinColYOffsets, cabinHeights, maxL, md, isVertical]);

  const firstRowX = rowPositions && rowPositions.length > 0 ? rowPositions[0].x : nx + 60;
  const lastRowEnd = rowPositions && rowPositions.length > 0 ? rowPositions[rowPositions.length - 1].x + 16 : endX - 60;

  return (
    <g className="aircraft-symbol-overlay-layer">
      {/* ── CABIN ELEMENT BADGES (~22px circles) ── */}
      <g className="aircraft-cabin-element-badges">
        {cabinElements.map((el, idx) => {
          let cx = md;
          let cy = md;

          if (el.type === "exitDoor") {
            if (el.row !== undefined && rowXMap.has(el.row)) {
              const rowX = rowXMap.get(el.row);
              const xPos = (rowX !== undefined ? rowX : nx) + 8;
              const yPos = el.side === "bottom" ? bt : tp;

              cx = isVertical ? yPos : xPos;
              cy = isVertical ? xPos : yPos;
            } else if (el.side === "nose") {
              const xPos = nx - 6;
              const yPos = tp;
              cx = isVertical ? yPos : xPos;
              cy = isVertical ? xPos : yPos;
            } else if (el.side === "tail") {
              const xPos = endX - 8;
              const yPos = bt;
              cx = isVertical ? yPos : xPos;
              cy = isVertical ? xPos : yPos;
            }
          } else if (el.type === "galley") {
            const xPos = el.side === "nose" ? firstRowX - 52 : lastRowEnd + 24;
            const yPos = md;
            cx = isVertical ? yPos : xPos;
            cy = isVertical ? xPos : yPos;
          } else if (el.type === "lavatory") {
            const xPos = el.side === "nose" ? firstRowX - 24 : lastRowEnd + 52;
            const yPos = md;
            cx = isVertical ? yPos : xPos;
            cy = isVertical ? xPos : yPos;
          } else if (el.type === "stairs") {
            const xPos = nx + 54;
            const yPos = md;
            cx = isVertical ? yPos : xPos;
            cy = isVertical ? xPos : yPos;
          }

          return (
            <SymbolBadge
              key={`cabin-el-${el.type}-${el.side}-${el.row || idx}`}
              type={el.type}
              size={22}
              cx={cx}
              cy={cy}
              isSvg={true}
            />
          );
        })}
      </g>

      {/* ── SEAT BADGES (~14px circles at top-right corner of seats) ── */}
      <g className="aircraft-seat-badges">
        {seatBadges.map((b) => (
          <SymbolBadge
            key={b.id}
            type={b.type}
            size={14}
            cx={b.cx}
            cy={b.cy}
            isSvg={true}
            ariaLabel={`${b.seatId} ${b.type}`}
            onMouseEnter={onBadgeHover ? (e) => onBadgeHover(b, e) : undefined}
            onMouseLeave={onBadgeLeave}
          />
        ))}
      </g>
    </g>
  );
};

export default SymbolLayer;
