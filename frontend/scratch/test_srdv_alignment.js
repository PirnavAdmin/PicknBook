const assert = require("assert");

// Helper simulation of mapPassengersForApiIntegration mapping behavior
function mapPassengersForApiIntegration(passengers = [], baseFare = 8000, tax = 2016.5, flight = null) {
  const paxList = Array.isArray(passengers) && passengers.length > 0 ? passengers : [{}];
  const count = paxList.length;
  const paxBase = Number((baseFare / count).toFixed(2));
  const paxTax = Number((tax / count).toFixed(2));

  const origin = String(flight?.fromCity || flight?.sourceCode || flight?.source || flight?.origin || "DEL").toUpperCase();
  const destination = String(flight?.toCity || flight?.destinationCode || flight?.destination || "BOM").toUpperCase();
  const airlineCode = String(flight?.airlineCode || flight?.airline || flight?.providerName || "6E").toUpperCase().slice(0, 2);
  const flightNumber = String(flight?.flightNumber || flight?.tripNumber || "").replace(/\D/g, "") || "101";

  return paxList.map((p, index) => {
    const titles = ["mr", "mrs", "miss", "ms", "dr", "prof"];
    let rawTitle = String(p.title || p.Title || "Mr").trim();
    let firstName = String(p.firstName || p.FirstName || "").trim();
    let lastName = String(p.lastName || p.LastName || "").trim();

    const cleanTitle = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase() : "Mr";
    const paxTypeNum = typeof p.paxType === "number" ? p.paxType : 1;
    const genderCode = p.gender === "2" || String(p.gender).toLowerCase() === "female" ? "2" : "1";

    let finalTitle = cleanTitle || "Mr";
    if (finalTitle === "Master" || finalTitle === "Mstr") {
      finalTitle = "Mstr";
    } else if (paxTypeNum === 2 || paxTypeNum === 3) {
      if (finalTitle === "Mr" || finalTitle === "Mrs" || !finalTitle) {
        finalTitle = genderCode === "2" ? "Miss" : "Mstr";
      }
    }

    const defaultDob = paxTypeNum === 2 ? "2018-05-15" : paxTypeNum === 3 ? "2025-06-01" : "1995-01-01";
    const dobRaw = p.dob || p.DateOfBirth || p.dateOfBirth || "";
    const cleanDobStr = dobRaw ? String(dobRaw).split("T")[0] : defaultDob;

    const isLead = p.isLeadPax !== undefined ? Boolean(p.isLeadPax) : index === 0;
    const seatCode = String(p.seatCode || p.SeatCode || p.seatNumber || p.SeatNumber || p.seatLabel || "").trim();
    const rawPassportNo = String(p.passportNo || p.PassportNo || "").trim();

    const cleanContact = String(p.contactNo || p.ContactNo || p.phone || p.mobile || "9515204358").replace(/\D/g, "").slice(-10);
    const cleanEmail = String(p.email || p.Email || "hreddy728@gmail.com").trim();

    const getConsolidatedSeatCode = (seatObj) => {
      if (!seatObj) return "";
      let rawSeat = "";
      if (typeof seatObj === "string") {
        rawSeat = seatObj.trim();
      } else if (typeof seatObj === "object") {
        rawSeat = String(seatObj.Code || seatObj.code || seatObj.SeatNumber || seatObj.seatNumber || seatObj.label || "").trim();
      }
      if (!rawSeat || rawSeat === "--" || rawSeat.toLowerCase() === "no seat" || rawSeat.toLowerCase() === "null") return "";
      const seatMatch = rawSeat.match(/^([0-9]{1,2}[A-Z]{1,2})/i);
      return seatMatch ? seatMatch[1].toUpperCase() : rawSeat.toUpperCase();
    };

    const rawSeats = p.selectedSeats || p.selectedSeat || p.Seat || p.SeatDynamic || p.seat || (seatCode ? [{ Code: seatCode }] : []);
    const seatArray = Array.isArray(rawSeats) ? rawSeats : (rawSeats ? [rawSeats] : []);

    const mappedSeats = seatArray
      .map((s) => {
        const unifiedSeatCode = getConsolidatedSeatCode(s);
        if (!unifiedSeatCode) return null;
        return {
          Code: unifiedSeatCode,
          SeatNumber: unifiedSeatCode,
          AirlineCode: airlineCode,
          FlightNumber: flightNumber,
          Origin: origin,
          Destination: destination,
          Amount: Number(s.Amount ?? s.amount ?? s.Price ?? s.price ?? 415),
        };
      })
      .filter(Boolean);

    const seatCodes = mappedSeats.map((s) => s.Code);

    const passengerObj = {
      Title: finalTitle,
      FirstName: firstName || "Harish",
      LastName: lastName || "Gangireddy",
      PaxType: Number(paxTypeNum || 1),
      Gender: String(genderCode || "1"),
      DateOfBirth: cleanDobStr,
      AddressLine1: isLead ? String(p.addressLine1 || "Narsingi").trim() : "",
      City: isLead ? String(p.city || "Hyderabad").trim() : "",
      CountryCode: "IN",
      CountryName: "India",
      CellCountryCode: "+91",
      ContactNo: isLead ? cleanContact : "",
      Email: isLead ? cleanEmail : "",
      IsLeadPax: Boolean(isLead),
      Fare: { BaseFare: paxBase, Tax: paxTax, TransactionFee: 0, YQTax: 0, AdditionalTxnFeeOfrd: 0, AdditionalTxnFeePub: 0, AirTransFee: 0 },
      Baggage: [],
      MealDynamic: [],
      SeatCode: seatCodes,
      ...(mappedSeats.length > 0 ? { Seat: mappedSeats, SeatDynamic: mappedSeats } : {}),
      PassportNo: rawPassportNo || "",
      PassportExpiry: "",
      PassportExpiryDate: "",
      PassportIssueDate: "",
      PassportIssueCountryCode: "",
      Nationality: "IN"
    };

    return passengerObj;
  });
}

// ── TEST CASES ──
console.log("Running SRDV Flight API v8 alignment unit tests...");

// Test 1: String seat "13E"
const test1 = mapPassengersForApiIntegration([{
  title: "Mr",
  firstName: "Harish",
  lastName: "Gangireddy",
  paxType: 1,
  gender: "1",
  dob: "1999-03-25",
  seatCode: "13E"
}]);

assert.strictEqual(test1[0].Title, "Mr");
assert.strictEqual(test1[0].Gender, "1");
assert.strictEqual(test1[0].DateOfBirth, "1999-03-25");
assert.deepStrictEqual(test1[0].SeatCode, ["13E"]);
assert.strictEqual(test1[0].Seat[0].Code, "13E");
assert.strictEqual(test1[0].SeatDynamic[0].Code, "13E");
console.log("✅ Test 1 (String seat designator '13E') passed!");

// Test 2: Master title mapping
const test2 = mapPassengersForApiIntegration([{
  title: "Master",
  firstName: "ChildPax",
  lastName: "Reddy",
  paxType: 2,
  gender: "1",
  dob: "2018-05-15"
}]);
assert.strictEqual(test2[0].Title, "Mstr");
console.log("✅ Test 2 (Master title mapped to Mstr) passed!");

// Test 3: No seat selected -> Seat and SeatDynamic omitted
const test3 = mapPassengersForApiIntegration([{
  title: "Mrs",
  firstName: "Jane",
  lastName: "Doe",
  paxType: 1,
  gender: "2",
  dob: "1992-10-10"
}]);
assert.deepStrictEqual(test3[0].SeatCode, []);
assert.strictEqual("Seat" in test3[0], false);
assert.strictEqual("SeatDynamic" in test3[0], false);
console.log("✅ Test 3 (No seat selected: SeatCode = [] and Seat/SeatDynamic omitted) passed!");

console.log("All unit tests passed successfully!");
