/* eslint-disable */
/**
 * Utility to dynamically extract, normalize, and format cancellation policy slabs
 * for Bus, Flight, and Hotel bookings from real API responses.
 *
 * ABSOLUTELY NO HARDCODED PERCENTAGES OR TIME SLABS.
 */

function formatHotelDate(dateStr) {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const time = hours !== "00" || mins !== "00" ? `, ${hours}:${mins}` : "";
    return `${day}-${month}-${year}${time}`;
  } catch {
    return String(dateStr);
  }
}

function calculateCutoffDate(departureTimeStr, hoursBefore) {
  if (!departureTimeStr || hoursBefore === undefined || hoursBefore === null) return null;
  try {
    const depDate = new Date(departureTimeStr);
    if (isNaN(depDate.getTime())) return null;
    const cutoffMs = depDate.getTime() - Number(hoursBefore) * 3600 * 1000;
    const cutoffDate = new Date(cutoffMs);
    const options = { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true };
    return cutoffDate.toLocaleDateString("en-IN", options);
  } catch {
    return null;
  }
}

/**
 * Parses RedBus colon-delimited string chunk (e.g. "0:12:100:0" or "12:24:50:0" or "24:-1:10:0")
 */
function parseRedBusColonSlab(str, departureTime) {
  const parts = str.split(":").map((s) => s.trim());
  if (parts.length < 3) return null;

  const fromHours = Number(parts[0]);
  const toHours = Number(parts[1]);
  const chargePct = Number(parts[2]);
  const flatFee = parts[3] ? Number(parts[3]) : 0;

  if (isNaN(fromHours) || isNaN(chargePct)) return null;

  let condition = "";
  let cutoffDate = null;

  if (toHours === -1 || toHours >= 999 || isNaN(toHours)) {
    condition = `More than ${fromHours} hours before departure`;
    if (departureTime) {
      const formattedCutoff = calculateCutoffDate(departureTime, fromHours);
      if (formattedCutoff) cutoffDate = `Before ${formattedCutoff}`;
    }
  } else if (fromHours === 0) {
    condition = `0 to ${toHours} hours before departure (Within ${toHours} hrs)`;
    if (departureTime) {
      const formattedCutoff = calculateCutoffDate(departureTime, toHours);
      if (formattedCutoff) cutoffDate = `After ${formattedCutoff}`;
    }
  } else {
    condition = `Between ${fromHours} to ${toHours} hours before departure`;
    if (departureTime) {
      const startCutoff = calculateCutoffDate(departureTime, toHours);
      const endCutoff = calculateCutoffDate(departureTime, fromHours);
      if (startCutoff && endCutoff) cutoffDate = `${startCutoff} – ${endCutoff}`;
    }
  }

  let charge = "";
  let refund = "";
  let chargeType = "partial";

  if (chargePct === 0) {
    charge = "0% (Free Cancellation)";
    refund = "100% Refund";
    chargeType = "free";
  } else if (chargePct === 100) {
    charge = "100% Charge (Non-refundable)";
    refund = "No Refund";
    chargeType = "non_refundable";
  } else {
    charge = `${chargePct}% Cancellation Charge`;
    refund = `${100 - chargePct}% Refund`;
    chargeType = "partial";
  }

  if (flatFee > 0) {
    charge += ` + ₹${flatFee} Flat Fee`;
  }

  return {
    condition,
    charge,
    refund,
    chargeType,
    chargePct,
    cutoffDate,
    fromHours,
    toHours,
    raw: str,
  };
}

function parseBusPolicy(booking, extraPolicyData) {
  let raw =
    booking?.cancellationPolicies ||
    booking?.CancellationPolicies ||
    booking?.cancellationPoliciesJson ||
    booking?.CancellationPoliciesJson ||
    booking?.cancellationPolicy ||
    booking?.CancellationPolicy ||
    booking?.cancellationPolicyDetails ||
    booking?.cancelPolicy ||
    booking?.policy ||
    booking?.policies ||
    booking?.tripDetails?.cancellationPolicies ||
    booking?.busDetails?.cancellationPolicies ||
    booking?.ticketDetails?.cancellationPolicies ||
    extraPolicyData?.cancellationPolicies ||
    extraPolicyData?.CancellationPolicies ||
    extraPolicyData?.cancellationPolicy ||
    extraPolicyData;

  const departureTime =
    booking?.departureTimeUtc ||
    booking?.departureTime ||
    booking?.departureTimeIst ||
    booking?.departureDateTimeUtc ||
    booking?.departureDateTime ||
    extraPolicyData?.departureTime;

  if (!raw) {
    return { available: false, message: "Cancellation policy is not available for this booking.", slabs: [] };
  }

  const parentPolicy =
    typeof raw === "object" && !Array.isArray(raw)
      ? raw
      : (booking?.cancellationPolicy || booking?.CancellationPolicy || extraPolicyData || null);

  // If raw is an object, check for nested policy arrays
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const nestedArray =
      raw?.policySlabs ||
      raw?.PolicySlabs ||
      raw?.slabs ||
      raw?.Slabs ||
      raw?.CancellationPolicies ||
      raw?.cancellationPolicies ||
      raw?.CancellationPolicy ||
      raw?.cancellationPolicy ||
      raw?.policy ||
      raw?.policies ||
      raw?.policyList ||
      raw?.policiesList ||
      raw?.rules ||
      raw?.Rules ||
      raw?.details ||
      raw?.Details ||
      raw?.cancellationRules ||
      raw?.CancellationRules ||
      raw?.data ||
      raw?.Data ||
      raw?.result ||
      raw?.Result;

    if (nestedArray) {
      raw = nestedArray;
    }
  }

  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === "object") {
        const nestedParsed =
          parsed.CancellationPolicies ||
          parsed.cancellationPolicies ||
          parsed.CancellationPolicy ||
          parsed.cancellationPolicy ||
          parsed.policy ||
          parsed.policies ||
          parsed.slabs ||
          parsed.rules;
        items = Array.isArray(nestedParsed) ? nestedParsed : [parsed];
      } else {
        items = [{ policyText: raw }];
      }
    } catch {
      // Check if it's RedBus colon-separated string: "0:12:100:0;12:24:50:0;24:-1:10:0"
      const parts = raw.split(/[\n;]/).map((s) => s.trim()).filter(Boolean);
      const isRedBusColon = parts.length > 0 && parts.every((p) => p.includes(":") && p.split(":").length >= 3);

      if (isRedBusColon) {
        items = parts.map((p) => {
          const sub = p.split(":").map((s) => s.trim());
          return {
            fromHours: Number(sub[0]),
            toHours: Number(sub[1]),
            percentage: Number(sub[2]),
            flatFee: sub[3] ? Number(sub[3]) : 0,
            policyString: p,
          };
        });
      } else {
        items = parts.map((part) => ({ policyText: part }));
      }
    }
  } else if (typeof raw === "object") {
    items = [raw];
  }

  if (!items || items.length === 0) {
    return { available: false, message: "Cancellation policy is not available for this booking.", slabs: [] };
  }

  const slabs = items
    .map((item, idx) => {
      if (typeof item === "string") {
        if (item.includes(":") && item.split(":").length >= 3) {
          const sub = item.split(":").map((s) => s.trim());
          item = {
            fromHours: Number(sub[0]),
            toHours: Number(sub[1]),
            percentage: Number(sub[2]),
            flatFee: sub[3] ? Number(sub[3]) : 0,
            policyString: item,
          };
        } else {
          item = { policyText: item };
        }
      }

      // Check if item itself is a colon-separated RedBus string in policyText / PolicyString
      const rawStringCandidate =
        item?.policyText || item?.PolicyText || item?.PolicyString || item?.policyString || "";
      if (
        typeof rawStringCandidate === "string" &&
        rawStringCandidate.includes(":") &&
        rawStringCandidate.split(":").length >= 3 &&
        item.fromHours === undefined &&
        item.percentage === undefined
      ) {
        const sub = rawStringCandidate.split(":").map((s) => s.trim());
        if (!isNaN(Number(sub[0])) && !isNaN(Number(sub[2]))) {
          item = {
            ...item,
            fromHours: Number(sub[0]),
            toHours: Number(sub[1]),
            percentage: Number(sub[2]),
            flatFee: sub[3] ? Number(sub[3]) : 0,
          };
        }
      }

      // ── 1. Condition Extraction ──
      let condition =
        item.policyText ||
        item.PolicyText ||
        item.displayText ||
        item.DisplayText ||
        item.PolicyString ||
        item.policyString ||
        item.cancellationTime ||
        item.CancellationTime ||
        item.timeCondition ||
        item.TimeCondition ||
        item.time ||
        item.Time ||
        item.duration ||
        item.Duration ||
        item.rule ||
        item.Rule ||
        item.cancellationRule ||
        item.CancellationRule ||
        item.details ||
        item.Details ||
        item.description ||
        item.Description ||
        item.title ||
        item.Title ||
        item.condition ||
        item.Condition ||
        item.text ||
        item.Text ||
        item.timeline ||
        item.Timeline ||
        item.window ||
        item.Window ||
        item.remarks ||
        item.Remarks;

      let fromHours =
        item.FromValue ??
        item.fromValue ??
        item.FromHours ??
        item.fromHours ??
        item.From ??
        item.from ??
        item.from_hours ??
        item.startHours;

      let toHours =
        item.ToValue ??
        item.toValue ??
        item.ToHours ??
        item.toHours ??
        item.To ??
        item.to ??
        item.to_hours ??
        item.endHours;

      if (item.hoursBeforeDeparture !== undefined && item.hoursBeforeDeparture !== null) {
        const hbd = Number(item.hoursBeforeDeparture);
        if (hbd === -1) {
          fromHours = 0;
          toHours = -1;
        } else {
          toHours = hbd;
        }
      }

      let cutoffDate = null;

      if (!condition || condition === `Condition ${idx + 1}` || condition === "Condition 1") {
        if (fromHours !== undefined && toHours !== undefined && fromHours !== null && toHours !== null) {
          const fromH = Number(fromHours);
          const toH = Number(toHours);
          if (toH === -1 || toH >= 999 || isNaN(toH)) {
            condition = fromH === 0 ? `Anytime before departure` : `More than ${fromH} hours before departure`;
            if (departureTime) {
              const formatted = calculateCutoffDate(departureTime, fromH);
              if (formatted) cutoffDate = `Before ${formatted}`;
            }
          } else if (fromH === 0) {
            condition = `0 to ${toH} hours before departure (Within ${toH} hrs)`;
            if (departureTime) {
              const formatted = calculateCutoffDate(departureTime, toH);
              if (formatted) cutoffDate = `After ${formatted}`;
            }
          } else {
            condition = `Between ${fromH} to ${toH} hours before departure`;
            if (departureTime) {
              const startCutoff = calculateCutoffDate(departureTime, toH);
              const endCutoff = calculateCutoffDate(departureTime, fromH);
              if (startCutoff && endCutoff) cutoffDate = `${startCutoff} – ${endCutoff}`;
            }
          }
        } else if (item.MinsBeforeDeparture !== undefined || item.minsBeforeDeparture !== undefined) {
          const mins = Number(item.MinsBeforeDeparture ?? item.minsBeforeDeparture);
          const hrs = Math.round(mins / 60);
          condition = `More than ${hrs} hours before departure (${mins} mins)`;
          if (departureTime) {
            const formatted = calculateCutoffDate(departureTime, hrs);
            if (formatted) cutoffDate = `Before ${formatted}`;
          }
        } else if (item.cutoffTime !== undefined || item.CutoffTime !== undefined) {
          const cutoff = Number(item.cutoffTime ?? item.CutoffTime);
          condition = `Within ${cutoff} hours before departure`;
        } else if (item.TimeBeforeDeparture !== undefined || item.timeBeforeDeparture !== undefined) {
          const t = Number(item.TimeBeforeDeparture ?? item.timeBeforeDeparture);
          condition = `${t} hours before departure`;
          if (departureTime) {
            const formatted = calculateCutoffDate(departureTime, t);
            if (formatted) cutoffDate = `Before ${formatted}`;
          }
        } else if (item.TimeAfterDeparture !== undefined || item.timeAfterDeparture !== undefined) {
          const t = Number(item.TimeAfterDeparture ?? item.timeAfterDeparture);
          condition = `${t} hours after departure`;
        } else if ((item.fromDate || item.FromDate) && (item.toDate || item.ToDate)) {
          condition = `From ${formatHotelDate(item.fromDate || item.FromDate)} to ${formatHotelDate(item.toDate || item.ToDate)}`;
        } else {
          condition = `Standard Operator Policy`;
        }
      } else {
        // Clean up text conditions that contain hours
        const matchBetween = condition.match(/between\s+(\d+)\s+(?:to|and)\s+(\d+)\s+hours/i);
        const matchBefore = condition.match(/(?:anytime\s+)?before\s+(\d+)\s+hours/i);
        const matchWithin = condition.match(/within\s+(\d+)\s+hours/i);

        if (matchBetween) {
          fromHours = Number(matchBetween[1]);
          toHours = Number(matchBetween[2]);
          condition = `Between ${fromHours} to ${toHours} hrs before departure`;
          if (departureTime) {
            const startCutoff = calculateCutoffDate(departureTime, toHours);
            const endCutoff = calculateCutoffDate(departureTime, fromHours);
            if (startCutoff && endCutoff) cutoffDate = `${startCutoff} – ${endCutoff}`;
          }
        } else if (matchBefore) {
          fromHours = Number(matchBefore[1]);
          if (fromHours === 0 || item.hoursBeforeDeparture === -1) {
            condition = `Anytime before departure`;
            if (departureTime) {
              const formatted = calculateCutoffDate(departureTime, 0);
              if (formatted) cutoffDate = `Before ${formatted}`;
            }
          } else {
            condition = `More than ${fromHours} hrs before departure`;
            if (departureTime) {
              const formatted = calculateCutoffDate(departureTime, fromHours);
              if (formatted) cutoffDate = `Before ${formatted}`;
            }
          }
        } else if (matchWithin) {
          toHours = Number(matchWithin[1]);
          condition = `Within ${toHours} hrs of departure`;
          if (departureTime) {
            const formatted = calculateCutoffDate(departureTime, toHours);
            if (formatted) cutoffDate = `After ${formatted}`;
          }
        }
      }

      // ── 2. Charge & Refund Extraction ──
      let charge = "";
      let refund = "";
      let chargeType = "partial";
      let chargePct = null;

      const estDeduction =
        item.estimatedDeduction !== undefined && item.estimatedDeduction !== null
          ? Number(item.estimatedDeduction)
          : null;
      const estRefund =
        item.estimatedRefund !== undefined && item.estimatedRefund !== null
          ? Number(item.estimatedRefund)
          : null;
      const isSlabActive = Boolean(item.isActive || item.IsActive);

      // Check Percentage properties
      const pctVal =
        item.CancellationChargePercentage ??
        item.cancellationChargePercentage ??
        item.ChargePercentage ??
        item.chargePercentage ??
        item.CancellationChargePercent ??
        item.cancellationChargePercent ??
        item.Percentage ??
        item.percentage ??
        item.Percent ??
        item.percent ??
        item.Pct ??
        item.pct ??
        item.DeductionPercentage ??
        item.deductionPercentage;

      if (pctVal !== undefined && pctVal !== null && !isNaN(Number(pctVal))) {
        chargePct = Number(pctVal);
      }

      // Check Refund percentage properties
      const refundVal =
        item.RefundPercentage ??
        item.refundPercentage ??
        item.RefundPercent ??
        item.refundPercent;

      if (chargePct === null && refundVal !== undefined && refundVal !== null && !isNaN(Number(refundVal))) {
        chargePct = 100 - Number(refundVal);
      }

      // Check Flat charge properties
      const flatVal =
        item.CancellationCharge ??
        item.cancellationCharge ??
        item.Charge ??
        item.charge ??
        item.CancellationFee ??
        item.cancellationFee ??
        item.Fee ??
        item.fee ??
        item.Deduction ??
        item.deduction ??
        item.Penalty ??
        item.penalty ??
        item.Amount ??
        item.amount;

      if (chargePct === null && flatVal !== undefined && flatVal !== null) {
        const strFlat = String(flatVal).trim();
        if (strFlat.includes("%")) {
          chargePct = parseFloat(strFlat);
        } else if (!isNaN(Number(strFlat))) {
          const num = Number(strFlat);
          const isPercentage =
            String(item.CancellationChargeType || item.chargeType || "").toLowerCase() === "percentage" ||
            (num <= 100 && !item.Currency && !item.currency);

          if (isPercentage) {
            chargePct = num;
          } else {
            charge = `₹${num.toLocaleString("en-IN")} Flat Fee`;
            refund = "Balance Refunded";
            chargeType = "fee";
          }
        } else {
          charge = strFlat;
          chargeType = strFlat.toLowerCase().includes("free") ? "free" : "partial";
        }
      }

      // Fallback extraction from condition text
      if (chargePct === null && !charge && condition) {
        const feeMatch =
          condition.match(/(?:fee|charge|deduction) (?:is|=)?\s*(\d+)%/i) ||
          condition.match(/(\d+)%\s*(?:fee|charge|deduction)/i);
        const refundMatch = condition.match(/(\d+)%\s*refund/i);

        if (feeMatch) {
          chargePct = parseInt(feeMatch[1], 10);
        } else if (refundMatch) {
          chargePct = 100 - parseInt(refundMatch[1], 10);
        } else if (/free cancellation|no charge/i.test(condition)) {
          chargePct = 0;
        } else if (/non[- ]refundable|no refund/i.test(condition)) {
          chargePct = 100;
        }
      }

      const totalPaidRef = Number(
        parentPolicy?.totalCustomerPaid || booking?.customerFareInr || booking?.totalPriceInr || 0
      );
      const computedFee =
        estDeduction !== null && estDeduction > 0
          ? estDeduction
          : totalPaidRef > 0 && chargePct !== null
          ? (totalPaidRef * chargePct) / 100
          : null;
      const computedRefund =
        estRefund !== null && estRefund > 0
          ? estRefund
          : totalPaidRef > 0 && chargePct !== null
          ? Math.max(0, totalPaidRef - (totalPaidRef * chargePct) / 100)
          : null;

      if (chargePct !== null) {
        if (chargePct === 0) {
          charge = "0% (Free Cancellation)";
          refund = computedRefund !== null && computedRefund > 0 ? `₹${computedRefund.toFixed(2)} (100%)` : "100% Refund";
          chargeType = "free";
        } else if (chargePct === 100) {
          charge = computedFee !== null && computedFee > 0 ? `100% (₹${computedFee.toFixed(2)} Fee)` : "100% Fee";
          refund = "₹0.00 (No Refund)";
          chargeType = "non_refundable";
        } else {
          charge = computedFee !== null && computedFee > 0 ? `${chargePct}% (₹${computedFee.toFixed(2)} Fee)` : `${chargePct}% Fee`;
          refund = computedRefund !== null && computedRefund > 0 ? `₹${computedRefund.toFixed(2)} (${100 - chargePct}%)` : `${100 - chargePct}% Refund`;
          chargeType = "partial";
        }
      }

      if (!charge) {
        charge = "Standard Operator Terms";
        refund = "As per policy";
        chargeType = "standard";
      }

      return {
        condition,
        charge,
        refund,
        chargeType,
        chargePct,
        cutoffDate,
        fromHours: fromHours !== undefined ? Number(fromHours) : null,
        toHours: toHours !== undefined ? Number(toHours) : null,
        estimatedDeduction: estDeduction,
        estimatedRefund: estRefund,
        isActive: isSlabActive,
        raw: item,
      };
    })
    .filter(Boolean);

  // Sort slabs chronologically (from furthest before departure to closest/after departure)
  slabs.sort((a, b) => {
    const aFrom = a.fromHours !== null ? a.fromHours : 999;
    const bFrom = b.fromHours !== null ? b.fromHours : 999;
    return bFrom - aFrom;
  });

  // Calculate hoursUntilDeparture if not provided
  let hoursUntilDep =
    parentPolicy?.hoursUntilDeparture !== undefined && parentPolicy?.hoursUntilDeparture !== null
      ? Number(parentPolicy.hoursUntilDeparture)
      : null;

  if (hoursUntilDep === null && departureTime) {
    try {
      const depDate = new Date(departureTime);
      if (!isNaN(depDate.getTime())) {
        const diffMs = depDate.getTime() - Date.now();
        hoursUntilDep = Math.max(0, Math.round((diffMs / 3600000) * 10) / 10);
      }
    } catch {
      // ignore
    }
  }

  // Determine active slab among the slabs
  let activeSlab = slabs.find((s) => s.isActive);

  if (!activeSlab && slabs.length > 0) {
    if (slabs.length === 1) {
      slabs[0].isActive = true;
      activeSlab = slabs[0];
    } else if (hoursUntilDep !== null) {
      activeSlab = slabs.find((s) => {
        if (s.fromHours !== null && s.toHours !== null) {
          if (s.toHours === -1 || s.toHours >= 999) {
            return hoursUntilDep >= s.fromHours;
          }
          if (s.fromHours === 0) {
            return hoursUntilDep >= 0 && hoursUntilDep <= s.toHours;
          }
          return hoursUntilDep >= s.fromHours && hoursUntilDep < s.toHours;
        }
        return false;
      });

      // If hoursUntilDep is smaller than all slabs, mark the closest slab to departure (the last slab)
      if (!activeSlab) {
        activeSlab = slabs[slabs.length - 1];
      }

      if (activeSlab) {
        activeSlab.isActive = true;
      }
    } else {
      slabs[0].isActive = true;
      activeSlab = slabs[0];
    }
  }

  const hasFreeCancellation = slabs.some((s) => s.chargeType === "free");
  const allNonRefundable = slabs.length > 0 && slabs.every((s) => s.chargeType === "non_refundable");

  const totalPaidVal =
    parentPolicy?.totalCustomerPaid !== undefined && parentPolicy?.totalCustomerPaid !== null
      ? Number(parentPolicy.totalCustomerPaid)
      : Number(booking?.customerFareInr || booking?.totalPriceInr || 0);

  const fallbackFee =
    activeSlab && activeSlab.chargePct !== null && totalPaidVal > 0
      ? (totalPaidVal * activeSlab.chargePct) / 100
      : null;

  const fallbackRefund =
    fallbackFee !== null
      ? Math.max(0, totalPaidVal - fallbackFee)
      : null;

  const finalEstFee =
    parentPolicy?.estimatedCancellationCharge !== undefined && parentPolicy?.estimatedCancellationCharge !== null
      ? Number(parentPolicy.estimatedCancellationCharge)
      : booking?.cancellationChargeInr !== null && booking?.cancellationChargeInr !== undefined
      ? Number(booking.cancellationChargeInr)
      : fallbackFee;

  const finalEstRefund =
    parentPolicy?.estimatedRefundAmount !== undefined && parentPolicy?.estimatedRefundAmount !== null
      ? Number(parentPolicy.estimatedRefundAmount)
      : fallbackRefund !== null
      ? fallbackRefund
      : finalEstFee !== null && totalPaidVal > 0
      ? Math.max(0, totalPaidVal - finalEstFee)
      : null;

  const isCurrentlyNonRefundable = Boolean(
    parentPolicy?.isNonRefundable ||
    allNonRefundable ||
    (activeSlab && (activeSlab.chargePct === 100 || activeSlab.chargeType === "non_refundable"))
  );

  let summaryText = null;
  if (hasFreeCancellation) {
    summaryText = "Free cancellation is available for this booking within the specified timeline.";
  } else if (allNonRefundable || isCurrentlyNonRefundable) {
    summaryText = "This booking is non-refundable as per the operator cancellation policy.";
  } else if (booking?.partialCancellationAllowed) {
    summaryText = "Partial ticket cancellation is supported for individual passengers.";
  }

  return {
    available: slabs.length > 0,
    slabs,
    hasFreeCancellation,
    allNonRefundable: isCurrentlyNonRefundable,
    summaryText,
    totalPaid: totalPaidVal,
    estimatedCancellationCharge: finalEstFee,
    estimatedRefundAmount: finalEstRefund,
    isNonRefundable: isCurrentlyNonRefundable,
    activePolicyDescription: parentPolicy?.activePolicyDescription || activeSlab?.condition || null,
    hoursUntilDeparture: hoursUntilDep,
    breakdown: parentPolicy?.breakdown || null,
    passengerEstimates: Array.isArray(parentPolicy?.passengerEstimates) ? parentPolicy.passengerEstimates : [],
    cancellationAudit: booking?.cancellationAudit || null,
    canCancel: parentPolicy?.canCancel ?? booking?.canCancel ?? true,
    cannotCancelReason: parentPolicy?.cannotCancelReason ?? booking?.cannotCancelReason ?? null,
  };
}

function parseFlightPolicy(booking, extraPolicyData) {
  const miniRules =
    extraPolicyData?.miniFareRules ||
    extraPolicyData?.MiniFareRules ||
    booking?.miniFareRules ||
    booking?.MiniFareRules;

  const fareRules =
    extraPolicyData?.results ||
    extraPolicyData?.Results ||
    extraPolicyData?.FareRules ||
    booking?.fareRules ||
    booking?.FareRules;

  const rawPolicy =
    booking?.cancellationPolicy ||
    booking?.CancellationPolicy ||
    booking?.cancellationPolicies ||
    booking?.CancellationPolicies ||
    extraPolicyData?.cancellationPolicy ||
    extraPolicyData?.CancellationPolicy;

  const cancellationCharge =
    extraPolicyData?.CancellationCharge ??
    extraPolicyData?.cancellationCharge ??
    extraPolicyData?.RefundDetails?.CancellationCharge ??
    booking?.cancellationCharge ??
    booking?.cancellationChargeInr;

  const refundAmount =
    extraPolicyData?.RefundAmount ??
    extraPolicyData?.refundAmount ??
    extraPolicyData?.RefundDetails?.RefundAmount ??
    booking?.refundAmountInr ??
    booking?.refundAmount;

  if (Array.isArray(miniRules) && miniRules.length > 0) {
    const slabs = miniRules.map((m, idx) => {
      const routeStr = m.JourneyPoints || m.journeyPoints ? `${m.JourneyPoints || m.journeyPoints}: ` : "";
      const condStr =
        m.Details ||
        m.details ||
        m.PolicyString ||
        m.type ||
        m.Type ||
        (m.From !== undefined ? `Between ${m.From} and ${m.To} ${m.Unit || "hours"} before departure` : `Rule ${idx + 1}`);
      const amtStr =
        m.Amount !== undefined && m.Amount !== null
          ? String(m.Amount).includes("%") || String(m.Amount).includes("INR")
            ? String(m.Amount)
            : `INR ${m.Amount}`
          : m.CancellationCharge !== undefined
          ? `INR ${m.CancellationCharge}`
          : "As per airline fare rule";

      return {
        condition: `${routeStr}${condStr}`,
        charge: amtStr,
        refund: "Balance Refunded",
        chargeType: amtStr.includes("0") ? "free" : "partial",
        raw: m,
      };
    });
    return { available: true, slabs };
  }

  if (cancellationCharge !== undefined && cancellationCharge !== null && Number(cancellationCharge) >= 0) {
    const slabs = [
      {
        condition: "Airline Cancellation Charge",
        charge: `INR ${Number(cancellationCharge).toLocaleString("en-IN")}`,
        refund: refundAmount ? `INR ${Number(refundAmount).toLocaleString("en-IN")}` : "Balance Refunded",
        chargeType: "partial",
      },
    ];
    if (refundAmount !== undefined && refundAmount !== null && Number(refundAmount) > 0) {
      slabs.push({
        condition: "Estimated Refund Balance",
        charge: `INR ${Number(refundAmount).toLocaleString("en-IN")}`,
        refund: "Processed to account",
        chargeType: "free",
      });
    }
    return { available: true, slabs, summaryText: "Cancellation charges returned directly by airline supplier." };
  }

  if (Array.isArray(fareRules) && fareRules.length > 0) {
    const slabs = fareRules.map((f, idx) => {
      const text = typeof f === "string" ? f : f.FareRuleDetail || f.FareRules || f.rule || JSON.stringify(f);
      const cleanText = String(text).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      return {
        condition: f.Category || f.category || `Airline Fare Rule ${idx + 1}`,
        charge: cleanText.length > 130 ? cleanText.slice(0, 130) + "..." : cleanText,
        fullText: cleanText,
        chargeType: "standard",
        raw: f,
      };
    });
    return { available: true, slabs };
  }

  if (rawPolicy) {
    if (Array.isArray(rawPolicy)) {
      const slabs = rawPolicy.map((p, idx) => ({
        condition: p.condition || p.policyText || p.PolicyString || `Rule ${idx + 1}`,
        charge: p.charge || p.CancellationCharge || p.cancellationCharge || "As per policy",
        chargeType: "standard",
      }));
      return { available: true, slabs };
    }
    if (typeof rawPolicy === "string") {
      const parts = rawPolicy.split(/[\n;]/).map((s) => s.trim()).filter(Boolean);
      const slabs = parts.map((part, idx) => {
        if (part.includes(":") || part.includes("=")) {
          const [c, ch] = part.split(/[:=]/);
          return { condition: c.trim(), charge: ch.trim(), chargeType: "standard" };
        }
        return { condition: `Airline Policy ${idx + 1}`, charge: part, chargeType: "standard" };
      });
      return { available: true, slabs };
    }
  }

  return { available: false, message: "Cancellation policy is not available for this booking.", slabs: [] };
}

function parseHotelPolicy(booking, extraPolicyData) {
  let raw =
    booking?.cancellationPolicies ||
    booking?.CancellationPolicies ||
    booking?.cancellationPoliciesData ||
    extraPolicyData?.cancellationPolicies ||
    extraPolicyData?.CancellationPolicies;

  const rawJson =
    booking?.cancellationPolicyJson ||
    booking?.CancellationPolicyJson ||
    extraPolicyData?.cancellationPolicyJson ||
    extraPolicyData?.CancellationPolicyJson ||
    extraPolicyData?.cancellationPolicy;

  if (!raw && typeof rawJson === "string" && rawJson.trim().startsWith("[")) {
    try {
      raw = JSON.parse(rawJson);
    } catch {
      // ignore
    }
  }

  const singlePolicyStr =
    booking?.cancellationPolicy ||
    booking?.CancellationPolicy ||
    booking?.hotelPolicy ||
    booking?.HotelPolicy ||
    booking?.cancellationDetails ||
    booking?.cancelPolicy ||
    booking?.note;

  if (Array.isArray(raw) && raw.length > 0) {
    const slabs = raw.map((item, idx) => {
      let condition = item.policyText || item.PolicyText || item.condition;
      const fromDate = item.fromDate || item.FromDate;
      const toDate = item.toDate || item.ToDate;
      const deadline = item.cancellationDeadline || item.CancellationDeadline;

      if (!condition) {
        if (fromDate && toDate) {
          condition = `From ${formatHotelDate(fromDate)} to ${formatHotelDate(toDate)}`;
        } else if (deadline) {
          condition = `Cancellation before ${formatHotelDate(deadline)}`;
        } else if (fromDate) {
          condition = `Cancellation after ${formatHotelDate(fromDate)}`;
        } else {
          condition = `Stay Policy Window ${idx + 1}`;
        }
      }

      let charge = "As per policy";
      let refund = "As per policy";
      let chargeType = "partial";

      const rawCharge = item.charge !== undefined && item.charge !== null ? item.charge : item.Charge;
      const rawChargeType = item.chargeType !== undefined && item.chargeType !== null ? item.chargeType : item.ChargeType;

      if (rawCharge !== undefined && rawCharge !== null) {
        const numCharge = Number(rawCharge);
        if (numCharge === 0) {
          charge = "No Charge (Free Cancellation)";
          refund = "100% Refund";
          chargeType = "free";
        } else {
          const isPercent = Number(rawChargeType) === 1 || String(rawChargeType || "").toLowerCase() === "percentage" || numCharge <= 100;
          charge = isPercent ? `${numCharge}% Charge` : `INR ${numCharge.toLocaleString("en-IN")} Charge`;
          refund = isPercent ? `${Math.max(0, 100 - numCharge)}% Refund` : "Balance Refunded";
          chargeType = isPercent && numCharge >= 100 ? "non_refundable" : "partial";
        }
      } else if (item.refundPercentage !== undefined && item.refundPercentage !== null) {
        charge = `${100 - Number(item.refundPercentage)}% Charge`;
        refund = `${item.refundPercentage}% Refund`;
        chargeType = Number(item.refundPercentage) === 100 ? "free" : "partial";
      } else if (item.CancellationCharge !== undefined) {
        charge = `INR ${Number(item.CancellationCharge).toLocaleString("en-IN")} Charge`;
        chargeType = "partial";
      }

      return { condition, charge, refund, chargeType, raw: item };
    });

    return { available: true, slabs };
  }

  if (singlePolicyStr && typeof singlePolicyStr === "string" && singlePolicyStr.trim()) {
    const str = singlePolicyStr.trim();

    const freeMatch = str.match(/free cancellation (?:until|before)\s*([^,.\n]+)/i);
    if (freeMatch) {
      const deadline = freeMatch[1].trim();
      return {
        available: true,
        slabs: [
          { condition: `Cancellation before ${deadline}`, charge: "No Charge (Free Cancellation)", refund: "100% Refund", chargeType: "free" },
          { condition: `Cancellation after ${deadline}`, charge: "100% Charge (Non-refundable)", refund: "No Refund", chargeType: "non_refundable" },
        ],
        summaryText: `Free cancellation allowed until ${deadline}.`,
      };
    }

    if (/non-refundable|non refundable/i.test(str)) {
      return {
        available: true,
        slabs: [
          { condition: "Cancellation at any time after booking", charge: "100% Charge (Non-refundable)", refund: "No Refund", chargeType: "non_refundable" },
        ],
        summaryText: "This room reservation is non-refundable as per hotel policy.",
      };
    }

    const parts = str.split(/[\n;]/).map((s) => s.trim()).filter(Boolean);
    const slabs = parts.map((part, idx) => {
      if (part.includes(":") || part.includes("=")) {
        const [c, ch] = part.split(/[:=]/);
        return { condition: c.trim(), charge: ch.trim(), chargeType: "standard" };
      }
      return { condition: `Hotel Term ${idx + 1}`, charge: part, chargeType: "standard" };
    });

    return { available: true, slabs, summaryText: null };
  }

  return { available: false, message: "Cancellation policy is not available for this booking.", slabs: [] };
}

export function parseCancellationPolicyData(booking, bookingType, extraPolicyData = null) {
  if (!booking && !extraPolicyData) {
    return {
      available: false,
      message: "Cancellation policy is not available for this booking.",
      slabs: [],
      summaryText: null,
    };
  }

  const normalizedType = String(
    bookingType || booking?.bookingType || booking?.ticketType || booking?.type || ""
  ).toLowerCase();

  if (normalizedType.includes("bus")) {
    return parseBusPolicy(booking, extraPolicyData);
  }

  if (normalizedType.includes("flight") || normalizedType.includes("plane")) {
    return parseFlightPolicy(booking, extraPolicyData);
  }

  if (normalizedType.includes("hotel") || normalizedType.includes("stay")) {
    return parseHotelPolicy(booking, extraPolicyData);
  }

  // Fallback checks
  const busRes = parseBusPolicy(booking, extraPolicyData);
  if (busRes.available) return busRes;

  const flightRes = parseFlightPolicy(booking, extraPolicyData);
  if (flightRes.available) return flightRes;

  const hotelRes = parseHotelPolicy(booking, extraPolicyData);
  if (hotelRes.available) return hotelRes;

  return {
    available: false,
    message: "Cancellation policy is not available for this booking.",
    slabs: [],
    summaryText: null,
  };
}
