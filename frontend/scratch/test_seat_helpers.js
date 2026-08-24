const assert = require("assert");

const {
  resolveAirlineCode,
  resolveFlightNumber,
  resolveSeatNumber,
} = require("../src/services/flightBookingService");

console.log("Running Seat Helper Functions Unit Tests...\n");

// 1. Test resolveAirlineCode
console.log("Testing resolveAirlineCode...");
assert.strictEqual(resolveAirlineCode("IN", "6E"), "6E");
assert.strictEqual(resolveAirlineCode("IN", "IX"), "IX");
assert.strictEqual(resolveAirlineCode("6E 413"), "6E");
assert.strictEqual(resolveAirlineCode("IX2018"), "IX");
assert.strictEqual(resolveAirlineCode("AI 101"), "AI");
assert.strictEqual(resolveAirlineCode("SG-819"), "SG");
assert.strictEqual(resolveAirlineCode("QP 1102"), "QP");
assert.strictEqual(resolveAirlineCode(null, "6E"), "6E");
console.log("✅ resolveAirlineCode tests passed!");

// 2. Test resolveFlightNumber
console.log("Testing resolveFlightNumber...");
assert.strictEqual(resolveFlightNumber("6E 413"), "413");
assert.strictEqual(resolveFlightNumber("IX2018"), "2018");
assert.strictEqual(resolveFlightNumber("6E-151"), "151");
assert.strictEqual(resolveFlightNumber("413"), "413");
assert.strictEqual(resolveFlightNumber(""), "");
assert.strictEqual(resolveFlightNumber(null), "");
console.log("✅ resolveFlightNumber tests passed!");

// 3. Test resolveSeatNumber
console.log("Testing resolveSeatNumber...");
assert.strictEqual(resolveSeatNumber("20ESeKey747"), "20E");
assert.strictEqual(resolveSeatNumber("32E"), "32E");
assert.strictEqual(resolveSeatNumber({ Code: "20ESeKey747", label: "20E" }), "20E");
assert.strictEqual(resolveSeatNumber({ Code: "32ESeKey820", SeatNumber: "32E" }), "32E");
assert.strictEqual(resolveSeatNumber({ Code: "17BSeKey665" }), "17B");
console.log("✅ resolveSeatNumber tests passed!");

console.log("\n🎉 ALL SEAT HELPER TESTS PASSED SUCCESSFULLY!");
