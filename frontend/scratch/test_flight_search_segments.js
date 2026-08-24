const assert = require("assert");

// Import our updated functions
const {
  buildFlightSearchSegments,
  formatIsoDateTime,
  mapCabinClassToCode,
} = require("../src/services/flightBookingService");

console.log("Running Flight Search and Calendar Fare Payload unit tests...\n");

// Test 1: Date formatting strict ISO YYYY-MM-DDTHH:mm:ss
console.log("Checking Date Formatting...");
assert.strictEqual(formatIsoDateTime("2026-10-23"), "2026-10-23T00:00:00");
assert.strictEqual(formatIsoDateTime("2026-10-23T14:30:00"), "2026-10-23T14:30:00");
assert.strictEqual(formatIsoDateTime("2026-10-23T14:30:00.000Z"), "2026-10-23T14:30:00");
assert.strictEqual(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(formatIsoDateTime(new Date())), true);
console.log("✅ Strict ISO date formatting validated.");

// Test 2: Cabin class numeric mapping
console.log("Checking Cabin Class Mappings...");
assert.strictEqual(mapCabinClassToCode("Economy"), 2);
assert.strictEqual(mapCabinClassToCode("Premium Economy"), 3);
assert.strictEqual(mapCabinClassToCode("Business"), 4);
assert.strictEqual(mapCabinClassToCode("Premium Business"), 5);
assert.strictEqual(mapCabinClassToCode("First"), 6);
assert.strictEqual(mapCabinClassToCode("All"), 1);
assert.strictEqual(mapCabinClassToCode(4), 4);
console.log("✅ Cabin class mapping to numeric codes validated.");

// Test 3: One-Way
console.log("Checking One-Way Payload Generation...");
const oneWayResult = buildFlightSearchSegments({
  from: "DEL",
  to: "BOM",
  date: "2026-10-23",
  tripType: "oneWay",
  travelClass: "Economy",
});
assert.strictEqual(oneWayResult.journeyType, 1);
assert.strictEqual(oneWayResult.segments.length, 1);
assert.deepStrictEqual(oneWayResult.segments[0], {
  Origin: "DEL",
  Destination: "BOM",
  FlightCabinClass: 2,
  PreferredDepartureTime: "2026-10-23T00:00:00",
  PreferredArrivalTime: "2026-10-23T00:00:00",
});
console.log("✅ One-Way: JourneyType 1 and exactly 1 segment validated.");

// Test 4: Round-Trip (testing 'roundTrip', 'roundway', 'twoway')
console.log("Checking Round-Trip & Roundway Payload Generation...");
const roundTripResult = buildFlightSearchSegments({
  from: "DEL",
  to: "BOM",
  date: "2026-10-23",
  returnDate: "2026-10-30",
  tripType: "roundTrip",
  travelClass: "Business",
});
assert.strictEqual(roundTripResult.journeyType, 2);
assert.strictEqual(roundTripResult.segments.length, 2);

const roundwayResult = buildFlightSearchSegments({
  from: "DEL",
  to: "BOM",
  date: "2026-10-23",
  returnDate: "2026-10-30",
  tripType: "roundway",
  travelClass: "Economy",
});
assert.strictEqual(roundwayResult.journeyType, 2);
assert.strictEqual(roundwayResult.segments.length, 2);
assert.deepStrictEqual(roundwayResult.segments[0], {
  Origin: "DEL",
  Destination: "BOM",
  FlightCabinClass: 2,
  PreferredDepartureTime: "2026-10-23T00:00:00",
  PreferredArrivalTime: "2026-10-23T00:00:00",
});
assert.deepStrictEqual(roundwayResult.segments[1], {
  Origin: "BOM",
  Destination: "DEL",
  FlightCabinClass: 2,
  PreferredDepartureTime: "2026-10-30T00:00:00",
  PreferredArrivalTime: "2026-10-30T00:00:00",
});

const twoWayNoTripTypeResult = buildFlightSearchSegments({
  from: "DEL",
  to: "BOM",
  date: "2026-10-23",
  returnDate: "2026-10-30",
  travelClass: "Economy",
});
assert.strictEqual(twoWayNoTripTypeResult.journeyType, 2);
assert.strictEqual(twoWayNoTripTypeResult.segments.length, 2);
console.log("✅ Round-Trip / Roundway: JourneyType 2 and exactly 2 segments (with return date) validated.");

// Test 5: Multi-City
console.log("Checking Multi-City Payload Generation...");
const multiCityLegs = [
  { from: "DEL", to: "BOM", date: "2026-10-23", travelClass: "Economy" },
  { from: "BOM", to: "BLR", date: "2026-10-25", travelClass: "Economy" },
  { from: "BLR", to: "HYD", date: "2026-10-28", travelClass: "Business" },
];
const multiCityResult = buildFlightSearchSegments({
  tripType: "multiCity",
  legs: multiCityLegs,
  travelClass: "Economy",
});
assert.strictEqual(multiCityResult.journeyType, 3);
assert.strictEqual(multiCityResult.segments.length, 3);
assert.deepStrictEqual(multiCityResult.segments[0], {
  Origin: "DEL",
  Destination: "BOM",
  FlightCabinClass: 2,
  PreferredDepartureTime: "2026-10-23T00:00:00",
  PreferredArrivalTime: "2026-10-23T00:00:00",
});
assert.deepStrictEqual(multiCityResult.segments[1], {
  Origin: "BOM",
  Destination: "BLR",
  FlightCabinClass: 2,
  PreferredDepartureTime: "2026-10-25T00:00:00",
  PreferredArrivalTime: "2026-10-25T00:00:00",
});
assert.deepStrictEqual(multiCityResult.segments[2], {
  Origin: "BLR",
  Destination: "HYD",
  FlightCabinClass: 4,
  PreferredDepartureTime: "2026-10-28T00:00:00",
  PreferredArrivalTime: "2026-10-28T00:00:00",
});
console.log("✅ Multi-City: JourneyType 3 and dynamic mapping of all sectors validated.");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
