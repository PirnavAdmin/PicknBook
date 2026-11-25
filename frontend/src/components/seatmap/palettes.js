/**
 * src/components/seatmap/palettes.js
 *
 * Color palettes and color math for the API-driven aircraft seat map.
 * Supports "spectrum" (default), "heat", "coolwarm", "ocean", "safe", and "brand".
 * Supports seat fill modes "tinted" (default) and "solid".
 */

export const PALETTES = {
  spectrum: ["#1D9E75", "#378ADD", "#7F77DD", "#D4537E", "#E8A200", "#D85A30"],
  heat:     ["#F2C230", "#F29A1F", "#E3641F", "#C23B22", "#8E1B1B", "#521010"],
  coolwarm: ["#4FB8A3", "#4C9BE8", "#8B7FE0", "#F08E6B", "#E0483E", "#9C2B5F"],
  ocean:    ["#7FD4E8", "#3AA6D8", "#2379C0", "#1B4F9C", "#142F73", "#0B1A4A"],
  safe:     ["#56B4E9", "#009E73", "#F0E442", "#E69F00", "#D55E00", "#CC79A7"],
  brand:    ["#1D9E75", "#3C5BD6", "#7F77DD", "#E8A200", "#D62828", "#2C2C2A"],
};

export function mixWithWhite(hex, pctWhite) {
  if (!hex || typeof hex !== "string") return "#FFFFFF";
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned, 16);
  if (Number.isNaN(num)) return "#FFFFFF";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const w = pctWhite / 100;
  const c = 1 - w;
  const nr = Math.min(255, Math.max(0, Math.round(r * c + 255 * w)));
  const ng = Math.min(255, Math.max(0, Math.round(g * c + 255 * w)));
  const nb = Math.min(255, Math.max(0, Math.round(b * c + 255 * w)));
  return `#${[nr, ng, nb].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function darkenColor(hex, pctDarken) {
  if (!hex || typeof hex !== "string") return "#000000";
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned.length === 3 ? cleaned.split("").map((c) => c + c).join("") : cleaned, 16);
  if (Number.isNaN(num)) return "#000000";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const factor = 1 - pctDarken / 100;
  const nr = Math.min(255, Math.max(0, Math.round(r * factor)));
  const ng = Math.min(255, Math.max(0, Math.round(g * factor)));
  const nb = Math.min(255, Math.max(0, Math.round(b * factor)));
  return `#${[nr, ng, nb].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function getTierBaseColor(rankIndex, paletteName = "spectrum") {
  const pal = PALETTES[paletteName] || PALETTES.spectrum;
  const idx = Math.min(Math.max(0, rankIndex), pal.length - 1);
  return pal[idx];
}

export function getTierSeatColors(rankIndex, paletteName = "spectrum", seatFill = "tinted") {
  const baseColor = getTierBaseColor(rankIndex, paletteName);
  if (seatFill === "solid") {
    return {
      fill: mixWithWhite(baseColor, 10),
      stroke: darkenColor(baseColor, 25),
      chairBar: "#FFFFFF",
      baseColor,
    };
  }
  // Default: tinted
  return {
    fill: mixWithWhite(baseColor, 78),
    stroke: baseColor,
    chairBar: baseColor,
    baseColor,
  };
}

export const NON_PRICE_COLORS = {
  free: {
    fill: "#FFFFFF",
    stroke: "#44546A",
    chairBar: "#44546A",
  },
  booked: {
    fill: "#E3E8F2",
    stroke: "#CBD3E3",
    chairBar: "#CBD3E3",
  },
  selected: {
    fill: "#111827",
    stroke: "#111827",
    chairBar: "#FFFFFF",
  },
  filterHighlightRing: {
    fill: "none",
    stroke: "transparent",
    strokeWidth: 0,
  },
};

export default PALETTES;
