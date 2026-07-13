using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;

namespace PickNBook.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FlightBookingsController(
    AppDbContext dbContext,
    IBookingNotificationService bookingNotificationService,
    IFlightPricingService pricingService,
    ICurrentUserService currentUserService,
    ITicketEmailService ticketEmailService,
    IWhatsAppService whatsAppService,
    IAmadeusService amadeusService,
    ILogger<FlightBookingsController> logger) : BaseApiController
    {

        //private const string UserIdHeaderName = "X-User-Id";
        private static readonly TimeSpan IndiaOffset = TimeSpan.FromHours(5.5);
        private static readonly string[] AllowedPassengerTypes = ["Adult", "Child", "Infant"];
        private static readonly string[] AllowedPassengerGenders = ["Male", "Female", "Other"];
        private static readonly string[] DynamicCities =
        [
            "Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad",
        "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Kochi"
        ];
        private static readonly (string Name, string Code)[] DynamicAirlines =
        [
            ("Air India", "AI"),
        ("IndiGo", "6E"),
        ("Vistara", "UK"),
        ("Akasa Air", "QP"),
        ("SpiceJet", "SG"),
        ("Air India Express", "IX")
        ];
        private static readonly (int Hour, int Minute)[] DynamicFlightSlots = [(6, 20), (12, 10), (19, 35)];
        private static readonly Dictionary<string, int> ClassSeatConfig = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Economy"] = 120,
            ["Premium Economy"] = 24,
            ["Business"] = 18,
            ["Premium Business"] = 12,
            ["First Class"] = 8
        };
        private static readonly Dictionary<string, decimal> ClassPriceMultiplier = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Economy"] = 1.00m,
            ["Premium Economy"] = 1.35m,
            ["Business"] = 2.00m,
            ["Premium Business"] = 2.40m,
            ["First Class"] = 3.20m
        };
        private static readonly string[] AllowedTravelClasses =
        [
            "Economy",
        "Premium Economy",
        "Business",
        "Premium Business",
        "First Class"
        ];

        private static readonly Dictionary<string, string> CityToIata = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Delhi"] = "DEL",
            ["New Delhi"] = "DEL",
            ["Mumbai"] = "BOM",
            ["Bengaluru"] = "BLR",
            ["Bangalore"] = "BLR",
            ["Chennai"] = "MAA",
            ["Hyderabad"] = "HYD",
            ["Kolkata"] = "CCU",
            ["Pune"] = "PNQ",
            ["Ahmedabad"] = "AMD",
            ["Jaipur"] = "JAI",
            ["Kochi"] = "COK",
            ["Cochin"] = "COK",
            ["Goa"] = "GOI",
            ["Dubai"] = "DXB",
            ["New York"] = "JFK",
            ["London"] = "LHR",
            ["Paris"] = "CDG"
        };

        private static readonly Dictionary<string, string> IataToCity = new(StringComparer.OrdinalIgnoreCase)
        {
            ["DEL"] = "Delhi",
            ["BOM"] = "Mumbai",
            ["BLR"] = "Bengaluru",
            ["MAA"] = "Chennai",
            ["HYD"] = "Hyderabad",
            ["CCU"] = "Kolkata",
            ["PNQ"] = "Pune",
            ["AMD"] = "Ahmedabad",
            ["JAI"] = "Jaipur",
            ["COK"] = "Kochi",
            ["GOI"] = "Goa",
            ["DXB"] = "Dubai",
            ["JFK"] = "New York",
            ["LHR"] = "London",
            ["CDG"] = "Paris"
        };


        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> SearchFlights(
            [FromQuery] string? fromCity = null,
            [FromQuery] string? toCity = null,
            [FromQuery] DateOnly? date = null,
            [FromQuery] string? travelClass = null,
            [FromQuery] string? tripType = null,
            [FromQuery] DateOnly? returnDate = null,
            [FromQuery(Name = "from")] string? from = null,
            [FromQuery(Name = "to")] string? to = null,
            [FromQuery(Name = "class")] string? travelClassAlias = null,
            [FromQuery] int adults = 1,
            [FromQuery] int children = 0,
            [FromQuery] int infants = 0)
        {
            var query = dbContext.FlightBookings.AsNoTracking().AsQueryable();
            var requestedFrom = string.IsNullOrWhiteSpace(fromCity) ? from : fromCity;
            var requestedTo = string.IsNullOrWhiteSpace(toCity) ? to : toCity;
            var requestedClass = string.IsNullOrWhiteSpace(travelClass) ? travelClassAlias : travelClass;
            var normalizedClass = ResolveTravelClass(requestedClass);

            // Attempt to query Amadeus
            var fromIata = requestedFrom != null && CityToIata.TryGetValue(requestedFrom.Trim(), out var fCode) ? fCode : null;
            var toIata = requestedTo != null && CityToIata.TryGetValue(requestedTo.Trim(), out var tCode) ? tCode : null;

            List<FlightOfferDto>? amadeusOffers = null;
            if (fromIata != null && toIata != null && date.HasValue)
            {
                try
                {
                    var searchDate = new DateTime(date.Value.Year, date.Value.Month, date.Value.Day);
                    amadeusOffers = await amadeusService.SearchFlightsAsync(fromIata, toIata, searchDate);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Amadeus flight search failed. Falling back to database/mock results.");
                }
            }

            if (amadeusOffers != null && amadeusOffers.Count > 0)
            {
                var dbFlights = await GetOrCreateAmadeusFlightsInDbAsync(amadeusOffers);
                
                foreach (var dbFlight in dbFlights)
                {
                    await EnsureFlightClassInventoriesForFlightAsync(dbFlight.Id, dbFlight.PriceInr);
                }

                var amadeusResponse = new List<object>();

                var groupedOffers = amadeusOffers.GroupBy(o => new {
                    o.Airline,
                    o.Origin,
                    o.Destination,
                    o.DepartureTime,
                    o.ArrivalTime
                });

                foreach (var group in groupedOffers)
                {
                    var key = group.Key;
                    var airlineName = GetAirlineName(key.Airline);
                    var resolvedFromCity = IataToCity.TryGetValue(key.Origin, out var fromVal) ? fromVal : key.Origin;
                    var resolvedToCity = IataToCity.TryGetValue(key.Destination, out var toVal) ? toVal : key.Destination;

                    var dbFlight = dbFlights.FirstOrDefault(f => f.Airline == airlineName 
                                                                && f.DepartureTime == DateTime.SpecifyKind(key.DepartureTime, DateTimeKind.Utc)
                                                                && f.FromCity == resolvedFromCity
                                                                && f.ToCity == resolvedToCity);
                    if (dbFlight == null) continue;

                    var sortedGroupOffers = group.OrderBy(o => o.Price).ToList();
                    var baseOffer = sortedGroupOffers.First();

                    decimal basePriceInr = baseOffer.Price;
                    if (baseOffer.Currency != "INR")
                    {
                        var rate = baseOffer.Currency == "USD" ? 83.5m : 91.5m;
                        basePriceInr = basePriceInr * rate;
                    }
                    basePriceInr = decimal.Round(basePriceInr, 2, MidpointRounding.AwayFromZero);

                    var fareOptions = new List<object>();
                    
                    var checkedBagText = "15 kg Check-in bag allowance";
                    if (baseOffer.CheckedBagsWeight.HasValue)
                        checkedBagText = $"{baseOffer.CheckedBagsWeight.Value} {baseOffer.CheckedBagsUnit ?? "KG"} Check-in bag allowance";
                    else if (baseOffer.CheckedBagsQuantity.HasValue)
                        checkedBagText = $"{baseOffer.CheckedBagsQuantity.Value} piece Check-in bag allowance";

                    var cabinBagText = "7 kg Cabin bag allowance";
                    if (baseOffer.CabinBagsWeight.HasValue)
                        cabinBagText = $"{baseOffer.CabinBagsWeight.Value} {baseOffer.CabinBagsUnit ?? "KG"} Cabin bag allowance";

                    fareOptions.Add(new
                    {
                        fareType = "saver",
                        fareLabel = "Saver fare",
                        priceInr = basePriceInr,
                        cabinBag = cabinBagText,
                        checkedBag = checkedBagText,
                        changeCancellation = "Change and cancellation charges Standard",
                        addons = Array.Empty<string>(),
                        isNew = false
                    });

                    decimal flexiPrice = basePriceInr * 1.066m;
                    if (sortedGroupOffers.Count > 1)
                    {
                        var flexiOffer = sortedGroupOffers[1];
                        decimal fPrice = flexiOffer.Price;
                        if (flexiOffer.Currency != "INR")
                        {
                            var rate = flexiOffer.Currency == "USD" ? 83.5m : 91.5m;
                            fPrice = fPrice * rate;
                        }
                        flexiPrice = decimal.Round(fPrice, 2, MidpointRounding.AwayFromZero);
                    }
                    else
                    {
                        flexiPrice = decimal.Round(flexiPrice, 2, MidpointRounding.AwayFromZero);
                    }

                    fareOptions.Add(new
                    {
                        fareType = "flexi",
                        fareLabel = "Flexi plus fare",
                        priceInr = flexiPrice,
                        cabinBag = cabinBagText,
                        checkedBag = checkedBagText,
                        changeCancellation = "Change and cancellation charges Partial",
                        addons = new[] { "Complimentary meal", "Complimentary standard seat" },
                        isNew = false
                    });

                    decimal upfrontPrice = basePriceInr * 1.203m;
                    string upfrontCheckedBag = "20 kg Check-in bag allowance";
                    if (sortedGroupOffers.Count > 2)
                    {
                        var upfrontOffer = sortedGroupOffers[2];
                        decimal uPrice = upfrontOffer.Price;
                        if (upfrontOffer.Currency != "INR")
                        {
                            var rate = upfrontOffer.Currency == "USD" ? 83.5m : 91.5m;
                            uPrice = uPrice * rate;
                        }
                        upfrontPrice = decimal.Round(uPrice, 2, MidpointRounding.AwayFromZero);
                        if (upfrontOffer.CheckedBagsWeight.HasValue)
                            upfrontCheckedBag = $"{upfrontOffer.CheckedBagsWeight.Value} {upfrontOffer.CheckedBagsUnit ?? "KG"} Check-in bag allowance";
                    }
                    else
                    {
                        upfrontPrice = decimal.Round(upfrontPrice, 2, MidpointRounding.AwayFromZero);
                    }

                    fareOptions.Add(new
                    {
                        fareType = "upfront",
                        fareLabel = $"{airlineName} UpFront",
                        priceInr = upfrontPrice,
                        cabinBag = cabinBagText,
                        checkedBag = upfrontCheckedBag,
                        changeCancellation = "ZERO change fee (beyond 72 hours), Cancellation charges Low",
                        addons = new[] { "Complimentary meal", "Front two-row economy seats", "Fast Forward not included" },
                        isNew = true
                    });

                    var parsedTripType = string.Equals(tripType, "RoundTrip", StringComparison.OrdinalIgnoreCase)
                        ? TripType.RoundTrip
                        : TripType.OneWay;

                    var pricingBreakdown = await pricingService.CalculatePricingAsync(
                        dbFlight,
                        "Economy",
                        parsedTripType,
                        passengerCount: 1,
                        couponCode: null,
                        currentUserService.GetUserOrGuestId());

                    var supportedClasses = new[] { "Economy", "Premium Economy", "Business", "Premium Business", "First Class" };

                    amadeusResponse.Add(new
                    {
                        dbFlight.Id,
                        dbFlight.FlightNumber,
                        dbFlight.Airline,
                        dbFlight.FromCity,
                        dbFlight.ToCity,
                        DepartureTimeUtc = dbFlight.DepartureTime,
                        ArrivalTimeUtc = dbFlight.ArrivalTime,
                        DepartureTimeIst = ToIst(dbFlight.DepartureTime),
                        ArrivalTimeIst = ToIst(dbFlight.ArrivalTime),
                        dbFlight.CabinClass,
                        SelectedTravelClass = "Economy",
                        SelectedTravelClassPriceInr = basePriceInr,
                        SelectedTravelClassAvailableSeats = baseOffer.AvailableSeats,
                        SelectedTravelClassTotalSeats = 180,
                        TotalAvailableSeats = dbFlight.AvailableSeats,
                        TotalSeats = dbFlight.TotalSeats,
                        SupportedTravelClasses = supportedClasses,
                        ClassOptions = supportedClasses.Select(tc => new
                        {
                            TravelClass = tc,
                            PriceInr = decimal.Round(basePriceInr * ClassPriceMultiplier[tc], 2, MidpointRounding.AwayFromZero),
                            AvailableSeats = 30,
                            TotalSeats = 30
                        }).ToArray(),
                        SupplierFare = pricingBreakdown.SupplierTotalFare,
                        Markup = pricingBreakdown.MarkupAmount,
                        PromotionDiscount = pricingBreakdown.PromotionDiscount,
                        DisplayFare = pricingBreakdown.FinalAmount,
                        PromotionName = pricingBreakdown.PromotionName,
                        Savings = pricingBreakdown.PromotionDiscount,
                        PricingBreakdown = pricingBreakdown,
                        FareOptions = fareOptions
                    });
                }

                return Ok(amadeusResponse);
            }

            if (date.HasValue)

            {
                await EnsureFlightSchedulesForDateAsync(date.Value, requestedFrom?.Trim(), requestedTo?.Trim());
            }

            if (!string.IsNullOrWhiteSpace(requestedFrom) && !string.IsNullOrWhiteSpace(requestedTo))
            {
                await IncrementFlightRouteSearchCounterAsync(
                    requestedFrom.Trim(),
                    requestedTo.Trim(),
                    currentUserService.GetUserOrGuestId(),
                    date,
                    returnDate,
                    string.IsNullOrWhiteSpace(tripType) ? "OneWay" : tripType.Trim(),
                    adults,
                    children,
                    infants);
            }

            if (!string.IsNullOrWhiteSpace(requestedClass) && normalizedClass is null)
            {
                return BadRequest($"Invalid travelClass. Allowed values: {string.Join(", ", AllowedTravelClasses)}.");
            }

            if (!string.IsNullOrWhiteSpace(requestedFrom))
            {
                var fromValue = requestedFrom.Trim();
                query = query.Where(x => EF.Functions.Like(x.FromCity, fromValue));
            }

            if (!string.IsNullOrWhiteSpace(requestedTo))
            {
                var toValue = requestedTo.Trim();
                query = query.Where(x => EF.Functions.Like(x.ToCity, toValue));
            }

            if (date.HasValue)
            {
                var (startUtc, endUtc) = GetUtcRangeForIstDate(date.Value);
                query = query.Where(x => x.DepartureTime >= startUtc && x.DepartureTime < endUtc);
            }

            var flights = await query
                .OrderBy(x => x.DepartureTime)
                .Take(200)
                .ToListAsync();

            if (flights.Count == 0)
            {
                return Ok(Array.Empty<object>());
            }

            var flightIds = flights.Select(x => x.Id).ToList();
            var classInventories = await dbContext.FlightClassInventories
                .AsNoTracking()
                .Where(x => flightIds.Contains(x.FlightBookingId))
                .ToListAsync();

            var classInventoryByFlight = classInventories
                .GroupBy(x => x.FlightBookingId)
                .ToDictionary(x => x.Key, x => x.OrderBy(c => ClassSortOrder(c.TravelClass)).ToList());

            var response = new List<object>();
            foreach (var flight in flights)
            {
                if (!classInventoryByFlight.TryGetValue(flight.Id, out var classOptions) || classOptions.Count == 0)
                {
                    continue;
                }

                FlightClassInventory? selectedClassInventory;
                if (normalizedClass is not null)
                {
                    selectedClassInventory = classOptions.FirstOrDefault(x => x.TravelClass.Equals(normalizedClass, StringComparison.OrdinalIgnoreCase));
                    if (selectedClassInventory is null || selectedClassInventory.AvailableSeats <= 0)
                    {
                        continue;
                    }
                }
                else
                {
                    selectedClassInventory = classOptions.FirstOrDefault(x => x.TravelClass.Equals("Economy", StringComparison.OrdinalIgnoreCase))
                        ?? classOptions.FirstOrDefault(x => x.AvailableSeats > 0)
                        ?? classOptions.First();
                }

                // Calculate OTA Pricing Breakdown for this flight on Search
                var parsedTripType = string.Equals(tripType, "RoundTrip", StringComparison.OrdinalIgnoreCase)
                    ? TripType.RoundTrip
                    : TripType.OneWay;

                var pricingBreakdown = await pricingService.CalculatePricingAsync(
                    flight,
                    selectedClassInventory.TravelClass,
                    parsedTripType,
                    passengerCount: 1, // Calculate per passenger for display
                    couponCode: null,
                    currentUserService.GetUserOrGuestId());

                response.Add(new
                {
                    flight.Id,
                    flight.FlightNumber,
                    flight.Airline,
                    flight.FromCity,
                    flight.ToCity,
                    DepartureTimeUtc = flight.DepartureTime,
                    ArrivalTimeUtc = flight.ArrivalTime,
                    DepartureTimeIst = ToIst(flight.DepartureTime),
                    ArrivalTimeIst = ToIst(flight.ArrivalTime),
                    flight.CabinClass,
                    SelectedTravelClass = selectedClassInventory.TravelClass,
                    SelectedTravelClassPriceInr = selectedClassInventory.PriceInr,
                    SelectedTravelClassAvailableSeats = selectedClassInventory.AvailableSeats,
                    SelectedTravelClassTotalSeats = selectedClassInventory.TotalSeats,
                    TotalAvailableSeats = flight.AvailableSeats,
                    TotalSeats = flight.TotalSeats,
                    SupportedTravelClasses = classOptions.Select(x => x.TravelClass).ToArray(),
                    ClassOptions = classOptions.Select(x => new
                    {
                        x.TravelClass,
                        x.PriceInr,
                        x.AvailableSeats,
                        x.TotalSeats
                    }).ToArray(),
                    SupplierFare = pricingBreakdown.SupplierTotalFare,
                    Markup = pricingBreakdown.MarkupAmount,
                    PromotionDiscount = pricingBreakdown.PromotionDiscount,
                    DisplayFare = pricingBreakdown.FinalAmount,
                    PromotionName = pricingBreakdown.PromotionName,
                    Savings = pricingBreakdown.PromotionDiscount,
                    PricingBreakdown = pricingBreakdown
                });
            }

            return Ok(response);
        }

        [HttpGet("hot-routes")]
        [AllowAnonymous]
        public async Task<IActionResult> GetHotRoutes([FromQuery] string metric = "score")
        {
            var normalizedMetric = metric.Trim().ToLowerInvariant();
            if (normalizedMetric is not ("score" or "search" or "booking"))
            {
                return BadRequest("metric must be one of: score, search, booking.");
            }

            var stats = await dbContext.FlightRouteStats
                .AsNoTracking()
                .ToListAsync();

            var ranked = normalizedMetric switch
            {
                "search" => stats.OrderByDescending(x => x.SearchCount).ThenByDescending(x => x.BookingCount),
                "booking" => stats.OrderByDescending(x => x.BookingCount).ThenByDescending(x => x.SearchCount),
                _ => stats.OrderByDescending(x => x.SearchCount + (x.BookingCount * 3)).ThenByDescending(x => x.BookingCount)
            };

            var response = ranked
                .Take(10)
                .Select(x => new
                {
                    x.FromCity,
                    x.ToCity,
                    x.SearchCount,
                    x.BookingCount,
                    Score = x.SearchCount + (x.BookingCount * 3),
                    x.LastSearchedAtUtc,
                    x.LastBookedAtUtc
                });

            return Ok(response);
        }

        [HttpPost("pricing-preview")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPricingPreview([FromBody] FlightPricingPreviewRequestDto request)
        {
            int parsedFlightId = 0;
            if (int.TryParse(request.FlightId, out var idVal))
            {
                parsedFlightId = idVal;
            }
            else
            {
                var numericPart = new string(request.FlightId.Where(char.IsDigit).ToArray());
                if (!string.IsNullOrEmpty(numericPart) && int.TryParse(numericPart, out var numId))
                {
                    parsedFlightId = numId;
                }
            }

            var flight = await dbContext.FlightBookings.FirstOrDefaultAsync(x => x.Id == parsedFlightId);
            if (flight is null)
            {
                return NotFound("Flight not found.");
            }

            var normalizedClass = ResolveTravelClass(request.TravelClass) ?? "Economy";
            var parsedTripType = string.Equals(request.TripType, "RoundTrip", StringComparison.OrdinalIgnoreCase)
                ? TripType.RoundTrip
                : TripType.OneWay;

            var userId = currentUserService.GetUserOrGuestId() ?? "guest";

            var pricingBreakdown = await pricingService.CalculatePricingAsync(
                flight,
                normalizedClass,
                parsedTripType,
                request.PassengerCount,
                request.CouponCode,
                userId,
                request.SelectedFeaturedOfferId);

            return Ok(new
            {
                baseFare = pricingBreakdown.SupplierBaseFare,
                tax = pricingBreakdown.SupplierTaxAmount,
                convenienceFee = pricingBreakdown.ConvenienceFee,
                markup = pricingBreakdown.MarkupAmount,
                totalFare = pricingBreakdown.FinalAmount,
                couponDiscount = pricingBreakdown.CouponDiscount,
                promotionDiscount = pricingBreakdown.PromotionDiscount
            });
        }

        [HttpGet("{flightId:int}/seats")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFlightSeatMap(int flightId, [FromQuery] string travelClass = "Economy")
        {
            var normalizedClass = ResolveTravelClass(travelClass);
            if (normalizedClass is null)
            {
                return BadRequest($"Invalid travelClass. Allowed values: {string.Join(", ", AllowedTravelClasses)}.");
            }

            var flight = await dbContext.FlightBookings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == flightId);
            if (flight is null)
            {
                return NotFound("Flight not found.");
            }

            await EnsureFlightSeatsGeneratedAsync(flightId, normalizedClass);

            var seats = await dbContext.FlightSeats
                .AsNoTracking()
                .Where(x => x.FlightBookingId == flightId && x.TravelClass == normalizedClass)
                .OrderBy(x => x.SeatCode)
                .ToListAsync();

            var booked = seats.Count(x => x.IsBooked);
            var response = new SeatMapResponseDto
            {
                TripId = flightId,
                TripType = "Flight",
                TravelClass = normalizedClass,
                TotalSeats = seats.Count,
                BookedSeats = booked,
                AvailableSeats = seats.Count - booked,
                Seats = seats.Select(x => new SeatMapItemDto
                {
                    SeatCode = x.SeatCode,
                    IsBooked = x.IsBooked
                }).ToList()
            };

            return Ok(response);
        }

        [HttpPost("{flightId:int}/book")]
        public async Task<IActionResult> BookFlight(
            int flightId,
            [FromBody] CreateFlightBookingRequestDto request,
            [FromQuery] string tripType = "OneWay")
        {
            if (!currentUserService.IsAuthenticated())
            {
                return Unauthorized("Please login to continue booking.");
            }
            var userId = currentUserService.GetUserOrGuestId();

            if (string.IsNullOrWhiteSpace(request.PassengerName) || string.IsNullOrWhiteSpace(request.PassengerPhone))
            {
                return BadRequest("PassengerName and PassengerPhone are required.");
            }

            var passengerValidationError = BuildFlightPassengerManifest(
                request,
                out var passengers,
                out var adults,
                out var children,
                out var infants);

            if (passengerValidationError is not null)
            {
                return BadRequest(passengerValidationError);
            }

            var seatsRequired = adults + children;
            var normalizedClass = ResolveTravelClass(request.TravelClass);

            if (normalizedClass is null && string.IsNullOrWhiteSpace(request.TravelClass))
            {
                normalizedClass = "Economy";
            }

            if (normalizedClass is null)
            {
                return BadRequest($"Invalid travelClass. Allowed values: {string.Join(", ", AllowedTravelClasses)}.");
            }

            var strategy = dbContext.Database.CreateExecutionStrategy();

            try
            {
                return await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await dbContext.Database.BeginTransactionAsync();

                    var flight = await dbContext.FlightBookings.FirstOrDefaultAsync(x => x.Id == flightId);
                    if (flight is null)
                        throw new Exception("Flight not found.");

                    if (flight.DepartureTime <= DateTime.UtcNow)
                        throw new Exception("Cannot book a flight that already departed.");

                    var classInventory = await dbContext.FlightClassInventories
                        .FirstOrDefaultAsync(x => x.FlightBookingId == flightId && x.TravelClass == normalizedClass);

                    if (classInventory is null)
                        throw new Exception("Selected travelClass is not available for this flight.");

                    if (classInventory.AvailableSeats < seatsRequired)
                        throw new Exception($"Only {classInventory.AvailableSeats} seats are available in {normalizedClass}.");

                    var seatCodes = await ReserveFlightSeatsAsync(flightId, normalizedClass, seatsRequired);
                    if (seatCodes.Count < seatsRequired)
                        throw new Exception("Not enough seats available in selected class.");

                    classInventory.AvailableSeats -= seatsRequired;
                    flight.AvailableSeats = Math.Max(0, flight.AvailableSeats - seatsRequired);

                    var parsedTripType = string.Equals(tripType, "RoundTrip", StringComparison.OrdinalIgnoreCase)
                        ? TripType.RoundTrip
                        : TripType.OneWay;

                    var activePromotionId = request.SelectedPromotionId ?? request.SelectedFeaturedOfferId;

                    var pricingBreakdown = await pricingService.CalculatePricingAsync(
                        flight,
                        normalizedClass,
                        parsedTripType,
                        seatsRequired,
                        request.CouponCode,
                        userId!,
                        activePromotionId);

                    if (!string.IsNullOrWhiteSpace(request.CouponCode) && string.IsNullOrEmpty(pricingBreakdown.CouponCode))
                    {
                        throw new Exception("Invalid or expired coupon code.");
                    }

                    if (activePromotionId.HasValue && !pricingBreakdown.PromotionId.HasValue)
                    {
                        throw new Exception("Selected promotion is not applicable or expired.");
                    }

                    // Increment Coupon UsedCount if used
                    FlightCoupon? appliedCoupon = null;
                    if (pricingBreakdown.CouponId.HasValue)
                    {
                        appliedCoupon = await dbContext.FlightCoupons.FirstOrDefaultAsync(x => x.Id == pricingBreakdown.CouponId.Value);
                        if (appliedCoupon != null)
                        {
                            appliedCoupon.UsedCount += 1;
                        }
                    }

                    var pnr = await GenerateUniqueFlightPnrAsync();
                    var reservation = new FlightReservation
                    {
                        BookingReference = $"FL-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 1000)}",
                        Pnr = pnr,
                        UserId = userId!,
                        FlightBookingId = flight.Id,
                        PassengerName = request.PassengerName.Trim(),
                        PassengerPhone = request.PassengerPhone.Trim(),
                        PassengerEmail = string.IsNullOrWhiteSpace(request.PassengerEmail) ? null : request.PassengerEmail.Trim(),
                        TravelClass = normalizedClass,
                        Adults = adults,
                        Children = children,
                        Infants = infants,
                        SeatsBooked = seatsRequired,
                        TotalPriceInr = pricingBreakdown.FinalAmount,
                        CustomerFareInr = pricingBreakdown.FinalAmount,
                        NetFareInr = pricingBreakdown.SupplierTotalFare,
                        DiscountAmountInr = pricingBreakdown.PromotionDiscount + pricingBreakdown.CouponDiscount,
                        ConvenienceFeeInr = pricingBreakdown.ConvenienceFee,
                        CouponCode = pricingBreakdown.CouponCode,
                        Status = "Booked",
                        BookedAtUtc = DateTime.UtcNow,

                        SupplierBaseFare = pricingBreakdown.SupplierBaseFare,
                        SupplierTaxAmount = pricingBreakdown.SupplierTaxAmount,
                        SupplierTotalFare = pricingBreakdown.SupplierTotalFare,
                        MarkupAmount = pricingBreakdown.MarkupAmount,
                        PromotionId = pricingBreakdown.PromotionId,
                        PromotionName = pricingBreakdown.PromotionName,
                        PromotionDiscount = pricingBreakdown.PromotionDiscount,
                        CouponId = pricingBreakdown.CouponId,
                        CouponDiscount = pricingBreakdown.CouponDiscount,
                        ConvenienceFee = pricingBreakdown.ConvenienceFee,
                        FinalAmount = pricingBreakdown.FinalAmount,
                        PricingSnapshotJson = System.Text.Json.JsonSerializer.Serialize(pricingBreakdown)
                    };

                    dbContext.FlightReservations.Add(reservation);
                    await dbContext.SaveChangesAsync();

                    var seatIndex = 0;
                    var reservationPassengers = passengers!.Select(x =>
                    {
                        string? seatNumber = null;
                        if (x.PassengerType != "Infant")
                        {
                            seatNumber = seatCodes[seatIndex];
                            seatIndex++;
                        }

                        return new FlightReservationPassenger
                        {
                            FlightReservationId = reservation.Id,
                            FullName = x.FullName,
                            PassengerType = x.PassengerType,
                            Gender = x.Gender,
                            SeatNumber = seatNumber
                        };
                    }).ToList();

                    dbContext.FlightReservationPassengers.AddRange(reservationPassengers);

                    if (pricingBreakdown.PromotionId.HasValue)
                    {
                        dbContext.FlightPromotionUsages.Add(new FlightPromotionUsage
                        {
                            FlightPromotionId = pricingBreakdown.PromotionId.Value,
                            ReservationId = reservation.Id,
                            UserId = userId!,
                            DiscountAmount = pricingBreakdown.PromotionDiscount,
                            CreatedAtUtc = DateTime.UtcNow
                        });
                    }

                    if (appliedCoupon is not null && pricingBreakdown.CouponDiscount > 0)
                    {
                        dbContext.FlightCouponUsages.Add(new FlightCouponUsage
                        {
                            FlightReservationId = reservation.Id,
                            CouponCode = appliedCoupon.CouponCode,
                            UsedAtUtc = DateTime.UtcNow,
                            TotalFareInr = pricingBreakdown.FinalAmount,
                            CouponType = appliedCoupon.CouponType,
                            CouponValue = appliedCoupon.Value,
                            CouponAmountInr = pricingBreakdown.CouponDiscount,
                            BookingStatus = reservation.Status
                        });
                    }

                    await TrackFlightRouteBookingCounterAsync(flight.FromCity, flight.ToCity);
                    await dbContext.SaveChangesAsync();

                    if (User?.IsInRole(AuthRoles.Agent) == true && string.Equals(request.PaymentMethod, "Agent Wallet", StringComparison.OrdinalIgnoreCase))
                    {
                        var walletService = HttpContext.RequestServices.GetRequiredService<IAgentWalletService>();
                        await walletService.DebitWalletForBookingAsync(
                            int.Parse(userId!),
                            reservation.TotalPriceInr,
                            reservation.BookingReference,
                            "Flight",
                            $"Flight Booking - {flight.FromCity} to {flight.ToCity} ({flight.Airline}) - Ref: {reservation.BookingReference}"
                        );
                    }

                    await transaction.CommitAsync();

                    try
                    {
                        var reservationId = reservation.Id;
                        var flightId = flight.Id;
                        var backgroundJobQueue = HttpContext.RequestServices.GetRequiredService<IBackgroundJobQueue>();
                        backgroundJobQueue.QueueBackgroundWorkItem(async (sp, ct) =>
                        {
                            var scopedContext = sp.GetRequiredService<AppDbContext>();
                            var scopedNotification = sp.GetRequiredService<IBookingNotificationService>();
                            var scopedLogger = sp.GetRequiredService<ILogger<FlightBookingsController>>();

                            var res = await scopedContext.FlightReservations.FirstOrDefaultAsync(r => r.Id == reservationId, ct);
                            var fl = await scopedContext.FlightBookings.FirstOrDefaultAsync(f => f.Id == flightId, ct);
                            var passengers = await scopedContext.FlightReservationPassengers.Where(p => p.FlightReservationId == reservationId).ToListAsync(ct);

                            if (res != null && fl != null && !string.IsNullOrWhiteSpace(res.PassengerEmail))
                            {
                                var seatNumbers = string.Join(", ",
                                    passengers.Select(x => x.SeatNumber).Where(x => !string.IsNullOrWhiteSpace(x)));

                                if (string.IsNullOrWhiteSpace(seatNumbers))
                                {
                                    seatNumbers = "Auto-assigned";
                                }

                                var payload = new TicketEmailRequestDto
                                {
                                    ToEmail = res.PassengerEmail,
                                    PassengerName = res.PassengerName,
                                    BookingReference = res.BookingReference,
                                    Airline = fl.Airline,
                                    Origin = fl.FromCity,
                                    Destination = fl.ToCity,
                                    DepartureTime = fl.DepartureTime,
                                    ArrivalTime = fl.ArrivalTime,
                                    Pnr = res.Pnr,
                                    SeatNumber = seatNumbers,
                                    Terminal = "TBD",
                                    Price = res.TotalPriceInr,
                                    Currency = "INR",
                                    StopsCount = 0,
                                    DurationMinutes = (int)Math.Max(1, Math.Round((fl.ArrivalTime - fl.DepartureTime).TotalMinutes))
                                };

                                var sent = await scopedNotification.TrySendTicketEmailAsync(payload, ct);
                                if (!sent)
                                {
                                    scopedLogger.LogWarning("Background flight booking email send failed for booking {BookingReference}", res.BookingReference);
                                }
                            }
                        });
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Failed to queue flight booking email for {BookingReference}", reservation.BookingReference);
                    }

                    return CreatedAtAction(
                        nameof(GetFlightBookingById),
                        new { bookingId = reservation.Id },
                        MapFlightReservation(reservation, flight, reservationPassengers));
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("bookings")]
        public async Task<IActionResult> GetFlightBookings(
            [FromQuery] string? passengerPhone, 
            [FromQuery] string? status,
            [FromQuery] string? userId = null)
        {
            var resolvedUserId = userId ?? (currentUserService.IsAuthenticated() ? currentUserService.GetUserOrGuestId() : null);
            if (string.IsNullOrEmpty(resolvedUserId) && string.IsNullOrWhiteSpace(passengerPhone))
            {
                return Unauthorized("Please login to continue booking.");
            }

            var query = dbContext.FlightReservations
                .AsNoTracking()
                .Include(x => x.FlightBooking)
                .AsQueryable();

            if (!string.IsNullOrEmpty(resolvedUserId))
            {
                query = query.Where(x => x.UserId == resolvedUserId);
            }

            if (!string.IsNullOrWhiteSpace(passengerPhone))
            {
                var phone = passengerPhone.Trim();
                query = query.Where(x => EF.Functions.Like(x.PassengerPhone, phone));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim();
                query = query.Where(x => EF.Functions.Like(x.Status, normalizedStatus));
            }

            var bookings = await query
                .OrderByDescending(x => x.BookedAtUtc)
                .Take(200)
                .ToListAsync();

            var bookingIds = bookings.Select(x => x.Id).ToList();
            var passengers = await dbContext.FlightReservationPassengers
                .AsNoTracking()
                .Where(x => bookingIds.Contains(x.FlightReservationId))
                .OrderBy(x => x.Id)
                .ToListAsync();

            var passengersByBooking = passengers
                .GroupBy(x => x.FlightReservationId)
                .ToDictionary(x => x.Key, x => (IReadOnlyList<FlightReservationPassenger>)x.ToList());

            var response = bookings
                .Where(x => x.FlightBooking is not null)
                .Select(x =>
                {
                    if (!passengersByBooking.TryGetValue(x.Id, out var rows))
                    {
                        rows = Array.Empty<FlightReservationPassenger>();
                    }

                    return MapFlightReservation(x, x.FlightBooking!, rows);
                });

            return Ok(response);
        }

        [HttpGet("admin/bookings")]
        public async Task<IActionResult> GetAllFlightBookings([FromQuery] string? passengerPhone, [FromQuery] string? status)
        {
            var query = dbContext.FlightReservations
                .AsNoTracking()
                .Include(x => x.FlightBooking)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(passengerPhone))
            {
                var phone = passengerPhone.Trim();
                query = query.Where(x => EF.Functions.Like(x.PassengerPhone, phone));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim();
                query = query.Where(x => EF.Functions.Like(x.Status, normalizedStatus));
            }

            var bookings = await query
                .OrderByDescending(x => x.BookedAtUtc)
                .Take(500)
                .ToListAsync();

            var bookingIds = bookings.Select(x => x.Id).ToList();
            var passengers = await dbContext.FlightReservationPassengers
                .AsNoTracking()
                .Where(x => bookingIds.Contains(x.FlightReservationId))
                .OrderBy(x => x.Id)
                .ToListAsync();

            var passengersByBooking = passengers
                .GroupBy(x => x.FlightReservationId)
                .ToDictionary(x => x.Key, x => (IReadOnlyList<FlightReservationPassenger>)x.ToList());

            var response = bookings
                .Where(x => x.FlightBooking is not null)
                .Select(x =>
                {
                    if (!passengersByBooking.TryGetValue(x.Id, out var rows))
                    {
                        rows = Array.Empty<FlightReservationPassenger>();
                    }

                    return MapFlightReservation(x, x.FlightBooking!, rows);
                });

            return Ok(response);
        }

        [HttpGet("bookings/{bookingId}")]
        public async Task<IActionResult> GetFlightBookingById(string bookingId)
        {
            if (!currentUserService.IsAuthenticated())
            {
                return Unauthorized("Please login to continue booking.");
            }
            var userId = currentUserService.GetUserOrGuestId();

            FlightReservation? booking = null;
            if (int.TryParse(bookingId, out var idVal))
            {
                booking = await dbContext.FlightReservations
                    .AsNoTracking()
                    .Include(x => x.FlightBooking)
                    .FirstOrDefaultAsync(x => x.Id == idVal && x.UserId == userId);
            }
            else
            {
                booking = await dbContext.FlightReservations
                    .AsNoTracking()
                    .Include(x => x.FlightBooking)
                    .FirstOrDefaultAsync(x => (x.BookingReference == bookingId || x.Pnr == bookingId) && x.UserId == userId);
            }

            if (booking is null || booking.FlightBooking is null)
            {
                return NotFound("Booking not found.");
            }

            var passengers = await dbContext.FlightReservationPassengers
                .AsNoTracking()
                .Where(x => x.FlightReservationId == booking.Id)
                .OrderBy(x => x.Id)
                .ToListAsync();

            return Ok(MapFlightReservation(booking, booking.FlightBooking, passengers));
        }

        [HttpPost("bookings/{bookingId}/cancel")]
        public async Task<IActionResult> CancelFlightBooking(string bookingId, [FromQuery] string? reason)
        {
            if (!currentUserService.IsAuthenticated())
            {
                return Unauthorized("Please login to continue booking.");
            }
            var userId = currentUserService.GetUserOrGuestId();

            var strategy = dbContext.Database.CreateExecutionStrategy();

            try
            {
                var (result, currentRefund) = await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await dbContext.Database.BeginTransactionAsync();

                    FlightReservation? booking = null;
                    if (int.TryParse(bookingId, out var idVal))
                    {
                        booking = await dbContext.FlightReservations
                            .Include(x => x.FlightBooking)
                            .FirstOrDefaultAsync(x => x.Id == idVal && x.UserId == userId);
                    }
                    else
                    {
                        booking = await dbContext.FlightReservations
                            .Include(x => x.FlightBooking)
                            .FirstOrDefaultAsync(x => (x.BookingReference == bookingId || x.Pnr == bookingId) && x.UserId == userId);
                    }

                    if (booking is null || booking.FlightBooking is null)
                        throw new Exception("Booking not found.");

                    if (booking.Status == "Cancelled")
                        throw new Exception("Booking is already cancelled.");

                    // 🔥 GET PASSENGERS (to release seats)
                    var passengers = await dbContext.FlightReservationPassengers
                        .Where(x => x.FlightReservationId == booking.Id)
                        .ToListAsync();

                    var activePassengers = passengers.Where(x => !x.IsCancelled).ToList();
                    if (activePassengers.Count == 0)
                        throw new Exception("Booking is already cancelled.");

                    var seatNumbers = activePassengers
                        .Where(x => !string.IsNullOrWhiteSpace(x.SeatNumber))
                        .Select(x => x.SeatNumber!)
                        .ToList();

                    // 🔥 RELEASE SEATS (CRITICAL FIX)
                    if (seatNumbers.Count > 0)
                    {
                        var seats = await dbContext.FlightSeats
                            .Where(x =>
                                x.FlightBookingId == booking.FlightBookingId &&
                                x.TravelClass == booking.TravelClass &&
                                seatNumbers.Contains(x.SeatCode))
                            .ToListAsync();

                        foreach (var seat in seats)
                        {
                            seat.IsBooked = false;
                        }
                    }

                    // Mark passengers cancelled
                    foreach (var p in activePassengers)
                    {
                        p.IsCancelled = true;
                        p.CancelledAtUtc = DateTime.UtcNow;
                    }

                    // 🔥 UPDATE BOOKING
                    booking.Status = "Cancelled";
                    booking.CancelledAtUtc = DateTime.UtcNow;
                    booking.CancellationReason = string.IsNullOrWhiteSpace(reason)
                        ? "Cancelled by user"
                        : reason.Trim();

                    // 🔥 RESTORE INVENTORY
                    var classInventory = await dbContext.FlightClassInventories
                        .FirstOrDefaultAsync(x =>
                            x.FlightBookingId == booking.FlightBookingId &&
                            x.TravelClass == booking.TravelClass);

                    if (classInventory is null)
                        throw new Exception("Inventory not found.");

                    classInventory.AvailableSeats = Math.Min(
                        classInventory.TotalSeats,
                        classInventory.AvailableSeats + activePassengers.Count);

                    booking.FlightBooking.AvailableSeats = Math.Min(
                        booking.FlightBooking.TotalSeats,
                        booking.FlightBooking.AvailableSeats + activePassengers.Count);

                    // Proportional refund calculation
                    var istNow = DateTime.UtcNow.Add(IndiaOffset);
                    var istDeparture = booking.FlightBooking.DepartureTime.Add(IndiaOffset);
                    var hoursBeforeDeparture = (istDeparture - istNow).TotalHours;

                    decimal refundPercent;
                    if (hoursBeforeDeparture >= 12) refundPercent = 1.00m;
                    else if (hoursBeforeDeparture >= 6) refundPercent = 0.75m;
                    else if (hoursBeforeDeparture > 0) refundPercent = 0.50m;
                    else refundPercent = 0m;

                    var proportionalPrice = (booking.TotalPriceInr / booking.SeatsBooked) * activePassengers.Count;
                    var refundAmount = decimal.Round(proportionalPrice * refundPercent, 2);
                    var cancellationCharge = proportionalPrice - refundAmount;

                    booking.RefundAmountInr = (booking.RefundAmountInr ?? 0m) + refundAmount;
                    booking.CancellationChargeInr = (booking.CancellationChargeInr ?? 0m) + cancellationCharge;

                    await dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var resultPassengers = await dbContext.FlightReservationPassengers
                        .AsNoTracking()
                        .Where(x => x.FlightReservationId == booking.Id)
                        .OrderBy(x => x.Id)
                        .ToListAsync();

                    var mapped = MapFlightReservation(booking, booking.FlightBooking, resultPassengers);
                    return (mapped, refundAmount);
                });

                // Resolve the booking's database integer ID to fetch cancelled passenger IDs
                var dbBookingId = 0;
                if (int.TryParse(bookingId, out var idVal))
                {
                    dbBookingId = idVal;
                }
                else
                {
                    var resolvedBooking = await dbContext.FlightReservations.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.BookingReference == bookingId || x.Pnr == bookingId);
                    if (resolvedBooking != null)
                    {
                        dbBookingId = resolvedBooking.Id;
                    }
                }

                var cancelledPassengerIds = await dbContext.FlightReservationPassengers
                    .Where(x => x.FlightReservationId == dbBookingId)
                    .Select(x => x.Id)
                    .ToListAsync();

                await TrySendFlightCancellationNotificationsAsync(dbBookingId, userId!, cancelledPassengerIds, currentRefund);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("bookings/{bookingId}/cancel-passengers")]
        public async Task<IActionResult> CancelFlightPassengers(string bookingId, [FromBody] CancelPassengersRequestDto request)
        {
            if (!currentUserService.IsAuthenticated())
            {
                return Unauthorized("Please login to continue booking.");
            }
            var userId = currentUserService.GetUserOrGuestId();

            if (request.PassengerIds == null || request.PassengerIds.Count == 0)
            {
                return BadRequest("PassengerIds are required.");
            }

            var strategy = dbContext.Database.CreateExecutionStrategy();

            try
            {
                var (result, currentRefund) = await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await dbContext.Database.BeginTransactionAsync();

                    FlightReservation? booking = null;
                    if (int.TryParse(bookingId, out var idVal))
                    {
                        booking = await dbContext.FlightReservations
                            .Include(x => x.FlightBooking)
                            .FirstOrDefaultAsync(x => x.Id == idVal && x.UserId == userId);
                    }
                    else
                    {
                        booking = await dbContext.FlightReservations
                            .Include(x => x.FlightBooking)
                            .FirstOrDefaultAsync(x => (x.BookingReference == bookingId || x.Pnr == bookingId) && x.UserId == userId);
                    }

                    if (booking is null || booking.FlightBooking is null)
                        throw new Exception("Booking not found.");

                    if (booking.Status == "Cancelled")
                        throw new Exception("Booking is already fully cancelled.");

                    var passengers = await dbContext.FlightReservationPassengers
                        .Where(x => x.FlightReservationId == booking.Id)
                        .ToListAsync();

                    var targetPassengers = passengers
                        .Where(x => request.PassengerIds.Contains(x.Id))
                        .ToList();

                    if (targetPassengers.Count != request.PassengerIds.Count)
                        throw new Exception("One or more passenger IDs are invalid for this reservation.");

                    if (targetPassengers.Any(x => x.IsCancelled))
                        throw new Exception("One or more passenger tickets are already cancelled.");

                    var activePassengersCount = passengers.Count(x => !x.IsCancelled);
                    if (targetPassengers.Count > activePassengersCount)
                        throw new Exception("Cannot cancel more passengers than currently active.");

                    var seatNumbers = targetPassengers
                        .Where(x => !string.IsNullOrWhiteSpace(x.SeatNumber))
                        .Select(x => x.SeatNumber!)
                        .ToList();

                    // Release seats
                    if (seatNumbers.Count > 0)
                    {
                        var seats = await dbContext.FlightSeats
                            .Where(x =>
                                x.FlightBookingId == booking.FlightBookingId &&
                                x.TravelClass == booking.TravelClass &&
                                seatNumbers.Contains(x.SeatCode))
                            .ToListAsync();

                        foreach (var seat in seats)
                        {
                            seat.IsBooked = false;
                        }
                    }

                    // Mark passengers as cancelled
                    foreach (var p in targetPassengers)
                    {
                        p.IsCancelled = true;
                        p.CancelledAtUtc = DateTime.UtcNow;
                    }

                    // Update inventory
                    var classInventory = await dbContext.FlightClassInventories
                        .FirstOrDefaultAsync(x =>
                            x.FlightBookingId == booking.FlightBookingId &&
                            x.TravelClass == booking.TravelClass);

                    if (classInventory is null)
                        throw new Exception("Inventory not found.");

                    classInventory.AvailableSeats = Math.Min(
                        classInventory.TotalSeats,
                        classInventory.AvailableSeats + targetPassengers.Count);

                    booking.FlightBooking.AvailableSeats = Math.Min(
                        booking.FlightBooking.TotalSeats,
                        booking.FlightBooking.AvailableSeats + targetPassengers.Count);

                    // Proportional refund calculation
                    var istNow = DateTime.UtcNow.Add(IndiaOffset);
                    var istDeparture = booking.FlightBooking.DepartureTime.Add(IndiaOffset);
                    var hoursBeforeDeparture = (istDeparture - istNow).TotalHours;

                    decimal refundPercent;
                    if (hoursBeforeDeparture >= 12) refundPercent = 1.00m;
                    else if (hoursBeforeDeparture >= 6) refundPercent = 0.75m;
                    else if (hoursBeforeDeparture > 0) refundPercent = 0.50m;
                    else refundPercent = 0m;

                    var proportionalPrice = (booking.TotalPriceInr / booking.SeatsBooked) * targetPassengers.Count;
                    var refundAmount = decimal.Round(proportionalPrice * refundPercent, 2);
                    var cancellationCharge = proportionalPrice - refundAmount;

                    booking.RefundAmountInr = (booking.RefundAmountInr ?? 0m) + refundAmount;
                    booking.CancellationChargeInr = (booking.CancellationChargeInr ?? 0m) + cancellationCharge;

                    // If all passengers are now cancelled, set full booking status to Cancelled
                    var remainingActiveCount = activePassengersCount - targetPassengers.Count;
                    if (remainingActiveCount == 0)
                    {
                        booking.Status = "Cancelled";
                        booking.CancelledAtUtc = DateTime.UtcNow;
                        booking.CancellationReason = string.IsNullOrWhiteSpace(request.Reason)
                            ? "All passengers cancelled"
                            : request.Reason.Trim();
                    }

                    await dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var resultPassengers = await dbContext.FlightReservationPassengers
                        .AsNoTracking()
                        .Where(x => x.FlightReservationId == booking.Id)
                        .OrderBy(x => x.Id)
                        .ToListAsync();

                    var mapped = MapFlightReservation(booking, booking.FlightBooking, resultPassengers);
                    return (mapped, refundAmount);
                });

                var dbBookingId = 0;
                if (int.TryParse(bookingId, out var idVal))
                {
                    dbBookingId = idVal;
                }
                else
                {
                    var resolvedBooking = await dbContext.FlightReservations.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.BookingReference == bookingId || x.Pnr == bookingId);
                    if (resolvedBooking != null)
                    {
                        dbBookingId = resolvedBooking.Id;
                    }
                }

                await TrySendFlightCancellationNotificationsAsync(dbBookingId, userId!, request.PassengerIds, currentRefund);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        private async Task TrySendFlightCancellationNotificationsAsync(
            int bookingId,
            string userId,
            List<int> newlyCancelledPassengerIds,
            decimal currentRefundAmount)
        {
            var booking = await dbContext.FlightReservations
                .Include(x => x.FlightBooking)
                .FirstOrDefaultAsync(x => x.Id == bookingId && x.UserId == userId);

            if (booking == null || booking.FlightBooking == null)
                return;

            var passengers = await dbContext.FlightReservationPassengers
                .Where(x => x.FlightReservationId == booking.Id)
                .ToListAsync();

            var newlyCancelledPassengers = passengers
                .Where(x => newlyCancelledPassengerIds.Contains(x.Id))
                .ToList();

            var seatNumbers = string.Join(", ",
                newlyCancelledPassengers.Select(x => x.SeatNumber).Where(x => !string.IsNullOrWhiteSpace(x)));

            if (string.IsNullOrWhiteSpace(seatNumbers))
                seatNumbers = "N/A";

            // ---------------- EMAIL ----------------
            if (!string.IsNullOrWhiteSpace(booking.PassengerEmail))
            {
                try
                {
                    await ticketEmailService.SendFlightCancellationAsync(
                        new SendFlightTicketEmailRequest
                        {
                            ToEmail = booking.PassengerEmail,
                            PassengerName = booking.PassengerName,
                            BookingReference = booking.BookingReference,
                            Airline = booking.FlightBooking.Airline,
                            Origin = booking.FlightBooking.FromCity,
                            Destination = booking.FlightBooking.ToCity,
                            DepartureTime = booking.FlightBooking.DepartureTime,
                            ArrivalTime = booking.FlightBooking.ArrivalTime,
                            Pnr = booking.Pnr,
                            SeatNumber = seatNumbers,
                            Terminal = "TBD",
                            Price = booking.TotalPriceInr,
                            Currency = "INR",
                            StopsCount = 0,
                            DurationMinutes = (int)Math.Max(1, Math.Round((booking.FlightBooking.ArrivalTime - booking.FlightBooking.DepartureTime).TotalMinutes)),
                            Passengers = newlyCancelledPassengers.Select(p => new FlightPassengerTicketDto
                            {
                                FullName = p.FullName,
                                PassengerType = p.PassengerType,
                                Gender = p.Gender,
                                SeatNumber = p.SeatNumber
                            }).ToList()
                        },
                        currentRefundAmount
                    );
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Flight cancellation email failed for {BookingReference}", booking.BookingReference);
                }
            }

            // ---------------- WHATSAPP ----------------
            var message = $@"
Booking Cancelled ❌

Ref: {booking.BookingReference}
Route: {booking.FlightBooking.FromCity} to {booking.FlightBooking.ToCity}
Seats: {seatNumbers}
Refund: ₹{currentRefundAmount}
";

            var (sent, msg) = await whatsAppService.SendTextAsync(
                booking.PassengerPhone,
                message
            );

            if (!sent)
                logger.LogWarning("WhatsApp flight cancellation failed: {Message}", msg);
        }
        private async Task<string> GenerateUniqueFlightPnrAsync()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            while (true)
            {
                var pnr = new string(Enumerable.Repeat(chars, 6)
                    .Select(s => s[Random.Shared.Next(s.Length)]).ToArray());
                if (!await dbContext.FlightReservations.AnyAsync(x => x.Pnr == pnr))
                {
                    return pnr;
                }
            }
        }

        private static object MapFlightReservation(
            FlightReservation reservation,
            FlightBooking flight,
            IReadOnlyList<FlightReservationPassenger> passengers)
        {
            var baseDto = new BookingResponseDto
            {
                BookingId = reservation.Id.ToString(),
                Id = reservation.Id,
                BookingReference = reservation.BookingReference,
                Pnr = reservation.Pnr,
                TripType = "Flight",
                TripId = flight.Id,
                TripNumber = flight.FlightNumber,
                ProviderName = flight.Airline,
                FromCity = flight.FromCity,
                ToCity = flight.ToCity,
                DepartureTimeUtc = DateTime.SpecifyKind(flight.DepartureTime, DateTimeKind.Utc),
                ArrivalTimeUtc = DateTime.SpecifyKind(flight.ArrivalTime, DateTimeKind.Utc),
                Status = reservation.Status,
                PassengerName = reservation.PassengerName,
                PassengerPhone = reservation.PassengerPhone,
                PassengerEmail = reservation.PassengerEmail,
                TravelClass = reservation.TravelClass,
                Adults = reservation.Adults,
                Children = reservation.Children,
                Infants = reservation.Infants,
                SeatsBooked = reservation.SeatsBooked,
                TotalPriceInr = reservation.TotalPriceInr,
                BookedAtUtc = DateTime.SpecifyKind(reservation.BookedAtUtc, DateTimeKind.Utc),
                CancelledAtUtc = reservation.CancelledAtUtc.HasValue ? DateTime.SpecifyKind(reservation.CancelledAtUtc.Value, DateTimeKind.Utc) : null,
                CancellationReason = reservation.CancellationReason
            };

            var passengerDtos = passengers.Select(x => new
            {
                Id = x.Id,
                PassengerId = x.Id,
                FullName = x.FullName,
                Name = x.FullName,
                PassengerType = x.PassengerType,
                Gender = x.Gender,
                SeatNumber = x.SeatNumber,
                IsCancelled = x.IsCancelled,
                Status = x.IsCancelled ? "Cancelled" : "Confirmed",
                CancelledAtUtc = x.CancelledAtUtc.HasValue ? (DateTime?)DateTime.SpecifyKind(x.CancelledAtUtc.Value, DateTimeKind.Utc) : null
            }).ToList();

            return new
            {
                BookingId = baseDto.BookingReference, // String reference formatting for frontend routing
                Id = baseDto.BookingId,              // Database integer ID
                baseDto.BookingReference,
                baseDto.Pnr,
                baseDto.TripType,
                baseDto.TripId,
                baseDto.TripNumber,
                baseDto.ProviderName,
                baseDto.FromCity,
                baseDto.ToCity,
                baseDto.DepartureTimeUtc,
                baseDto.ArrivalTimeUtc,
                baseDto.Status,
                baseDto.PassengerName,
                baseDto.PassengerPhone,
                baseDto.PassengerEmail,
                baseDto.TravelClass,
                baseDto.Adults,
                baseDto.Children,
                baseDto.Infants,
                baseDto.SeatsBooked,
                baseDto.TotalPriceInr,
                reservation.CustomerFareInr,
                reservation.NetFareInr,
                reservation.DiscountAmountInr,
                reservation.ConvenienceFeeInr,
                reservation.CouponCode,
                reservation.SupplierBaseFare,
                reservation.SupplierTaxAmount,
                reservation.SupplierTotalFare,
                reservation.MarkupAmount,
                reservation.PromotionId,
                reservation.PromotionName,
                reservation.PromotionDiscount,
                reservation.CouponId,
                reservation.CouponDiscount,
                reservation.ConvenienceFee,
                reservation.FinalAmount,
                reservation.PricingSnapshotJson,
                reservation.CancellationChargeInr,
                reservation.RefundAmountInr,
                baseDto.BookedAtUtc,
                baseDto.CancelledAtUtc,
                baseDto.CancellationReason,
                Passengers = passengerDtos
            };
        }

        private static string? ResolveTravelClass(string? travelClass)
        {
            if (string.IsNullOrWhiteSpace(travelClass))
            {
                return null;
            }

            var value = travelClass.Trim();
            return AllowedTravelClasses.FirstOrDefault(x => x.Equals(value, StringComparison.OrdinalIgnoreCase));
        }

        private static int ClassSortOrder(string travelClass)
        {
            for (var i = 0; i < AllowedTravelClasses.Length; i++)
            {
                if (AllowedTravelClasses[i].Equals(travelClass, StringComparison.OrdinalIgnoreCase))
                {
                    return i;
                }
            }

            return int.MaxValue;
        }

        private static (DateTime StartUtc, DateTime EndUtc) GetUtcRangeForIstDate(DateOnly date)
        {
            var startIst = new DateTimeOffset(date.Year, date.Month, date.Day, 0, 0, 0, IndiaOffset);
            var endIst = startIst.AddDays(1);
            return (startIst.UtcDateTime, endIst.UtcDateTime);
        }

        private static DateTime ToIst(DateTime utcDateTime)
        {
            return DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc).Add(IndiaOffset);
        }

        private static string? BuildFlightPassengerManifest(
            CreateFlightBookingRequestDto request,
            out List<CreateFlightPassengerDto>? passengers,
            out int adults,
            out int children,
            out int infants)
        {
            passengers = null;
            adults = 0;
            children = 0;
            infants = 0;

            if (request.Passengers is not null && request.Passengers.Count > 0)
            {
                var normalized = new List<CreateFlightPassengerDto>();
                for (var i = 0; i < request.Passengers.Count; i++)
                {
                    var passenger = request.Passengers[i];
                    if (string.IsNullOrWhiteSpace(passenger.FullName))
                    {
                        return $"Passenger at index {i} has invalid FullName.";
                    }

                    var type = AllowedPassengerTypes.FirstOrDefault(x =>
                        x.Equals(passenger.PassengerType?.Trim(), StringComparison.OrdinalIgnoreCase));
                    if (type is null)
                    {
                        return $"Passenger at index {i} has invalid PassengerType. Allowed: {string.Join(", ", AllowedPassengerTypes)}.";
                    }

                    var gender = AllowedPassengerGenders.FirstOrDefault(x =>
                        x.Equals(passenger.Gender?.Trim(), StringComparison.OrdinalIgnoreCase));
                    if (gender is null)
                    {
                        return $"Passenger at index {i} has invalid Gender. Allowed: {string.Join(", ", AllowedPassengerGenders)}.";
                    }

                    normalized.Add(new CreateFlightPassengerDto
                    {
                        FullName = passenger.FullName.Trim(),
                        PassengerType = type,
                        Gender = gender
                    });
                }

                adults = normalized.Count(x => x.PassengerType == "Adult");
                children = normalized.Count(x => x.PassengerType == "Child");
                infants = normalized.Count(x => x.PassengerType == "Infant");

                if (adults == 0 && (children > 0 || infants > 0))
                {
                    return "At least one adult is required when child or infant is present.";
                }

                if (infants > adults)
                {
                    return "Infants cannot be more than adults.";
                }

                if ((adults + children) <= 0)
                {
                    return "At least one seat is required (Adult/Child).";
                }

                passengers = normalized;
                return null;
            }

            if (request.Adults < 0 || request.Children < 0 || request.Infants < 0)
            {
                return "Adults, Children and Infants cannot be negative.";
            }

            if (request.Adults == 0 && (request.Children > 0 || request.Infants > 0))
            {
                return "At least one adult is required when child or infant is present.";
            }

            if (request.Infants > request.Adults)
            {
                return "Infants cannot be more than adults.";
            }

            adults = request.Adults;
            children = request.Children;
            infants = request.Infants;

            if ((adults + children) <= 0)
            {
                return "At least one seat is required (Adult/Child).";
            }

            passengers = new List<CreateFlightPassengerDto>();
            for (var i = 1; i <= adults; i++)
            {
                passengers.Add(new CreateFlightPassengerDto
                {
                    FullName = $"Adult Passenger {i}",
                    PassengerType = "Adult",
                    Gender = "Male"
                });
            }

            for (var i = 1; i <= children; i++)
            {
                passengers.Add(new CreateFlightPassengerDto
                {
                    FullName = $"Child Passenger {i}",
                    PassengerType = "Child",
                    Gender = "Male"
                });
            }

            for (var i = 1; i <= infants; i++)
            {
                passengers.Add(new CreateFlightPassengerDto
                {
                    FullName = $"Infant Passenger {i}",
                    PassengerType = "Infant",
                    Gender = "Male"
                });
            }

            return null;
        }

        private async Task<List<string>> ReserveFlightSeatsAsync(int flightId, string travelClass, int seatCount)
        {
            if (seatCount <= 0)
                return new List<string>();

            await EnsureFlightSeatsGeneratedAsync(flightId, travelClass);

            // 🔒 Step 1: Lock seats using transaction-level isolation
            var seats = await dbContext.FlightSeats
                .Where(x => x.FlightBookingId == flightId &&
                            x.TravelClass == travelClass &&
                            !x.IsBooked)
               //.OrderBy(x => int.Parse(new string(x.SeatCode.TakeWhile(char.IsDigit).ToArray())))
               .OrderBy(x => x.SeatCode)
                .ThenBy(x => x.SeatCode)
                .Take(seatCount)
                .ToListAsync();

            if (seats.Count < seatCount)
                return new List<string>();

            // 🔒 Step 2: Mark them booked
            foreach (var seat in seats)
            {
                seat.IsBooked = true;
            }

            // 🔒 Step 3: Save inside SAME transaction
            await dbContext.SaveChangesAsync();

            return seats.Select(x => x.SeatCode).ToList();
        }

        private async Task EnsureFlightSchedulesForDateAsync(DateOnly date, string? fromCity, string? toCity)
        {
            var fromCities = string.IsNullOrWhiteSpace(fromCity)
                ? DynamicCities
                : DynamicCities.Where(x => x.Equals(fromCity, StringComparison.OrdinalIgnoreCase)).ToArray();

            var toCities = string.IsNullOrWhiteSpace(toCity)
                ? DynamicCities
                : DynamicCities.Where(x => x.Equals(toCity, StringComparison.OrdinalIgnoreCase)).ToArray();

            if (fromCities.Length == 0 || toCities.Length == 0)
            {
                return;
            }

            var (startUtc, endUtc) = GetUtcRangeForIstDate(date);
            var existingRows = await dbContext.FlightBookings
                .AsNoTracking()
                .Where(x => x.DepartureTime >= startUtc && x.DepartureTime < endUtc)
                .Select(x => new { x.FlightNumber, x.FromCity, x.ToCity, x.DepartureTime })
                .ToListAsync();

            var existingSet = existingRows
                .Select(x => $"{x.FlightNumber}|{x.FromCity}|{x.ToCity}|{x.DepartureTime:O}")
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var flights = new List<FlightBooking>();
            var totalSeats = ClassSeatConfig.Values.Sum();
            foreach (var from in fromCities)
            {
                foreach (var to in toCities)
                {
                    if (from.Equals(to, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    foreach (var slot in DynamicFlightSlots)
                    {
                        var keySeed = $"{from}-{to}-{date:yyyyMMdd}-{slot.Hour}:{slot.Minute}";
                        var hash = StableHash(keySeed);
                        var airline = DynamicAirlines[hash % DynamicAirlines.Length];
                        var durationMinutes = 65 + (hash % 170);
                        var depUtc = UtcFromIst(date, slot.Hour, slot.Minute);
                        var flightNumber = $"{airline.Code}-{100 + (hash % 900)}";
                        var key = $"{flightNumber}|{from}|{to}|{depUtc:O}";
                        if (existingSet.Contains(key))
                        {
                            continue;
                        }

                        var economyPrice = decimal.Round(
                            2400m + (durationMinutes * 18m) + (hash % 1800),
                            2,
                            MidpointRounding.AwayFromZero);

                        flights.Add(new FlightBooking
                        {
                            FlightNumber = flightNumber,
                            Airline = airline.Name,
                            FromCity = from,
                            ToCity = to,
                            DepartureTime = depUtc,
                            ArrivalTime = depUtc.AddMinutes(durationMinutes),
                            PriceInr = economyPrice,
                            TotalSeats = totalSeats,
                            AvailableSeats = totalSeats,
                            CabinClass = "MultiClass"
                        });
                    }
                }
            }

            if (flights.Count == 0)
            {
                return;
            }

            await dbContext.FlightBookings.AddRangeAsync(flights);
            await dbContext.SaveChangesAsync();

            var inventories = new List<FlightClassInventory>();
            foreach (var flight in flights)
            {
                foreach (var travelClass in AllowedTravelClasses)
                {
                    var seats = ClassSeatConfig[travelClass];
                    inventories.Add(new FlightClassInventory
                    {
                        FlightBookingId = flight.Id,
                        TravelClass = travelClass,
                        TotalSeats = seats,
                        AvailableSeats = seats,
                        PriceInr = decimal.Round(
                            flight.PriceInr * ClassPriceMultiplier[travelClass],
                            2,
                            MidpointRounding.AwayFromZero)
                    });
                }
            }

            if (inventories.Count > 0)
            {
                await dbContext.FlightClassInventories.AddRangeAsync(inventories);
                await dbContext.SaveChangesAsync();
            }

        }

        private async Task EnsureFlightSeatsGeneratedAsync(int flightId, string travelClass)
        {
            var exists = await dbContext.FlightSeats
                .AnyAsync(x => x.FlightBookingId == flightId && x.TravelClass == travelClass);
            if (exists) return;

            if (!ClassSeatConfig.TryGetValue(travelClass, out var classSeats) || classSeats <= 0)
            {
                return;
            }

            var seatCodes = BuildFlightSeatCodes(classSeats);
            var seatsToInsert = seatCodes.Select(seatCode => new FlightSeat
            {
                FlightBookingId = flightId,
                TravelClass = travelClass,
                SeatCode = seatCode,
                IsBooked = false
            }).ToList();

            try
            {
                await dbContext.FlightSeats.AddRangeAsync(seatsToInsert);
                await dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("Duplicate entry") == true || ex.Message.Contains("Duplicate entry"))
            {
                dbContext.ChangeTracker.Clear();
            }
        }

        private static List<string> BuildFlightSeatCodes(int totalSeats)
        {
            var letters = new[] { 'A', 'B', 'C', 'D', 'E', 'F' };
            var seats = new List<string>(totalSeats);
            for (var i = 1; i <= totalSeats; i++)
            {
                var row = ((i - 1) / letters.Length) + 1;
                var letter = letters[(i - 1) % letters.Length];
                seats.Add($"{row}{letter}");
            }

            return seats;
        }

        private static DateTime UtcFromIst(DateOnly date, int hour, int minute)
        {
            var ist = new DateTime(date.Year, date.Month, date.Day, hour, minute, 0, DateTimeKind.Unspecified);
            return DateTime.SpecifyKind(ist - IndiaOffset, DateTimeKind.Utc);
        }

        private static int StableHash(string value)
        {
            unchecked
            {
                var hash = 23;
                foreach (var c in value)
                {
                    hash = (hash * 31) + c;
                }

                return Math.Abs(hash);
            }
        }

        private async Task IncrementFlightRouteSearchCounterAsync(
            string fromCity,
            string toCity,
            string? userOrGuestId,
            DateOnly? departDate,
            DateOnly? returnDate,
            string tripType,
            int adults,
            int children,
            int infants)
        {
            var stat = await dbContext.FlightRouteStats
                .FirstOrDefaultAsync(x => x.FromCity == fromCity && x.ToCity == toCity);

            if (stat is null)
            {
                dbContext.FlightRouteStats.Add(new FlightRouteStat
                {
                    FromCity = fromCity,
                    ToCity = toCity,
                    SearchCount = 1,
                    BookingCount = 0,
                    LastSearchedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                stat.SearchCount += 1;
                stat.LastSearchedAtUtc = DateTime.UtcNow;
            }

            dbContext.FlightSearchLogs.Add(new FlightSearchLog
            {
                UserId = currentUserService.IsAuthenticated() ? userOrGuestId : null,
                UserOrGuestId = userOrGuestId,
                IsGuest = currentUserService.IsGuest(),
                FromCity = fromCity,
                ToCity = toCity,
                DepartDate = departDate,
                ReturnDate = returnDate,
                TripType = string.IsNullOrWhiteSpace(tripType) ? "OneWay" : tripType.Trim(),
                Adults = adults < 0 ? 0 : adults,
                Children = children < 0 ? 0 : children,
                Infants = infants < 0 ? 0 : infants,
                SearchedAtUtc = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync();
        }

        private async Task TrackFlightRouteBookingCounterAsync(string fromCity, string toCity)
        {
            var stat = await dbContext.FlightRouteStats
                .FirstOrDefaultAsync(x => x.FromCity == fromCity && x.ToCity == toCity);

            if (stat is null)
            {
                dbContext.FlightRouteStats.Add(new FlightRouteStat
                {
                    FromCity = fromCity,
                    ToCity = toCity,
                    SearchCount = 0,
                    BookingCount = 1,
                    LastBookedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                stat.BookingCount += 1;
                stat.LastBookedAtUtc = DateTime.UtcNow;
            }
        }

        private async Task<decimal> GetActiveFlightConvenienceFeeAsync(decimal baseFare)
        {
            var feeRow = await dbContext.FlightConvenienceFees
                .AsNoTracking()
                .OrderByDescending(x => x.UpdateDateUtc)
                .FirstOrDefaultAsync(x => x.Status == "Active");

            if (feeRow is null)
            {
                return 0m;
            }

            return CalculateConvenienceFee(baseFare, feeRow);
        }

        private static decimal CalculateCouponAmount(decimal baseFare, FlightCoupon coupon)
        {
            var amount = coupon.CouponType.Equals("Percentage", StringComparison.OrdinalIgnoreCase)
                ? baseFare * (coupon.Value / 100m)
                : coupon.Value;

            if (amount < 0)
            {
                amount = 0;
            }

            if (amount > baseFare)
            {
                amount = baseFare;
            }

            return decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        }

        private static decimal CalculateConvenienceFee(decimal baseFare, FlightConvenienceFee fee)
        {
            var amount = fee.AmountType.Equals("Percentage", StringComparison.OrdinalIgnoreCase)
                ? baseFare * (fee.Value / 100m)
                : fee.Value;

            if (amount < 0)
            {
                amount = 0;
            }

            return decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        }

        private async Task TrySendFlightBookingEmailAsync(
            FlightReservation reservation,
            FlightBooking flight,
            IReadOnlyList<FlightReservationPassenger> passengers)
        {
            if (string.IsNullOrWhiteSpace(reservation.PassengerEmail))
            {
                return;
            }

            var seatNumbers = string.Join(", ",
                passengers
                    .Select(x => x.SeatNumber)
                    .Where(x => !string.IsNullOrWhiteSpace(x)));

            if (string.IsNullOrWhiteSpace(seatNumbers))
            {
                seatNumbers = "Auto-assigned";
            }

            var payload = new TicketEmailRequestDto
            {
                ToEmail = reservation.PassengerEmail,
                PassengerName = reservation.PassengerName,
                BookingReference = reservation.BookingReference,
                Airline = flight.Airline,
                Origin = flight.FromCity,
                Destination = flight.ToCity,
                DepartureTime = flight.DepartureTime,
                ArrivalTime = flight.ArrivalTime,
                Pnr = reservation.Pnr,
                SeatNumber = seatNumbers,
                Terminal = "TBD",
                Price = reservation.TotalPriceInr,
                Currency = "INR",
                StopsCount = 0,
                DurationMinutes = (int)Math.Max(1, Math.Round((flight.ArrivalTime - flight.DepartureTime).TotalMinutes))
            };

            var sent = await bookingNotificationService.TrySendTicketEmailAsync(payload, HttpContext.RequestAborted);
            if (!sent)
            {
                logger.LogWarning("Flight booking email send failed for booking {BookingReference}", reservation.BookingReference);
            }
        }

        private async Task<List<FlightBooking>> GetOrCreateAmadeusFlightsInDbAsync(List<FlightOfferDto> offers)
        {
            var flights = new List<FlightBooking>();

            var groupedOffers = offers.GroupBy(o => new {
                o.Airline,
                o.Origin,
                o.Destination,
                o.DepartureTime,
                o.ArrivalTime
            });

            foreach (var group in groupedOffers)
            {
                var key = group.Key;
                var airlineName = GetAirlineName(key.Airline);
                var fromCity = IataToCity.TryGetValue(key.Origin, out var fromVal) ? fromVal : key.Origin;
                var toCity = IataToCity.TryGetValue(key.Destination, out var toVal) ? toVal : key.Destination;

                var hashSeed = $"{key.Airline}-{fromCity}-{toCity}-{key.DepartureTime:yyyyMMddHHmm}";
                var hashVal = StableHash(hashSeed);
                var flightNum = $"{key.Airline}-{100 + (hashVal % 900)}";

                var existing = await dbContext.FlightBookings
                    .FirstOrDefaultAsync(f => f.FlightNumber == flightNum
                                              && f.DepartureTime == DateTime.SpecifyKind(key.DepartureTime, DateTimeKind.Utc)
                                              && f.FromCity == fromCity
                                              && f.ToCity == toCity);

                var basePrice = group.Min(o => o.Price);
                if (group.First().Currency != "INR")
                {
                    var rate = group.First().Currency == "USD" ? 83.5m : 91.5m;
                    basePrice = basePrice * rate;
                }

                decimal priceInr = decimal.Round(basePrice, 2, MidpointRounding.AwayFromZero);

                if (existing != null)
                {
                    existing.PriceInr = priceInr;
                    existing.AvailableSeats = group.Max(o => o.AvailableSeats);
                    flights.Add(existing);
                }
                else
                {
                    var newFlight = new FlightBooking
                    {
                        FlightNumber = flightNum,
                        Airline = airlineName,
                        FromCity = fromCity,
                        ToCity = toCity,
                        DepartureTime = DateTime.SpecifyKind(key.DepartureTime, DateTimeKind.Utc),
                        ArrivalTime = DateTime.SpecifyKind(key.ArrivalTime, DateTimeKind.Utc),
                        PriceInr = priceInr,
                        TotalSeats = 180,
                        AvailableSeats = group.Max(o => o.AvailableSeats),
                        CabinClass = "MultiClass"
                    };
                    dbContext.FlightBookings.Add(newFlight);
                    flights.Add(newFlight);
                }
            }

            await dbContext.SaveChangesAsync();
            return flights;
        }

        private async Task EnsureFlightClassInventoriesForFlightAsync(int flightId, decimal basePrice)
        {
            var exists = await dbContext.FlightClassInventories.AnyAsync(x => x.FlightBookingId == flightId);
            if (exists) return;

            var inventories = new List<FlightClassInventory>();
            foreach (var travelClass in AllowedTravelClasses)
            {
                var seats = ClassSeatConfig[travelClass];
                inventories.Add(new FlightClassInventory
                {
                    FlightBookingId = flightId,
                    TravelClass = travelClass,
                    TotalSeats = seats,
                    AvailableSeats = seats,
                    PriceInr = decimal.Round(
                        basePrice * ClassPriceMultiplier[travelClass],
                        2,
                        MidpointRounding.AwayFromZero)
                });
            }
            dbContext.FlightClassInventories.AddRange(inventories);
            await dbContext.SaveChangesAsync();
        }

        private static string GetAirlineName(string code)
        {
            var airlineMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["AI"] = "Air India",
                ["IX"] = "Air India Express",
                ["6E"] = "IndiGo",
                ["QP"] = "Akasa Air",
                ["SG"] = "SpiceJet",
                ["UK"] = "Vistara"
            };
            return airlineMap.TryGetValue(code, out var name) ? name : (code + " Air");
        }
    }
}

