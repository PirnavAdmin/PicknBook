
const bookingResponse = {
  rawResponse: {
    Response: {
      FlightItinerary: {
        Segments: [
          { Origin: { CityName: "Hyderabad" } },
          { Origin: { CityName: "Bengaluru" } }
        ]
      }
    }
  }
};
const flowState = {
  isMultiCity: true,
  selectedLegs: [
    { sourceName: "Publish" },
    { sourceName: "Publish,SME" }
  ]
};
const rawItinSegments = bookingResponse?.itinerary?.Segments || bookingResponse?.segments || bookingResponse?.rawResponse?.Response?.FlightItinerary?.Segments || [];

const multiCityTickets = flowState.selectedLegs.slice(1).map((leg, sliceIndex) => {
  const index = sliceIndex + 1;
  const segInfo = rawItinSegments[index] || (Array.isArray(rawItinSegments[0]) ? rawItinSegments[0][index] : null);
  return {
    fromCity: segInfo?.Origin?.CityName || leg.fromCity || leg.sourceName || leg.sourceCode || "Origin",
  };
});
console.log(multiCityTickets);

