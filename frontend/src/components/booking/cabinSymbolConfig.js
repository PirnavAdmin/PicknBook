/**
 * cabinSymbolConfig.js
 * 
 * Data-driven configuration and geometry resolution for cabin symbols
 * placed on/inside the aircraft fuselage SVG.
 * 
 * Coordinates:
 * - Horizontal aircraft: Nose on the LEFT (x = 0), Tail on the RIGHT (x = length).
 * - Y axis: Top fuselage edge (y = topEdgeY), Fuselage centerline / aisle (y = cy),
 *   Bottom fuselage edge (y = bottomEdgeY).
 * 
 * Rules:
 * - Front zone (between windshield and row 1):
 *   * pantry on top half
 *   * lavatory on bottom half
 *   * door badges on both fuselage edges
 *   * stairs badge just outside the bottom front door
 * - Over-wing rows:
 *   * emergency-exit badges on both fuselage edges, centred on wing root
 * - Tail zone (after last row):
 *   * lavatory on top half
 *   * pantry on bottom half
 *   * door badges on both fuselage edges
 * - Bassinet badge:
 *   * in the aisle beside row 1 (or any row flagged bassinet: true)
 * - If aircraft has fewer rows, front and tail zones stay fixed and seat block shrinks.
 * - Symbols never overlap seats or row numbers.
 */

export const DEFAULT_AIRCRAFT_CABIN_SYMBOLS_TEMPLATE = [
  // ── Front Zone (between windshield and row 1) ──
  {
    id: "front-door-top",
    type: "door",
    zone: "front",
    side: "top-edge",
    label: "Exit door",
    description: "Forward boarding exit door (Port)",
  },
  {
    id: "front-pantry",
    type: "pantry",
    zone: "front",
    side: "top-half",
    label: "Pantry / galley",
    description: "Forward galley & refreshments",
  },
  {
    id: "front-lavatory",
    type: "lavatory",
    zone: "front",
    side: "bottom-half",
    label: "Lavatory",
    description: "Forward lavatory",
  },
  {
    id: "front-door-bottom",
    type: "door",
    zone: "front",
    side: "bottom-edge",
    label: "Exit door",
    description: "Forward boarding exit door (Starboard)",
  },
  {
    id: "front-stairs",
    type: "stairs",
    zone: "front",
    side: "outside-bottom",
    label: "Boarding stairs",
    description: "Boarding staircase access point",
  },

  // ── Over-wing Rows (extra-legroom rows) ──
  {
    id: "wing-emergency-top",
    type: "emergency",
    zone: "wing",
    side: "top-edge",
    label: "Emergency exit",
    description: "Over-wing emergency exit hatch (Port)",
  },
  {
    id: "wing-emergency-bottom",
    type: "emergency",
    zone: "wing",
    side: "bottom-edge",
    label: "Emergency exit",
    description: "Over-wing emergency exit hatch (Starboard)",
  },

  // ── Tail Zone (after last row) ──
  {
    id: "tail-door-top",
    type: "door",
    zone: "tail",
    side: "top-edge",
    label: "Exit door",
    description: "Aft service exit door (Port)",
  },
  {
    id: "tail-lavatory",
    type: "lavatory",
    zone: "tail",
    side: "top-half",
    label: "Lavatory",
    description: "Aft passenger lavatory",
  },
  {
    id: "tail-pantry",
    type: "pantry",
    zone: "tail",
    side: "bottom-half",
    label: "Pantry / galley",
    description: "Aft galley",
  },
  {
    id: "tail-door-bottom",
    type: "door",
    zone: "tail",
    side: "bottom-edge",
    label: "Exit door",
    description: "Aft service exit door (Starboard)",
  },

  // ── Bassinet Seat Indicator ──
  {
    id: "bassinet-row-1",
    type: "bassinet",
    zone: "aisle",
    side: "aisle",
    row: 1,
    label: "Bassinet seat",
    description: "Baby bassinet mounting point",
  },
];

/**
 * Resolves symbol template to concrete (x, y) coordinates for SVG rendering.
 *
 * @param {Object} geometry
 * @param {number} geometry.safeNose - Nose length
 * @param {number} geometry.safeFx - Top wing margin / top fuselage edge y
 * @param {number} geometry.safeHull - Fuselage hull height
 * @param {number} geometry.actualShownRowsHeight - Total horizontal length of seat rows
 * @param {Array<number>} geometry.rows - Sorted list of row numbers
 * @param {Set<number>} geometry.extraLegroomRows - Row numbers that are exit rows
 * @param {Set<number>} [geometry.bassinetRows] - Row numbers with bassinet seats (default row 1)
 * @param {number} [geometry.wingRootCenterX] - Precalculated wing root center X
 * @param {Array<Object>} [customConfig] - Optional override of template array
 * @returns {Array<Object>} Resolved symbols with { id, type, x, y, label, ariaLabel }
 */
export function resolveCabinSymbols(geometry, customConfig = null) {
  const {
    safeNose = 171.7,
    safeFx = 38.3,
    safeHull = 202,
    actualShownRowsHeight = 400,
    rows = [],
    extraLegroomRows = new Set(),
    bassinetRows = new Set([1]),
    wingRootCenterX = null,
  } = geometry;

  const symbolWidth = 15;
  const symbolHeight = 13;
  const halfW = symbolWidth / 2;
  const halfH = symbolHeight / 2;

  // Fuselage horizontal references (X axis)
  const windshieldCenterX = safeNose * 0.30;
  const row1StartX = safeNose + 10;
  const lastRowEndX = row1StartX + actualShownRowsHeight;
  const tailZoneStartX = lastRowEndX + 10;

  // Front zone X is centered between windshield and row 1
  const frontZoneMidX = (windshieldCenterX + row1StartX) / 2;

  // Tail zone X is positioned after the last row in the aft service space
  const tailZoneMidX = tailZoneStartX + 18;

  // Fuselage vertical references (Y axis across fuselage)
  const topEdgeY = safeFx;
  const bottomEdgeY = safeFx + safeHull;
  const cy = safeFx + safeHull / 2;
  const topHalfCenterY = safeFx + safeHull * 0.28;
  const bottomHalfCenterY = safeFx + safeHull * 0.72;

  // Calculate wing root center X
  let resolvedWingCenterX = wingRootCenterX;
  if (!resolvedWingCenterX) {
    if (extraLegroomRows && extraLegroomRows.size > 0 && rows.length > 0) {
      // Find row step
      const step = rows.length > 0 ? actualShownRowsHeight / rows.length : 24;
      const exitRowsList = Array.from(extraLegroomRows).sort((a, b) => a - b);
      const midExitRow = exitRowsList[Math.floor(exitRowsList.length / 2)];
      const idx = rows.indexOf(midExitRow);
      if (idx !== -1) {
        resolvedWingCenterX = row1StartX + (idx + 0.5) * step;
      }
    }
    if (!resolvedWingCenterX) {
      // Default to 35% along shown cabin
      resolvedWingCenterX = row1StartX + 0.35 * actualShownRowsHeight;
    }
  }

  // Row step for placing bassinet badges
  const rowStep = rows.length > 0 ? actualShownRowsHeight / rows.length : 24;

  const template = customConfig || DEFAULT_AIRCRAFT_CABIN_SYMBOLS_TEMPLATE;
  const resolvedList = [];

  template.forEach((item) => {
    let posX = 0;
    let posY = 0;

    switch (item.zone) {
      case "front":
        posX = frontZoneMidX;
        if (item.side === "top-edge") {
          posY = topEdgeY;
        } else if (item.side === "top-half") {
          posY = topHalfCenterY;
        } else if (item.side === "bottom-half") {
          posY = bottomHalfCenterY;
        } else if (item.side === "bottom-edge") {
          posY = bottomEdgeY;
        } else if (item.side === "outside-bottom") {
          // Stairs badge: just outside the bottom front door
          posY = bottomEdgeY + symbolHeight + 2;
        }
        resolvedList.push({
          ...item,
          x: Math.round((posX - halfW) * 10) / 10,
          y: Math.round((posY - halfH) * 10) / 10,
        });
        break;

      case "wing":
        posX = resolvedWingCenterX;
        if (item.side === "top-edge") {
          posY = topEdgeY;
        } else if (item.side === "bottom-edge") {
          posY = bottomEdgeY;
        }
        resolvedList.push({
          ...item,
          x: Math.round((posX - halfW) * 10) / 10,
          y: Math.round((posY - halfH) * 10) / 10,
        });
        break;

      case "tail":
        posX = tailZoneMidX;
        if (item.side === "top-edge") {
          posY = topEdgeY;
        } else if (item.side === "top-half") {
          posY = topHalfCenterY;
        } else if (item.side === "bottom-half") {
          posY = bottomHalfCenterY;
        } else if (item.side === "bottom-edge") {
          posY = bottomEdgeY;
        }
        resolvedList.push({
          ...item,
          x: Math.round((posX - halfW) * 10) / 10,
          y: Math.round((posY - halfH) * 10) / 10,
        });
        break;

      case "aisle":
      case "seat-row":
        // Bassinet badge in aisle beside row 1 (or any row flagged bassinet: true)
        const targetRow = item.row || 1;
        const rowIdx = rows.indexOf(targetRow);
        const rowCenterOffset = rowIdx >= 0 ? (rowIdx + 0.5) * rowStep : 0.5 * rowStep;
        posX = row1StartX + rowCenterOffset;
        posY = cy; // In aisle centerline
        resolvedList.push({
          ...item,
          x: Math.round((posX - halfW) * 10) / 10,
          y: Math.round((posY - halfH) * 10) / 10,
        });
        break;

      default:
        if (typeof item.x === "number" && typeof item.y === "number") {
          resolvedList.push(item);
        }
        break;
    }
  });

  // Check for any additional rows with bassinet: true not covered in base template
  if (bassinetRows && bassinetRows.size > 0) {
    bassinetRows.forEach((r) => {
      // If already added for this row, skip
      if (resolvedList.some((s) => s.type === "bassinet" && s.row === r)) return;
      const rIdx = rows.indexOf(r);
      if (rIdx >= 0) {
        const posX = row1StartX + (rIdx + 0.5) * rowStep;
        resolvedList.push({
          id: `bassinet-row-${r}`,
          type: "bassinet",
          zone: "aisle",
          side: "aisle",
          row: r,
          label: "Bassinet seat",
          description: `Baby bassinet mounting point for Row ${r}`,
          x: Math.round((posX - halfW) * 10) / 10,
          y: Math.round((cy - halfH) * 10) / 10,
        });
      }
    });
  }

  return resolvedList;
}

export default {
  DEFAULT_AIRCRAFT_CABIN_SYMBOLS_TEMPLATE,
  resolveCabinSymbols,
};
