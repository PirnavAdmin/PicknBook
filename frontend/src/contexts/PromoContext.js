/* eslint-disable */
import React, { createContext, useContext, useEffect, useState } from "react";

const PromoContext = createContext(null);

export function PromoProvider({ children }) {
  const [selectedOffer, setSelectedOfferState] = useState(null);

  useEffect(() => {
    try {
      sessionStorage.removeItem("selectedOffer");
    } catch {
      // Ignore storage errors in private mode or restricted environments.
    }
  }, []);

  const setSelectedOffer = (offer) => {
    setSelectedOfferState(offer || null);
  };

  const clearSelectedOffer = () => {
    setSelectedOfferState(null);
  };
  const selectedPromotionId = (() => {
    const promoId = selectedOffer?.promotionId ?? selectedOffer?.PromotionId;
    if (promoId !== undefined && promoId !== null && promoId !== "") {
      const parsed = Number(promoId);
      if (Number.isFinite(parsed)) return parsed;
    }
    const otherId = selectedOffer?.selectedFeaturedOfferId ?? selectedOffer?.id ?? selectedOffer?.offerId;
    if (otherId !== undefined && otherId !== null && otherId !== "") {
      const parsed = Number(otherId);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  })();

  const selectedFeaturedOfferId = selectedPromotionId;

  return (
    <PromoContext.Provider
      value={{
        selectedOffer,
        selectedFeaturedOfferId,
        selectedPromotionId,
        setSelectedOffer,
        clearSelectedOffer,
      }}
    >
      {children}
    </PromoContext.Provider>
  );
}

export function usePromo() {
  const context = useContext(PromoContext);
  if (!context) {
    throw new Error("usePromo must be used within a PromoProvider");
  }
  return context;
}
