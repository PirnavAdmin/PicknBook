import React, { useState, useEffect, useMemo } from 'react';
import { BedDouble, ChevronDown, Loader2, Info } from 'lucide-react';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function RoomCategoryAccordion({
  offers,
  images,
  gallery,
  selectedOffer,
  selectingOfferId,
  onSelectOffer,
  roomsCount
}) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [mealPlanFilter, setMealPlanFilter] = useState("Any");
  const [refundableOnly, setRefundableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("Recommended");
  const [openPolicyIndex, setOpenPolicyIndex] = useState(null);

  // Group and filter logic
  const processedCategories = useMemo(() => {
    if (!offers || offers.length === 0) return [];

    const grouped = offers.reduce((acc, roomOffer, index) => {
      const category = roomOffer.roomCategory ? roomOffer.roomCategory.replace(/_/g, " ") : "Standard Room";
      if (!acc[category]) acc[category] = [];
      acc[category].push({ offer: roomOffer, originalIndex: index });
      return acc;
    }, {});

    let categories = Object.entries(grouped).map(([categoryName, options]) => {
      // Apply filters to the nested options
      const filteredOptions = options.filter(({ offer: roomOffer }) => {
        // Refundable filter
        const isNonRefundable = roomOffer.cancellationPolicy?.includes("Charge");
        if (refundableOnly && isNonRefundable) return false;

        // Meal plan filter
        const mealPlan = (Array.isArray(roomOffer.servicesStatus) && roomOffer.servicesStatus.find(s => s.name === "Meal Basis")?.value) || roomOffer.hotelSupplements;
        const isBreakfastIncluded = mealPlan && mealPlan.toLowerCase() !== "room only";
        
        if (mealPlanFilter === "Breakfast Included" && !isBreakfastIncluded) return false;
        if (mealPlanFilter === "Room Only" && isBreakfastIncluded) return false;

        return true;
      });

      if (filteredOptions.length === 0) return null; // Hide category if no matching options

      const lowestPrice = Math.min(...filteredOptions.map(opt => opt.offer.price));
      
      const firstIndex = options[0].originalIndex; // Original index for image mapping
      const roomImg = images && images.length > 0 
        ? images[firstIndex % images.length] 
        : gallery[firstIndex % gallery.length];

      return {
        categoryName,
        options: filteredOptions,
        lowestPrice,
        roomImg,
        firstOption: options[0].offer // Use original first option for shared details like description/amenities
      };
    }).filter(Boolean);

    // Apply sorting
    if (sortBy === "PriceLowHigh") {
      categories.sort((a, b) => a.lowestPrice - b.lowestPrice);
    }

    return categories;
  }, [offers, mealPlanFilter, refundableOnly, sortBy, images, gallery]);

  // Auto-expand logic on initial load or filter change
  useEffect(() => {
    if (processedCategories.length > 0) {
      // Find category with lowest price
      let lowestCategory = processedCategories[0];
      for (const cat of processedCategories) {
        if (cat.lowestPrice < lowestCategory.lowestPrice) {
          lowestCategory = cat;
        }
      }
      setExpandedCategories(new Set([lowestCategory.categoryName]));
    } else {
      setExpandedCategories(new Set());
    }
  }, [offers, mealPlanFilter, refundableOnly]); // Only run when base data or filters change significantly

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const selectedRoomKey = selectedOffer?.selectionKey || selectedOffer?.offerId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Filter Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--hotel-muted)", fontWeight: 500 }}>Meal Plan:</label>
          <select 
            value={mealPlanFilter} 
            onChange={e => setMealPlanFilter(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem", background: "#fff", cursor: "pointer" }}
          >
            <option value="Any">Any</option>
            <option value="Breakfast Included">Breakfast Included</option>
            <option value="Room Only">Room Only</option>
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--hotel-ink)", cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={refundableOnly} 
            onChange={e => setRefundableOnly(e.target.checked)} 
            style={{ width: "14px", height: "14px", cursor: "pointer" }}
          />
          Refundable Only
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--hotel-muted)", fontWeight: 500 }}>Sort:</label>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem", background: "#fff", cursor: "pointer" }}
          >
            <option value="Recommended">Recommended</option>
            <option value="PriceLowHigh">Price (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Accordion List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {processedCategories.length > 0 ? (
          processedCategories.map((cat) => {
            const isExpanded = expandedCategories.has(cat.categoryName);
            const isGroupSelected = cat.options.some(opt => (opt.offer.selectionKey || opt.offer.offerId) === selectedRoomKey);

            return (
              <div 
                key={cat.categoryName}
                style={{ 
                  display: "flex", 
                  flexDirection: "column",
                  border: isGroupSelected ? "2px solid #ff0000" : "1px solid rgba(0,0,0,0.06)", 
                  borderRadius: "16px", 
                  background: isGroupSelected ? "rgba(220,30,38,0.02)" : "#fff",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.01)",
                  transition: "all 0.2s ease",
                  overflow: "hidden"
                }}
              >
                {/* Header (Always Visible) */}
                <div 
                  onClick={() => toggleCategory(cat.categoryName)}
                  style={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: "14px", 
                    padding: "12px 14px",
                    borderBottom: isExpanded ? "1px solid rgba(0,0,0,0.04)" : "none",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                >
                  <div style={{ width: "60px", height: "48px", borderRadius: "8px", overflow: "hidden", flexShrink: 0 }}>
                    <img src={cat.roomImg} alt={cat.categoryName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 600, color: "var(--hotel-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cat.categoryName}
                    </h4>
                    {cat.firstOption.amenities && cat.firstOption.amenities.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                         {cat.firstOption.amenities.slice(0, 3).map(a => typeof a === "object" ? (a.name || a.Name) : a).filter(Boolean).map((amenity, i) => (
                           <span key={i} style={{ background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: "6px", color: "var(--hotel-ink)", fontSize: "9px" }}>{amenity}</span>
                         ))}
                         {cat.firstOption.amenities.length > 3 && <span style={{ background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: "6px", color: "var(--hotel-ink)", fontSize: "9px" }}>+{cat.firstOption.amenities.length - 3} more</span>}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "block", fontSize: "9px", color: "var(--hotel-muted)" }}>From</span>
                      <strong style={{ fontSize: "14px", color: "var(--hotel-ink)", fontWeight: 600 }}>{formatCurrency(cat.lowestPrice)}</strong>
                    </div>
                    <ChevronDown 
                      size={20} 
                      color="var(--hotel-muted)" 
                      style={{ 
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease"
                      }} 
                    />
                  </div>
                </div>

                {/* Body (Rate Options) - Conditionally Rendered */}
                {isExpanded && (
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column",
                    paddingLeft: "14px",
                    borderLeft: "3px solid var(--hotel-rose, #ff0000)"
                  }}>
                    {cat.options.map((option, index) => {
                      const roomOffer = option.offer;
                      const roomSelectionKey = roomOffer.selectionKey || roomOffer.offerId;
                      const isSelectingThis = selectingOfferId === roomSelectionKey;
                      const isSelected = Boolean(selectedOffer && selectedRoomKey === roomSelectionKey);
                      
                      const mealPlan = (Array.isArray(roomOffer.servicesStatus) && roomOffer.servicesStatus.find(s => s.name === "Meal Basis")?.value) || roomOffer.hotelSupplements;
                      const isIncluded = mealPlan && mealPlan.toLowerCase() !== "room only";
                      
                      return (
                        <div key={roomSelectionKey} style={{
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: index < cat.options.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                          background: isSelected ? "rgba(220,30,38,0.04)" : "transparent",
                          transition: "background 0.2s ease",
                          flexWrap: "wrap",
                          gap: "12px"
                        }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                            <span style={{ fontSize: "0.74rem", color: "var(--hotel-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <BedDouble size={14} /> {roomOffer.bedType || "Bed type not specified"}
                            </span>
                            
                            <span 
                              style={{ 
                                fontSize: "0.68rem", 
                                fontWeight: 600, 
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                background: roomOffer.cancellationPolicy?.includes("Charge") ? "#ffebee" : "#e8f5e9", 
                                color: roomOffer.cancellationPolicy?.includes("Charge") ? "#d32f2f" : "#2e7d32",
                                cursor: roomOffer.cancellationPolicy?.includes("Charge") ? "default" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                border: roomOffer.cancellationPolicy?.includes("Charge") ? "1px solid #ffcdd2" : "1px solid #c8e6c9"
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!roomOffer.cancellationPolicy?.includes("Charge")) {
                                  setOpenPolicyIndex(openPolicyIndex === option.originalIndex ? null : option.originalIndex);
                                }
                              }}
                              title={roomOffer.cancellationPolicy?.includes("Charge") ? "This room is strictly non-refundable." : "View cancellation policy details"}
                            >
                              {roomOffer.cancellationPolicy?.includes("Charge") ? "Non-Refundable" : "Free Cancellation"}
                              {!roomOffer.cancellationPolicy?.includes("Charge") && <Info size={13} style={{ opacity: 0.9 }} />}
                            </span>
                            
                            {mealPlan && (
                              <span style={{ 
                                fontSize: "0.68rem", 
                                fontWeight: 600, 
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                background: isIncluded ? "#fff8e1" : "#f1f5f9", 
                                color: isIncluded ? "#f57f17" : "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}>
                                🍽️ {mealPlan}
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ textAlign: "right" }}>
                              <strong style={{ display: "block", fontSize: "1.05rem", color: "var(--hotel-ink)" }}>{formatCurrency(roomOffer.price)}</strong>
                              <span style={{ fontSize: "0.7rem", color: "var(--hotel-muted)" }}>
                                {roomsCount > 1 ? `total for ${roomsCount} Rooms` : "total per night"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onSelectOffer(roomOffer); 
                              }}
                              disabled={selectingOfferId !== ""}
                              style={{
                                minWidth: "120px",
                                height: "36px",
                                borderRadius: "8px",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                background: isSelected ? "var(--hotel-rose, #ff0000)" : "#ff0000",
                                color: "#fff",
                                border: "none",
                                transition: "all 0.15s ease"
                              }}
                            >
                              {isSelectingThis ? (
                                <>
                                  <Loader2 size={11} className="hotel-spin" />
                                  {" "}Choosing...
                                </>
                              ) : isSelected ? (
                                "Selected ✓"
                              ) : (
                                "Reserve Room"
                              )}
                            </button>
                          </div>

                          {openPolicyIndex === option.originalIndex && !roomOffer.cancellationPolicy?.includes("Charge") && (roomOffer.cancellationPolicies?.length > 0 || roomOffer.CancellationPolicies?.length > 0) && (
                            <div style={{ marginTop: "12px", padding: "10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", width: "100%" }}>
                              <h5 style={{ margin: "0 0 6px 0", fontSize: "0.75rem", fontWeight: 600, color: "var(--hotel-ink)" }}>Cancellation Policies</h5>
                              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.7rem", color: "var(--hotel-muted)" }}>
                                {(roomOffer.cancellationPolicies || roomOffer.CancellationPolicies).map((policy, pIdx) => {
                                  const isPercent = policy.ChargeType === 2 || policy.chargeType === 2 || String(policy.ChargeType).toLowerCase() === "percentage";
                                  const chargeValue = policy.Charge || policy.charge;
                                  return (
                                    <li key={pIdx} style={{ marginBottom: "4px", lineHeight: "1.3" }}>
                                      Charge of <strong>{!isPercent ? "₹" : ""}{chargeValue}{isPercent ? "%" : ""}</strong> from <strong>{new Date(policy.FromDate || policy.fromDate).toLocaleDateString()}</strong> to <strong>{new Date(policy.ToDate || policy.toDate).toLocaleDateString()}</strong>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--hotel-muted)", background: "#fff", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.06)" }}>
            <p>No rooms match the selected filters. Please adjust your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
