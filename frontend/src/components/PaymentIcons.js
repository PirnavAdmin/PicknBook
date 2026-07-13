import React, { useState, useEffect, useRef } from "react";

// UPI Icon with gradient / active styling
export const UpiIcon = ({ size = 24, active = false }) => {
  if (active) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
        <path d="M13 6L9 12h3l-1 6 4-6h-3z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="phoneGrad" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="boltGrad" x1="9" y1="6" x2="15" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="5" y="2" width="14" height="20" rx="3" fill="url(#phoneGrad)" />
      <rect x="6.5" y="3.5" width="11" height="14.5" rx="1.5" fill="#FFFFFF" />
      <circle cx="12" cy="19.8" r="0.8" fill="#FFFFFF" opacity="0.9" />
      <path d="M13.5 6L9 11.5h3L11 16.5L15.5 11h-3L13.5 6Z" fill="url(#boltGrad)" />
    </svg>
  );
};

// Credit/Debit Card Icon with gradient / active styling
export const CardIcon = ({ size = 24, active = false }) => {
  if (active) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="9.5" x2="22" y2="9.5" />
        <rect x="5" y="13.5" width="3" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="18.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardGrad" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3D7EFC" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="chipGrad" x1="5" y1="12" x2="9" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="2" y="5" width="20" height="14" rx="2.5" fill="url(#cardGrad)" />
      <rect x="2" y="8" width="20" height="2.5" fill="#111827" opacity="0.3" />
      <rect x="5" y="12.5" width="4.2" height="3" rx="0.5" fill="url(#chipGrad)" />
      <line x1="7.1" y1="12.5" x2="7.1" y2="15.5" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.6" />
      <line x1="5" y1="14" x2="9.2" y2="14" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.6" />
      <circle cx="15" cy="14" r="2.2" fill="#EF4444" />
      <circle cx="17.8" cy="14" r="2.2" fill="#FBBF24" opacity="0.8" />
    </svg>
  );
};

// Net Banking (Landmark) Icon with gradient / active styling
export const NetBankingIcon = ({ size = 24, active = false }) => {
  if (active) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 10h18M3 6l9-3 9 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bankGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
        <linearGradient id="goldCoin" x1="10" y1="11.5" x2="14" y2="15.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      <path d="M12 3L3 8H21L12 3Z" fill="url(#bankGrad)" />
      <rect x="4.5" y="8" width="15" height="1.5" fill="url(#bankGrad)" />
      <rect x="5.5" y="9.5" width="2" height="9" fill="url(#bankGrad)" opacity="0.9" />
      <rect x="11" y="9.5" width="2" height="9" fill="url(#bankGrad)" opacity="0.9" />
      <rect x="16.5" y="9.5" width="2" height="9" fill="url(#bankGrad)" opacity="0.9" />
      <rect x="3" y="18.5" width="18" height="2.5" fill="url(#bankGrad)" />
      <circle cx="12" cy="13.5" r="2" fill="url(#goldCoin)" />
      <path d="M12 12v3M10.5 13.5h3" stroke="#FFFFFF" strokeWidth="0.5" />
    </svg>
  );
};

// Wallet Icon with gradient / active styling
export const WalletIcon = ({ size = 24, active = false }) => {
  if (active) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6Z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="walletGrad" x1="2" y1="6" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
        <linearGradient id="cashGrad" x1="7" y1="3" x2="17" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="7.5" y="3.5" width="9" height="5.5" rx="0.8" fill="url(#cashGrad)" />
      <circle cx="12" cy="6.2" r="1.2" fill="#FFFFFF" opacity="0.3" />
      <rect x="2" y="8" width="20" height="12" rx="2" fill="url(#walletGrad)" />
      <path d="M2 8H16.5C17.6 8 18.5 8.9 18.5 10V18C18.5 19.1 17.6 20 16.5 20H2V8Z" fill="url(#walletGrad)" />
      <line x1="2" y1="13" x2="16.5" y2="13" stroke="#7C2D12" strokeWidth="0.8" opacity="0.3" />
      <path d="M15.5 11H20.5C21.3 11 22 11.7 22 12.5V15.5C22 16.3 21.3 17 20.5 17H15.5V11Z" fill="#7C2D12" opacity="0.8" />
      <circle cx="19" cy="14" r="2" fill="#E5E7EB" />
      <circle cx="19" cy="14" r="1" fill="#9CA3AF" />
    </svg>
  );
};

// Paytm Icon
export const PaytmIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="paytmGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#002E6E" />
        <stop offset="100%" stopColor="#00B9F5" />
      </linearGradient>
    </defs>
    <rect width="24" height="24" rx="5" fill="url(#paytmGrad)" />
    <path d="M5.5 6.5H10C12 6.5 13.5 8 13.5 10C13.5 12 12 13.5 10 13.5H7.5V17.5H5.5V6.5ZM7.5 8.3V11.7H10C10.9 11.7 11.5 11 11.5 10C11.5 9 10.9 8.3 10 8.3H7.5Z" fill="#FFFFFF" />
    <rect x="13.5" y="11" width="6.5" height="6.5" rx="1.5" fill="#FFFFFF" />
    <text x="16.8" y="16" fill="#00B9F5" fontSize="4.8" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" textAnchor="middle">tm</text>
  </svg>
);

// PhonePe Icon
export const PhonePeIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#5F259F" />
    <rect x="7" y="5.5" width="7" height="11" rx="1.5" fill="#FFFFFF" transform="rotate(-12 7 5.5)" />
    <rect x="11.5" y="6.5" width="7" height="11" rx="1.5" fill="#FFFFFF" opacity="0.9" />
    <circle cx="15" cy="12" r="1.8" fill="#5F259F" />
    <path d="M15 10.7V13.3" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
    <path d="M13.7 12H16.3" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
  </svg>
);

// Amazon Pay Icon
export const AmazonPayIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#131921" />
    <path d="M9.5 13.2C9.5 14.1 10.1 14.6 11 14.6C12.2 14.6 13.1 13.5 13.1 12.3C13.1 11.6 12.6 11.1 11.7 11.1C10.3 11.1 9.5 11.8 9.5 13.2ZM13.1 14.4C12.6 14.8 11.9 15.1 11 15.1C9.4 15.1 8.2 14.1 8.2 12.5C8.2 10.8 9.4 9.8 11.6 9.8C12.2 9.8 12.7 10 13.1 10.3V9.6C13.1 8.7 12.5 8.1 11.6 8.1C10.7 8.1 10.1 8.5 9.9 9.1H8.5C8.7 7.9 9.8 7.1 11.6 7.1C13.5 7.1 14.6 8.1 14.6 10V14.5H13.1V14.4Z" fill="#FFFFFF" />
    <path d="M7 16C9 17.5 12 18 15 16.3" stroke="#FF9900" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M15 16.3L13.8 15.5C13.8 15.5 14.5 15.7 15 16.3Z" fill="#FF9900" />
    <path d="M15 16.3L14.5 15" stroke="#FF9900" strokeWidth="0.8" />
  </svg>
);

// MobiKwik Icon
export const MobiKwikIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#0053C0" />
    <path d="M6 12L12 6L14 8L10 12L14 16L12 18L6 12Z" fill="#FFFFFF" />
    <path d="M11 12L17 6L19 8L15 12L19 16L17 18L11 12Z" fill="#FFFFFF" opacity="0.85" />
  </svg>
);

// Custom Wallet Select Dropdown
export const CustomWalletSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          minHeight: "40px",
          padding: "0 12px",
          background: "#ffffff",
          border: "1px solid #c4d2e4",
          borderRadius: "9px",
          color: "#223b5b",
          fontSize: "0.81rem",
          fontWeight: "600",
          cursor: "pointer",
          textAlign: "left",
          boxSizing: "border-box"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <selectedOption.icon size={20} />}
              <span>{selectedOption.label}</span>
            </>
          ) : (
            <span style={{ color: "#94a3b8" }}>Choose wallet</span>
          )}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "none",
            color: "#64748b"
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 10000,
            background: "#ffffff",
            border: "1px solid #c4d2e4",
            borderRadius: "9px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
            maxHeight: "220px",
            overflowY: "auto",
            padding: "4px 0"
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 12px",
                background: opt.id === value ? "#f1f5f9" : "transparent",
                border: "none",
                color: "#223b5b",
                fontSize: "0.81rem",
                fontWeight: opt.id === value ? "700" : "500",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => {
                if (opt.id !== value) e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                if (opt.id !== value) e.currentTarget.style.background = "transparent";
              }}
            >
              {opt.icon && <opt.icon size={20} />}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
