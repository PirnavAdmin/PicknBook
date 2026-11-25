import React from "react";
import { ALL_SYMBOL_META, BadgeMeta, SeatBadgeType, CabinElementType } from "./seatMeta";

export interface SymbolBadgeProps {
  type: SeatBadgeType | CabinElementType | string;
  size?: number;
  cx?: number;
  cy?: number;
  isSvg?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
}

export const SymbolBadge: React.FC<SymbolBadgeProps> = ({
  type,
  size,
  cx = 0,
  cy = 0,
  isSvg = true,
  ariaLabel,
  className = "",
  style = {},
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const meta: BadgeMeta | undefined = ALL_SYMBOL_META[type];
  if (!meta) return null;

  const defaultSize = meta.category === "seat" ? 14 : 22;
  const actualSize = size ?? defaultSize;
  const radius = actualSize / 2;
  const iconSize = Math.max(8, Math.round(actualSize * 0.58));
  const effectiveAriaLabel = ariaLabel || meta.ariaLabel || meta.label;

  if (isSvg) {
    const IconComponent = meta.icon;

    return (
      <g
        className={`symbol-badge symbol-badge-${type} ${className}`}
        transform={`translate(${cx}, ${cy})`}
        role="img"
        aria-label={effectiveAriaLabel}
        style={{
          pointerEvents: onClick || onMouseEnter ? "auto" : "none",
          ...style,
        }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <title>{effectiveAriaLabel}</title>
        {/* Background circle badge */}
        <circle
          cx={0}
          cy={0}
          r={radius}
          fill={meta.bgColor}
          stroke={type === "exitDoor" ? "#F87171" : "#FFFFFF"}
          strokeWidth={1.2}
        />

        {/* Text for Lavatory (WC) */}
        {meta.text ? (
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fill={meta.textColor}
            fontSize={Math.round(actualSize * 0.46)}
            fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
            style={{ userSelect: "none" }}
          >
            {meta.text}
          </text>
        ) : IconComponent ? (
          <g transform={`translate(${-iconSize / 2}, ${-iconSize / 2})`}>
            <IconComponent size={iconSize} color={meta.textColor} strokeWidth={2.2} />
          </g>
        ) : null}
      </g>
    );
  }

  // HTML version for Legend / UI
  const IconComponent = meta.icon;

  return (
    <span
      className={`symbol-badge-html symbol-badge-${type} ${className}`}
      role="img"
      aria-label={effectiveAriaLabel}
      title={effectiveAriaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${actualSize}px`,
        height: `${actualSize}px`,
        borderRadius: "50%",
        backgroundColor: meta.bgColor,
        color: meta.textColor,
        border: type === "exitDoor" ? "1.2px solid #F87171" : "1.2px solid #FFFFFF",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
        flexShrink: 0,
        userSelect: "none",
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {meta.text ? (
        <span
          style={{
            fontSize: `${Math.round(actualSize * 0.46)}px`,
            fontWeight: "700",
            lineHeight: 1,
          }}
        >
          {meta.text}
        </span>
      ) : IconComponent ? (
        <IconComponent size={iconSize} color={meta.textColor} strokeWidth={2.2} />
      ) : null}
    </span>
  );
};

export default SymbolBadge;
