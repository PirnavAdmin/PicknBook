
// Extracted payload builders
function buildFlightBookingPayload(flowState) {
  const selectedSeats = Array.isArray(flowState.selectedSeats) ? flowState.selectedSeats : [];
  const selectedMeal = flowState.selectedMeal || null;
  const selectedBaggage = flowState.selectedBaggage || null;
  const flight = flowState.flight || {};

  // Normalize a seat object to the exact schema SRDV TicketLCC requires.
  // The C# backend model deserializes FlightNumber, AirlineCode, Origin, Destination.
  // If any are missing/empty, SRDV throws "Invalid seat ssr data".
  const selectedLegs = Array.isArray(flowState.selectedLegs) && flowState.selectedLegs.length > 0
    ? flowState.selectedLegs
    : [flowState.flight, flowState.returnFlight].filter(Boolean);

  const normalizeSeatForPayload = (s, legHint) => {
    if (!s || typeof s !== 'object') return null;
    const code = String(s.Code || s.code || s.SeatNumber || s.seatNumber || "").trim();
    if (!code) return null; // Drop seats with no Code — they are from generated fallback layouts
    const airlineCode = String(s.AirlineCode || s.airlineCode || legHint?.airlineCode || legHint?.AirlineCode || legHint?.airline || flight.airlineCode || flight.airline || "6E").trim();
    const flightNum = String(s.AirlineNumber || s.FlightNumber || s.flightNumber || s.airlineNumber || legHint?.flightNumber || legHint?.FlightNumber || flight.flightNumber || "").replace(/\D/g, "") || (flight.flightNumber || "101");
    const origin = String(s.Origin || s.origin || legHint?.sourceCode || legHint?.fromCity || legHint?.origin || flight.sourceCode || flight.fromCity || "DEL").toUpperCase().trim();
    const destination = String(s.Destination || s.destination || legHint?.destinationCode || legHint?.toCity || legHint?.destination || flight.destinationCode || flight.toCity || "BOM").toUpperCase().trim();
    return {
      ...s,
      Code: code,
      SeatNumber: String(s.SeatNumber || s.seatNumber || code).trim(),
      AirlineCode: airlineCode,
      FlightNumber: flightNum,
      AirlineNumber: flightNum,
      Origin: origin,
      Destination: destination,
      Amount: Number(s.Amount ?? s.amount ?? 0),
      IsBooked: true,
      IsAisle: Boolean(s.IsAisle ?? s.isAisle ?? false),
      IsLegroom: Boolean(s.IsLegroom ?? s.isLegroom ?? false),
    };
  };

  const passengers = mapPassengersForApi((flowState.passengers || []).map((passenger, index) => {
    // Normalize seatDynamic — drop any seat without a valid Code (fallback/generated layout seats)
    const rawSeatDynamic = Array.isArray(passenger.seatDynamic) ? passenger.seatDynamic : [];
    const normalizedSeatDynamic = rawSeatDynamic
      .map((s, legIdx) => normalizeSeatForPayload(s, selectedLegs[legIdx]))
      .filter(Boolean);

    // Also try the legacy selectedSeats[index].code path
    const legacySeatCode = passenger.seatCode || selectedSeats[index]?.code || "";

    return {
      ...passenger,
      seatCode: legacySeatCode,
      seatDynamic: normalizedSeatDynamic,
      baggage: passenger.baggageDynamic || passenger.baggage || (selectedBaggage ? [selectedBaggage] : []),
      mealDynamic: passenger.mealDynamic || (selectedMeal ? [selectedMeal] : []),
    };
  }));

  const rawClass =
    flowState.flight?.selectedTravelClass ||
    flowState.flight?.className ||
    flowState.searchContext?.cabinClass ||
    "Economy";

  const adults = (flowState.passengers || []).filter(p => p.passengerType === "Adult").length;
  const children = (flowState.passengers || []).filter(p => p.passengerType === "Child").length;
  const infants = (flowState.passengers || []).filter(p => p.passengerType === "Infant").length;

  return {
    flight: {
      ...(flowState.flight || {}),
      passengerPhone: String(flowState.contact?.mobile || "").trim(),
      passengerEmail: String(flowState.contact?.email || "").trim(),
      contactPhone: String(flowState.contact?.mobile || "").trim(),
      contactEmail: String(flowState.contact?.email || "").trim(),
      contact: flowState.contact || {},
    },
    passengerName: passengers[0]?.fullName || "Passenger",
    passengerPhone: String(flowState.contact?.mobile || "").trim(),
    passengerEmail: String(flowState.contact?.email || "").trim(),
    travelClass: resolveCleanTravelClass(rawClass),
    passengers,
    couponCode: flowState.couponCode ? flowState.couponCode.trim().toUpperCase() : null,
    selectedFeaturedOfferId: flowState.selectedFeaturedOfferId || null,
    selectedPromotionId: flowState.selectedFeaturedOfferId || null,
    adults: adults || 1,
    children: children || 0,
    infants: infants || 0,
    isMultiCity: Boolean(flowState.isMultiCity),
    selectedLegs: selectedLegs,
    contact: flowState.contact || {},
  };
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
            BaseFare: Number(selectedSeats[index]?.srdvBaseFare !== undefined ? selectedSeats[index]?.srdvBaseFare : (selectedSeats[index]?.fare || selectedSeats[index]?.baseFare || 0)),
            SeatType: String(selectedSeats[index]?.seatType || selectedSeats[index]?.kind || "Seater"),
            ExternalGst: Number(selectedSeats[index]?.srdvTax !== undefined ? selectedSeats[index]?.srdvTax : (selectedSeats[index]?.tax || 0))
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
      .filter(Boolean),
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
    fromCity: String(flowState.bus?.fromCity || flowState.searchContext?.fromCity?.name || flowState.searchContext?.fromCity || ""),
    toCity: String(flowState.bus?.toCity || flowState.searchContext?.toCity?.name || flowState.searchContext?.toCity || ""),
    departureTime: [flowState.searchContext?.departureDate, flowState.bus?.departureTimeUtc || flowState.bus?.departureTimeIst || flowState.bus?.departureTime || ""].filter(Boolean).join(" "),
    arrivalTime: String(flowState.bus?.arrivalTimeUtc || flowState.bus?.arrivalTimeIst || flowState.bus?.arrivalTime || ""),
    operatorName: String(flowState.bus?.operatorName || ""),
    busType: String(flowState.bus?.busType || ""),
    isIdProofRequired: Boolean(flowState.bus?.idProofRequired || flowState.bus?.IdProofRequired || flowState.bus?.isIdProofRequired || flowState.bus?.IsIdProofRequired),
    totalFare: Number(flowState.bus?.priceInr || flowState.bus?.displayFare || flowState.bus?.fare || 0),
    BoardingPointId: flowState.boardingPoint?.id ? String(flowState.boardingPoint.id) : null,
    boardingPointName: String(flowState.boardingPoint?.name || flowState.boardingPointName || ""),
    boardingPointTime: null,
    DroppingPointId: flowState.droppingPoint?.id ? String(flowState.droppingPoint.id) : null,
    droppingPointName: String(flowState.droppingPoint?.name || flowState.droppingPointName || ""),
    droppingPointTime: null,
  };
}


export { buildFlightBookingPayload, buildBookingPayload };
