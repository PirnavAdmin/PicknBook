import AircraftSeatMap, {
  ChairSeat,
  GalleyIcon,
  EmergencyExit,
} from "../seatmap/AircraftSeatMap";

import {
  PALETTES,
  getTierSeatColors,
  getTierBaseColor,
  NON_PRICE_COLORS,
} from "../seatmap/palettes";

export const AirlinerBackgroundSVG = AircraftSeatMap;
export const LineIcon = GalleyIcon;
export const EmergencyExitBadge = EmergencyExit;

export {
  ChairSeat,
  GalleyIcon,
  EmergencyExit,
  PALETTES,
  getTierSeatColors,
  getTierBaseColor,
  NON_PRICE_COLORS,
};

export * from "../seatmap/seatMeta";
export { SymbolBadge } from "../seatmap/SymbolBadge";
export { SymbolLayer } from "../seatmap/SymbolLayer";

export default AircraftSeatMap;
