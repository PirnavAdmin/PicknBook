// Supplier identifiers are opaque. Never manufacture them from UI IDs or airline names.
export function supplierBoolean(value) {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
}

export function flightIdentity(params = {}) {
  const flight = params.flight || {};
  const read = (camel, pascal) => String(params[camel] ?? params[pascal] ?? flight[camel] ?? flight[pascal] ?? "").trim();
  const identity = {
    TraceId: read("traceId", "TraceId"),
    ResultIndex: read("resultIndex", "ResultIndex"),
    SrdvType: read("srdvType", "SrdvType"),
    SrdvIndex: read("srdvIndex", "SrdvIndex"),
  };
  if (!/^[1-9]\d*$/.test(identity.TraceId) || !identity.ResultIndex || /^(flight-|flt-)/.test(identity.ResultIndex)) {
    throw new Error("The supplier flight reference is missing. Search and select the flight again.");
  }
  if (!identity.SrdvType || !identity.SrdvIndex) {
    throw new Error("The supplier routing information is missing. Search and select the flight again.");
  }
  return identity;
}

export function unwrapFlightResponse(data) {
  return data?.Response || data?.data?.Response || data;
}

export function assertFlightResponse(data) {
  const response = unwrapFlightResponse(data);
  const error = response?.Error || data?.Error;
  if (!response || typeof response !== "object" ||
      (error?.ErrorCode != null && String(error.ErrorCode) !== "0") ||
      (response.ResponseStatus != null && Number(response.ResponseStatus) !== 1)) {
    throw new Error(error?.ErrorMessage || "The flight supplier could not complete the request.");
  }
  return response;
}

export function normalizeFareQuote(data, identity) {
  const response = assertFlightResponse(data);
  const results = response.Results;
  const fare = results?.Fare;
  if (!fare || !Number.isFinite(Number(fare.BaseFare)) || !Number.isFinite(Number(fare.Tax)) ||
      !Number.isFinite(Number(results.B2CFinalFare)) || Number(results.B2CFinalFare) <= 0) {
    throw new Error("The supplier did not return a complete, priced fare quote. Please search again.");
  }
  return {
    ...data, success: true, results, fare, identity,
    rawResponse: data,
    baseFare: Number(results.DisplayBaseFare ?? fare.BaseFare),
    tax: Number(results.DisplayTax ?? fare.Tax),
    totalFare: Number(results.B2CFinalFare),
    pickNBookDiscount: Number(results.PickNBookDiscount ?? 0),
    isPassportRequiredAtBook: supplierBoolean(results.IsPassportRequiredAtBook) === true,
  };
}

export function passengerFare(quote, paxType, passengers) {
  const breakdown = quote?.results?.FareBreakdown;
  const entry = Array.isArray(breakdown) ? breakdown.find(p => Number(p.PassengerType) === paxType) : null;
  const count = passengers.filter(p => Number(p.PaxType ?? p.paxType ?? (p.passengerType === "Child" ? 2 : p.passengerType === "Infant" ? 3 : 1)) === paxType).length;
  if (!entry || Number(entry.PassengerCount) !== count || count < 1) {
    throw new Error("The fare quote does not contain matching passenger fares. Please refresh the quote.");
  }
  const fare = { Currency: entry.Currency || quote.fare.Currency };
  for (const key of ["BaseFare", "Tax", "YQTax", "AdditionalTxnFeeOfrd", "AdditionalTxnFeePub", "AirTransFee", "TransactionFee", "OtherCharges", "Discount", "PublishedFare", "OfferedFare"]) {
    if (entry[key] != null) fare[key] = Number((Number(entry[key]) / count).toFixed(2));
  }
  if (!fare.Currency || !Number.isFinite(fare.BaseFare) || !Number.isFinite(fare.Tax)) {
    throw new Error("Passenger fare details are incomplete.");
  }
  return fare;
}
