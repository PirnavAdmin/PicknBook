import React from "react";
import {
  Baby,
  MoveVertical,
  Accessibility,
  Plug,
  DoorOpen,
  Utensils,
} from "lucide-react";

/**
 * 3-step stairs custom SVG icon matching CabinSymbol
 */
export const StairsIcon = ({
  size = 14,
  color = "#FFFFFF",
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="-6 -6 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M -4.5 4 L -1.5 4 L -1.5 1.5 L 1.5 1.5 L 1.5 -1.5 L 4.5 -1.5 L 4.5 -4"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SEAT_BADGE_META = {
  bassinet: {
    type: "bassinet",
    label: "Bassinet",
    ariaLabel: "Bassinet seat",
    bgColor: "#EC4899", // pink
    textColor: "#FFFFFF",
    icon: Baby,
    category: "seat",
  },
  extraLegroom: {
    type: "extraLegroom",
    label: "Extra legroom",
    ariaLabel: "Extra legroom seat",
    bgColor: "#8B5CF6", // purple
    textColor: "#FFFFFF",
    icon: MoveVertical,
    category: "seat",
  },
  wheelchair: {
    type: "wheelchair",
    label: "Accessible seat",
    ariaLabel: "Accessible seat",
    bgColor: "#10B981", // green
    textColor: "#FFFFFF",
    icon: Accessibility,
    category: "seat",
  },
  power: {
    type: "power",
    label: "Power outlet",
    ariaLabel: "Power outlet available",
    bgColor: "#6B7280", // gray
    textColor: "#FFFFFF",
    icon: Plug,
    category: "seat",
  },
};

export const CABIN_ELEMENT_META = {
  exitDoor: {
    type: "exitDoor",
    label: "Exit door",
    ariaLabel: "Emergency exit door",
    bgColor: "#FEE2E2", // light red
    textColor: "#DC2626",
    icon: DoorOpen,
    category: "cabin",
  },
  galley: {
    type: "galley",
    label: "Galley",
    ariaLabel: "Aircraft galley",
    bgColor: "#F59E0B", // amber
    textColor: "#FFFFFF",
    icon: Utensils,
    category: "cabin",
  },
  lavatory: {
    type: "lavatory",
    label: "Washroom",
    ariaLabel: "Washroom lavatory",
    bgColor: "#3B82F6", // blue
    textColor: "#FFFFFF",
    text: "WC",
    category: "cabin",
  },
  stairs: {
    type: "stairs",
    label: "Stairs",
    ariaLabel: "Stairs to upper deck",
    bgColor: "#6B7280", // gray
    textColor: "#FFFFFF",
    icon: StairsIcon,
    category: "cabin",
  },
};

export const ALL_SYMBOL_META = {
  ...SEAT_BADGE_META,
  ...CABIN_ELEMENT_META,
};

export function getSeatBadgeMeta(type) {
  return SEAT_BADGE_META[type];
}

export function getCabinElementMeta(type) {
  return CABIN_ELEMENT_META[type];
}

export function getSymbolMeta(type) {
  return ALL_SYMBOL_META[type];
}

export default ALL_SYMBOL_META;
