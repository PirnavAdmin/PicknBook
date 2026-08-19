import { getBusPricingPreview, bookBus } from "./busBookingService";

describe("busBookingService Contract tests", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: {
          get: () => "application/json",
        },
        json: () => Promise.resolve({ data: {} }),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("getBusPricingPreview builds the correct payload (no busId, no markupAmount)", async () => {
    const passengers = [
      {
        seatNumber: "A1",
        seatType: "Seater",
        baseFare: 500,
        markupAmount: 150, // Should be excluded
        tax: 50,
      }
    ];

    await getBusPricingPreview({
      traceId: "trace-123",
      passengers,
      couponCode: "DISC10",
      fromCity: "Delhi",
      toCity: "Jaipur",
      departureTime: "2023-12-01 10:00:00",
      operatorName: "Express Bus",
      busType: "AC Seater",
      totalFare: 550
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCallUrl = global.fetch.mock.calls[0][0];
    const fetchCallOptions = global.fetch.mock.calls[0][1];

    // Assert URL does not have busId or {busId}
    expect(fetchCallUrl).not.toContain("{busId}");
    expect(fetchCallUrl).not.toContain("undefined");
    expect(fetchCallUrl).toMatch(/\/pricing-preview$/);

    const body = JSON.parse(fetchCallOptions.body);

    // Assert root metadata exists
    expect(body.traceId).toBe("trace-123");
    expect(body.couponCode).toBe("DISC10");
    expect(body.fromCity).toBe("Delhi");
    expect(body.toCity).toBe("Jaipur");
    expect(body.departureTime).toBe("2023-12-01 10:00:00");
    expect(body.operatorName).toBe("Express Bus");
    expect(body.busType).toBe("AC Seater");
    expect(body.totalFare).toBe(550);

    // Assert seats payload contract
    expect(body.seats).toHaveLength(1);
    expect(body.seats[0]).toEqual({
      seatCode: "A1",
      seatType: "Seater",
      baseFare: 500,
      externalGst: 50,
      // markupAmount should explicitly be absent
    });
    expect(body.seats[0]).not.toHaveProperty("markupAmount");
  });

  test("bookBus builds the correct payload (no busId, handles ID proof conditional)", async () => {
    const payload = {
      routeId: "route-456",
      traceId: "trace-123",
      srdvBlockKey: "block-key",
      fromCity: "Delhi",
      toCity: "Jaipur",
      departureTime: "2023-12-01 10:00:00",
      arrivalTime: "2023-12-01 16:00:00",
      operatorName: "Express Bus",
      busType: "AC Seater",
      isIdProofRequired: true,
      totalFare: 550,
      passengers: [
        {
          gender: "Male",
          firstName: "John",
          lastName: "Doe",
          age: 30,
          seatNumber: "A1",
          baseFare: 500,
          tax: 50,
          idType: "Aadhar",
          idNumber: "123412341234"
        }
      ]
    };

    await bookBus({ payload });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCallUrl = global.fetch.mock.calls[0][0];
    const fetchCallOptions = global.fetch.mock.calls[0][1];

    expect(fetchCallUrl).not.toContain("{busId}");
    expect(fetchCallUrl).not.toContain("undefined");
    expect(fetchCallUrl).toMatch(/\/book$/);

    const body = JSON.parse(fetchCallOptions.body);

    // Metadata should be populated correctly at the root level
    expect(body.routeId).toBe("route-456");
    expect(body.traceId).toBe("trace-123");
    expect(body.isIdProofRequired).toBe(true);

    // Check passenger mapping correctly includes idProof Props
    expect(body.passengers).toHaveLength(1);
    expect(body.passengers[0].idType).toBe("Aadhar");
    expect(body.passengers[0].idNumber).toBe("123412341234");
  });

  test("bookBus payload does not send ID proof fields when isIdProofRequired is false", async () => {
    const payload = {
      isIdProofRequired: false,
      passengers: [
        {
          gender: "Male",
          firstName: "John",
          lastName: "Doe",
          age: 30,
          seatNumber: "A1",
          baseFare: 500,
          tax: 50,
          idType: "Aadhar",
          idNumber: "123412341234" // Even if present in frontend memory, must be stripped
        }
      ]
    };

    await bookBus({ payload });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCallOptions = global.fetch.mock.calls[0][1];
    const body = JSON.parse(fetchCallOptions.body);

    expect(body.isIdProofRequired).toBe(false);
    expect(body.passengers[0]).not.toHaveProperty("idType");
    expect(body.passengers[0]).not.toHaveProperty("idNumber");
  });
});
