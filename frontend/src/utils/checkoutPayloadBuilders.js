import { mapPassengersForApi } from "../services/flightBookingService.js";
import { flightIdentity, supplierBoolean, passengerFare } from "./flightContract.js";

// Extracted payload builders
function buildFlightBookingPayload(flowState) {
  const flight = flowState.flight || {};
  const identity = flightIdentity({ flight,
    traceId: flowState.traceId ?? flight.traceId,
    resultIndex: flowState.resultIndex ?? flowState.ResultIndex ?? flight.resultIndex });
  const quote = flowState.fareQuote;
  if (!quote?.success || quote.identity?.TraceId !== identity.TraceId || quote.identity?.ResultIndex !== identity.ResultIndex) {
    throw new Error("A matching fare quote is required. Return to traveller details and refresh the fare.");
  }
  const isLcc = supplierBoolean(quote.results.IsLCC ?? flight.isLCC ?? flight.isLcc);
  if (isLcc !== true) throw new Error("This flight supplier supports TicketLCC booking only.");
  const rawPassengers = flowState.passengers || [];
  if (!rawPassengers.length) throw new Error("Passenger details are required.");
  const passengers = mapPassengersForApi(rawPassengers.map(p => {
    const paxType = p.PaxType ?? (p.passengerType === "Child" ? 2 : p.passengerType === "Infant" ? 3 : 1);
    return { ...p, PaxType: paxType, Fare: passengerFare(quote, paxType, rawPassengers),
      dob: String(p.dob || "").replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1"),
      contactNo: flowState.contact?.mobile, email: flowState.contact?.email,
      ...Object.fromEntries(Object.entries(flowState.gstInfo || {}).filter(([key]) => key.startsWith("GST"))) };
  }), null, null, flight);
  const sum = (key, priceKey) => passengers.reduce((total, p) => total + (p[key] || []).reduce((n, item) => n + Number(item[priceKey] ?? 0) * Number(item.Quantity ?? 1), 0), 0);
  return {
    ...identity, IsLCC: isLcc,
    ...(flight.RefID || flight.refId ? { RefID: String(flight.RefID || flight.refId) } : {}),
    ...(flight.Module || flight.module ? { Module: String(flight.Module || flight.module) } : {}),
    JourneyType: flowState.isMultiCity ? 3 : flowState.isTwoWay ? 2 : 1,
    Passengers: passengers, Fare: { ...quote.fare,
      TotalSeatCharges: sum("Seat", "Amount"), TotalMealCharges: sum("MealDynamic", "Price"),
      TotalBaggageCharges: sum("Baggage", "Price") },
    Segments: quote.results.Segments,
    CouponCode: flowState.couponCode || null,
  };
}

export function prepareFlightBookingPayload(flowState) {
  return buildFlightBookingPayload(flowState);
}


function buildBookingPayload(flowState) {
  const firstPassenger = flowState.passengers?.[0] || {};
  const mobile = String(flowState.contact?.mobile || "").trim();

  const selectedSeats = Array.isArray(flowState.selectedSeats)
    ? flowState.selectedSeats
    : [];

  const fallbackPassengers = selectedSeats.map((seat, index) => {
    const seatNumber = String(seat?.label || "").trim();

    return {
      fullName: `Passenger ${index + 1}`,
      FullName: `Passenger ${index + 1}`,
      age: 25,
      Age: 25,
      gender: flowState.selectedSeatPassengers?.[seatNumber] || "Male",
      Gender: flowState.selectedSeatPassengers?.[seatNumber] || "Male",
      ...(seatNumber ? { seatNumber, SeatNumber: seatNumber } : {}),
      BaseFare: Number(seat?.srdvBaseFare !== undefined ? seat?.srdvBaseFare : (seat?.fare || seat?.baseFare || 0)),
      SeatType: String(seat?.seatType || seat?.kind || "Seater"),
      ExternalGst: Number(seat?.srdvTax !== undefined ? seat?.srdvTax : (seat?.tax || 0))
    };
  });

  const normalizedPassengers =
    Array.isArray(flowState.passengers) && flowState.passengers.length > 0
      ? flowState.passengers.map((passenger, index) => {
          const fullName = `${passenger.title || ""} ${
            passenger.firstName || ""
          } ${passenger.lastName || ""}`
            .replace(/\s+/g, " ")
            .trim();

          const rawSeat =
            selectedSeats[index]?.label || passenger.seatLabel || "";
          const seatNumber = String(rawSeat).trim();

          const normalizedTitle = String(passenger.title || "").toLowerCase();
          const passengerGender = String(passenger.gender || "").trim();

          const ageNumber = Number(passenger.age ?? passenger.Age);

          return {
            fullName: fullName || `Passenger ${index + 1}`,
            FullName: fullName || `Passenger ${index + 1}`,
            age: Number.isFinite(ageNumber) && ageNumber > 0 ? ageNumber : 25,
            Age: Number.isFinite(ageNumber) && ageNumber > 0 ? ageNumber : 25,
            gender:
              passengerGender ||
              (normalizedTitle === "mr" ? "Male" : "Female"),
            Gender:
              passengerGender ||
              (normalizedTitle === "mr" ? "Male" : "Female"),
            ...(seatNumber ? { seatNumber, SeatNumber: seatNumber } : {}),
            BaseFare: Number(
              selectedSeats[index]?.supplierBaseFare ??
              selectedSeats[index]?.srdvBaseFare ??
              selectedSeats[index]?.Price?.BaseFare ??
              (selectedSeats[index]?.b2cDisplayFare && selectedSeats[index]?.markupAmount
                ? Number(selectedSeats[index].b2cDisplayFare) - Number(selectedSeats[index].markupAmount)
                : null) ??
              selectedSeats[index]?.baseFare ??
              0
            ),
            SeatType: String(selectedSeats[index]?.seatType || selectedSeats[index]?.kind || "Seater"),
            ExternalGst: Number(
              selectedSeats[index]?.externalGst ??
              selectedSeats[index]?.srdvTax ??
              selectedSeats[index]?.tax ??
              selectedSeats[index]?.Price?.Tax ??
              selectedSeats[index]?.Price?.GSTAmount ??
              0
            ),
            ...(passenger.idNumber ? {
              idType: String(passenger.idType || "Aadhar"),
              idNumber: String(passenger.idNumber).replace(/\D/g, "")
            } : {})
          };
        })
      : fallbackPassengers;

  return {
    passengerName: `${firstPassenger.title || ""} ${
      firstPassenger.firstName || ""
    } ${firstPassenger.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim(),
    passengerPhone: mobile,
    passengerEmail: String(flowState.contact?.email || "").trim(),
    couponCode: (() => {
      const pId =
        flowState.selectedFeaturedOfferId ??
        flowState.promotionId ??
        flowState.selectedOffer?.promotionId ??
        flowState.selectedOffer?.offerId;
      const hasPromo = pId !== undefined && pId !== null && pId !== "";
      return hasPromo ? null : (flowState.couponCode || null);
    })(),
    promotionId: null,
    selectedFeaturedOfferId: (() => {
      const pId =
        flowState.selectedFeaturedOfferId ??
        flowState.promotionId ??
        flowState.selectedOffer?.promotionId ??
        flowState.selectedOffer?.offerId;
      if (pId !== undefined && pId !== null && pId !== "") {
        const numericId = Number(pId);
        return Number.isNaN(numericId) ? null : numericId;
      }
      return null;
    })(),
    seats: normalizedPassengers.length,
    seatCodes: selectedSeats
      .map((seat) => seat.label || seat.seatCode || seat)
      .map((seatCode) => String(seatCode || "").trim())
      .filter((code) => {
        if (!code) return false;
        const nonSeat = /^(T|WC|D|DR|NA|EX|ST|B|BLANK|EMPTY)$|EXIT|AISLE|DRIVER|TOILET|WATER|STAIRCASE|STAIR|WASHROOM|VACANT|\bNA\b/i;
        return !nonSeat.test(code);
      }),
    passengerWhatsapp: String(
      flowState.contact?.whatsappNumber || flowState.contact?.mobile || ""
    ).trim(),
    sendEmailUpdates: Boolean(flowState.contact?.email),
    sendSmsUpdates: Boolean(flowState.contact?.mobile),
    sendWhatsappUpdates: Boolean(flowState.contact?.whatsappUpdates),
    passengers: normalizedPassengers,
    routeId: String(flowState.bus?.routeId || ""),
    traceId: String(flowState.bus?.traceId || ""),
    resultIndex: String(flowState.bus?.resultIndex || flowState.bus?.id || ""),
    srdvIndex: Number(flowState.bus?.srdvIndex || 0),
    srdvBlockKey: String(flowState.blockKey || ""),
    BlockKey: String(flowState.blockKey || ""),
    fromCity: String(flowState.bus?.fromCity || flowState.searchContext?.fromCity?.name || flowState.searchContext?.fromCity || ""),
    toCity: String(flowState.bus?.toCity || flowState.searchContext?.toCity?.name || flowState.searchContext?.toCity || ""),
    departureTime: [flowState.searchContext?.departureDate, flowState.bus?.departureTimeUtc || flowState.bus?.departureTimeIst || flowState.bus?.departureTime || ""].filter(Boolean).join(" "),
    arrivalTime: String(flowState.bus?.arrivalTimeUtc || flowState.bus?.arrivalTimeIst || flowState.bus?.arrivalTime || ""),
    operatorName: String(flowState.bus?.operatorName || ""),
    busType: String(flowState.bus?.busType || ""),
    isIdProofRequired: true,
    totalFare: Number(
      flowState.pricingPreview?.finalAmount ||
      flowState.pricingPreview?.grandTotal ||
      flowState.fareSummary?.grandTotal ||
      flowState.fareSummary?.totalFare ||
      flowState.payableAmount ||
      flowState.bus?.priceInr ||
      flowState.bus?.displayFare ||
      flowState.bus?.fare ||
      0
    ),
    BoardingPointId: flowState.boardingPoint?.id ? String(flowState.boardingPoint.id) : null,
    boardingPointName: String(flowState.boardingPoint?.name || flowState.boardingPointName || ""),
    boardingPointTime: null,
    DroppingPointId: flowState.droppingPoint?.id ? String(flowState.droppingPoint.id) : null,
    droppingPointName: String(flowState.droppingPoint?.name || flowState.droppingPointName || ""),
    droppingPointTime: null,
  };
}

export { buildFlightBookingPayload, buildBookingPayload };
