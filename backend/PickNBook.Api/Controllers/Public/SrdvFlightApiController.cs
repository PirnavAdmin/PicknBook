using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;
using PickNBook.Api.Data;
using System;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PickNBook.Api.Models.Config;

namespace PickNBook.Api.Controllers.Public
{
    [Route("api/flight/srdv")]
    [ApiController]
    public class SrdvFlightApiController : ControllerBase
    {
        private readonly ISrdvFlightService _srdvFlightService;
        private readonly IFlightPricingService _pricingService;
        private readonly AppDbContext _dbContext;
        private readonly ITicketEmailService _ticketEmailService;
        private readonly IAgentWalletService _walletService;
        private readonly SrdvSettings _srdvSettings;
        private readonly ILogger<SrdvFlightApiController> _logger;

        public SrdvFlightApiController(
            ISrdvFlightService srdvFlightService, 
            IFlightPricingService pricingService,
            AppDbContext dbContext,
            ITicketEmailService ticketEmailService,
            IAgentWalletService walletService,
            IOptions<SrdvSettings> srdvSettings,
            ILogger<SrdvFlightApiController> logger)
        {
            _srdvFlightService = srdvFlightService;
            _pricingService = pricingService;
            _dbContext = dbContext;
            _ticketEmailService = ticketEmailService;
            _walletService = walletService;
            _srdvSettings = srdvSettings.Value;
            _logger = logger;
        }

        [HttpPost("Search")]
        public async Task<IActionResult> Search([FromBody] AirSearchRequestDto request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
                
                var responseRaw = await _srdvFlightService.SearchFlightsRawAsync(request);
                var jsonNode = JsonNode.Parse(responseRaw);
                var responseObj = jsonNode; // The root is the response object
                
                var errorCode = responseObj?["Error"]?["ErrorCode"]?.ToString();
                
                var requestTripType = request.JourneyType == 2 ? TripType.RoundTrip : (request.JourneyType == 3 ? TripType.MultiCity : TripType.OneWay);
                
                _logger.LogInformation("Search Flight API triggered. SRDV ErrorCode: {ErrorCode}", errorCode);
                
                if (errorCode == "0" || errorCode == "1") // Assuming 0 is success based on the JSON
                {
                    try 
                    {
                        var traceId = responseObj?["TraceId"]?.ToString();
                        
                        var searchLog = new FlightSearchLog
                        {
                            SearchedAtUtc = DateTime.UtcNow,
                            FromCity = request.Segments.FirstOrDefault()?.Origin ?? "",
                            ToCity = request.Segments.LastOrDefault()?.Destination ?? "",
                            DepartDate = request.Segments.FirstOrDefault() != null ? DateOnly.FromDateTime(request.Segments.First().PreferredDepartureTime) : null,
                            ReturnDate = request.Segments.Count > 1 ? DateOnly.FromDateTime(request.Segments.Last().PreferredDepartureTime) : null,
                            Adults = request.AdultCount,
                            Children = request.ChildCount,
                            Infants = request.InfantCount,
                            TripType = request.JourneyType.ToString(),
                            UserId = string.IsNullOrEmpty(userId) ? null : userId,
                            IsGuest = string.IsNullOrEmpty(userId),
                            UserOrGuestId = userId,
                            TraceId = traceId,
                            EndUserIp = request.EndUserIp
                        };
                        
                        _dbContext.FlightSearchLogs.Add(searchLog);
                        await _dbContext.SaveChangesAsync();
                        _logger.LogInformation("Successfully inserted flight search log to Database. TraceId: {TraceId}", traceId);
                    }
                    catch (Exception dbEx)
                    {
                        _logger.LogError(dbEx, "FATAL: Failed to insert flight search log to database!");
                        // Don't fail the whole request just because logging failed
                    }
                }
                else
                {
                    _logger.LogWarning("ErrorCode was not 0. It was {ErrorCode}. Not logging to DB.", errorCode);
                }

                var resultsArr = responseObj?["Results"]?.AsArray();
                    if (resultsArr != null)
                    {
                        foreach (var flightList in resultsArr)
                        {
                            var flightsArr = flightList?.AsArray();
                            if (flightsArr != null)
                            {
                                foreach (var result in flightsArr)
                                {
                                    if (result == null) continue;
                                    
                                    var segmentsArr = result["Segments"]?[0]?.AsArray();
                                    if (segmentsArr == null || segmentsArr.Count == 0) continue;
                                    
                                    var firstSegment = segmentsArr[0];
                                    var lastSegment = segmentsArr[segmentsArr.Count - 1];
                                    
                                    var airlineCode = firstSegment?["Airline"]?["AirlineCode"]?.GetValue<string>() ?? "";
                                    var airlineName = firstSegment?["Airline"]?["AirlineName"]?.GetValue<string>() ?? "";
                                    var origin = firstSegment?["Origin"]?["Airport"]?["CityCode"]?.GetValue<string>() ?? "";
                                    var destination = lastSegment?["Destination"]?["Airport"]?["CityCode"]?.GetValue<string>() ?? "";
                                    
                                    var depTimeNode = firstSegment?["DepTime"] ?? firstSegment?["Origin"]?["DepTime"];
                                    var depTime = depTimeNode?.GetValue<DateTime>() ?? DateTime.UtcNow;
                                    
                                    var travelClassStr = firstSegment?["CabinClass"]?.GetValue<int>() switch
                                    {
                                        2 => "Economy",
                                        3 => "PremiumEconomy",
                                        4 => "Business",
                                        5 => "PremiumBusiness",
                                        6 => "First",
                                        _ => "Economy"
                                    };

                                    var fareDataMultipleArr = result["FareDataMultiple"]?.AsArray();
                                    if (fareDataMultipleArr != null && fareDataMultipleArr.Count > 0)
                                    {
                                        decimal? firstFinalAmount = null;
                                        foreach (var fareData in fareDataMultipleArr)
                                        {
                                            if (fareData == null) continue;
                                            var fObj = fareData["Fare"];
                                            if (fObj != null)
                                            {
                                                var bf = fObj["BaseFare"]?.GetValue<decimal>() ?? 0m;
                                                var tx = fObj["Tax"]?.GetValue<decimal>() ?? 0m;
                                                
                                                var breakdown = await _pricingService.CalculatePricingAsync(
                                                    supplierBaseFare: bf,
                                                    supplierTaxAmount: tx,
                                                    airlineCode: airlineCode,
                                                    airlineName: airlineName,
                                                    origin: origin,
                                                    destination: destination,
                                                    departureDate: depTime,
                                                    travelClass: travelClassStr,
                                                    tripType: requestTripType,
                                                    passengerCount: request.AdultCount + request.ChildCount + request.InfantCount,
                                                    couponCode: null,
                                                    userId: userId
                                                );
                                                
                                                fObj["PublishedFare"] = breakdown.FinalAmount;
                                                fObj["OfferedFare"] = breakdown.FinalAmount;
                                                if (fareData["OfferedFare"] != null) fareData["OfferedFare"] = breakdown.FinalAmount;
                                                
                                                fareData["PickNBookMarkup"] = breakdown.MarkupAmount;
                                                fareData["PickNBookDiscount"] = breakdown.PromotionDiscount + breakdown.CouponDiscount;

                                                if (firstFinalAmount == null)
                                                    firstFinalAmount = breakdown.FinalAmount;
                                            }
                                        }
                                        if (firstFinalAmount != null && result["OfferedFare"] != null)
                                        {
                                            result["OfferedFare"] = firstFinalAmount;
                                        }
                                    }
                                    else
                                    {
                                        var fareObj = result["Fare"];
                                        var baseFare = fareObj?["BaseFare"]?.GetValue<decimal>() ?? 0m;
                                        var tax = fareObj?["Tax"]?.GetValue<decimal>() ?? 0m;
                                        
                                        var pricingBreakdown = await _pricingService.CalculatePricingAsync(
                                            supplierBaseFare: baseFare,
                                            supplierTaxAmount: tax,
                                            airlineCode: airlineCode,
                                            airlineName: airlineName,
                                            origin: origin,
                                            destination: destination,
                                            departureDate: depTime,
                                            travelClass: travelClassStr,
                                            tripType: requestTripType,
                                            passengerCount: request.AdultCount + request.ChildCount + request.InfantCount,
                                            couponCode: null,
                                            userId: userId
                                        );
                                        
                                        if (fareObj != null)
                                        {
                                            fareObj["PublishedFare"] = pricingBreakdown.FinalAmount;
                                            fareObj["OfferedFare"] = pricingBreakdown.FinalAmount;
                                        }
                                        if (result["OfferedFare"] != null) result["OfferedFare"] = pricingBreakdown.FinalAmount;
                                        
                                        result["PickNBookMarkup"] = pricingBreakdown.MarkupAmount;
                                        result["PickNBookDiscount"] = pricingBreakdown.PromotionDiscount + pricingBreakdown.CouponDiscount;
                                    }
                                }
                            }
                        }
                    }
                return Ok(jsonNode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching flights.");
                return StatusCode(500, new { message = "Failed to search flights.", error = ex.Message });
            }
        }

        [HttpPost("GetCalendarFare")]
        public async Task<IActionResult> GetCalendarFare([FromBody] CalendarFareRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.GetCalendarFareRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Calendar Fare.");
                return StatusCode(500, new { message = "Failed to get Calendar Fare.", error = ex.Message });
            }
        }

        [HttpPost("FareRule")]
        public async Task<IActionResult> FareRule([FromBody] AirFareRuleRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.GetFareRuleRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting fare rule.");
                return StatusCode(500, new { message = "Failed to get fare rule.", error = ex.Message });
            }
        }

        [HttpPost("FareQuote")]
        public async Task<IActionResult> FareQuote([FromBody] AirFareRuleRequestDto request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
                
                var responseRaw = await _srdvFlightService.GetFareQuoteRawAsync(request);
                var jsonNode = JsonNode.Parse(responseRaw);
                
                // Support both TBO (wrapped in "Response") and MixAPI (flat root)
                var responseObj = jsonNode?["Response"] ?? jsonNode;
                
                // MixAPI doesn't have ResponseStatus, it uses Error.ErrorCode
                var errorCode = responseObj?["Error"]?["ErrorCode"]?.ToString();
                var isSuccess = responseObj?["ResponseStatus"]?.GetValue<int>() == 1 || 
                                (errorCode == "0" || errorCode == null);

                if (isSuccess)
                {
                    var result = responseObj?["Results"];
                    if (result != null)
                    {
                        var fareObj = result["Fare"];
                        var baseFare = fareObj?["BaseFare"]?.GetValue<decimal>() ?? 0m;
                        var tax = fareObj?["Tax"]?.GetValue<decimal>() ?? 0m;
                        
                        var segmentsArr = result["Segments"]?[0]?.AsArray();
                        if (segmentsArr != null && segmentsArr.Count > 0)
                        {
                            var firstSegment = segmentsArr[0];
                            var lastSegment = segmentsArr[segmentsArr.Count - 1];
                            
                            var airlineCode = firstSegment?["Airline"]?["AirlineCode"]?.GetValue<string>() ?? "";
                            var airlineName = firstSegment?["Airline"]?["AirlineName"]?.GetValue<string>() ?? "";
                            var origin = firstSegment?["Origin"]?["Airport"]?["CityCode"]?.GetValue<string>() ?? "";
                            var destination = lastSegment?["Destination"]?["Airport"]?["CityCode"]?.GetValue<string>() ?? "";
                            var depTime = firstSegment?["Origin"]?["DepTime"]?.GetValue<DateTime>() ?? DateTime.UtcNow;
                            var travelClassStr = firstSegment?["CabinClass"]?.GetValue<int>() switch
                            {
                                2 => "Economy",
                                3 => "PremiumEconomy",
                                4 => "Business",
                                5 => "PremiumBusiness",
                                6 => "First",
                                _ => "Economy"
                            };

                                var pricingBreakdown = await _pricingService.CalculatePricingAsync(
                                    supplierBaseFare: baseFare,
                                    supplierTaxAmount: tax,
                                    airlineCode: airlineCode,
                                    airlineName: airlineName,
                                    origin: origin,
                                    destination: destination,
                                    departureDate: depTime,
                                    travelClass: travelClassStr,
                                    tripType: TripType.OneWay,
                                    passengerCount: 1, // Assume 1 for FareQuote as we don't know total pax in request without extra info
                                    couponCode: request.CouponCode,
                                    userId: userId
                                );
                            
                            result["B2CFinalFare"] = pricingBreakdown.FinalAmount;
                            
                            result["PickNBookMarkup"] = pricingBreakdown.MarkupAmount;
                            result["PickNBookDiscount"] = pricingBreakdown.PromotionDiscount + pricingBreakdown.CouponDiscount;

                            var activeOffers = await _dbContext.FeaturedOffers
                                .Where(f => f.IsActive && f.BookingType.ToLower() == "flight")
                                .Select(f => new { f.Title, f.Description, f.DiscountType, f.DiscountValue, Code = f.Title })
                                .ToListAsync();
                            result["PickNBookAvailableOffers"] = JsonSerializer.SerializeToNode(activeOffers);
                        }
                    }
                }
                return Ok(jsonNode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting fare quote.");
                return StatusCode(500, new { message = "Failed to get fare quote.", error = ex.Message });
            }
        }

        [HttpPost("SSR")]
        public async Task<IActionResult> SSR([FromBody] AirFareRuleRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.GetSSRRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting SSR.");
                return StatusCode(500, new { message = "Failed to get SSR.", error = ex.Message });
            }
        }

        [HttpPost("SeatMap")]
        public async Task<IActionResult> SeatMap([FromBody] AirFareRuleRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.GetSeatMapRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting seat map.");
                return StatusCode(500, new { message = "Failed to get seat map.", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("TicketLCC")]
        public async Task<IActionResult> TicketLCC([FromBody] TicketLCCRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.TicketLCCRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                var root = doc.RootElement;
                
                bool isSuccess = false;
                
                if (root.TryGetProperty("ResponseStatus", out var status))
                {
                    if (status.ValueKind == JsonValueKind.Number && status.GetInt32() == 1) isSuccess = true;
                    if (status.ValueKind == JsonValueKind.String && status.GetString() == "1") isSuccess = true;
                }
                
                if (root.TryGetProperty("Error", out var err) && err.TryGetProperty("ErrorCode", out var errCode))
                {
                    if (errCode.ValueKind == JsonValueKind.Number && errCode.GetInt32() == 0) isSuccess = true;
                    if (errCode.ValueKind == JsonValueKind.String && (errCode.GetString() == "0" || errCode.GetString() == "")) isSuccess = true;
                    if (errCode.ValueKind == JsonValueKind.Null) isSuccess = true;
                }

                JsonElement resp = root;
                if (root.TryGetProperty("Response", out var responseNode))
                {
                    resp = responseNode;
                }

                string pnr = resp.TryGetProperty("PNR", out var pnrProp) ? (pnrProp.GetString() ?? "") : "";
                string bookingId = resp.TryGetProperty("BookingId", out var bIdProp) ? (bIdProp.ToString() ?? "") : "";

                if (isSuccess && (!string.IsNullOrEmpty(pnr) || !string.IsNullOrEmpty(bookingId)))
                {
                    decimal totalFare = 0, baseFare = 0, tax = 0, netFare = 0, customerFare = 0;
                    string airline = "", flightNumber = "", fromCity = "", toCity = "";
                    DateTime depTime = DateTime.MinValue, arrTime = DateTime.MinValue;
                    bool nonRefundable = false;
                    string segmentsJson = "", fareRulesJson = "", travelClassStr = "Economy";
                    string cancellationCharges = "";
                    string partialSegmentCancellation = "";

                    if (resp.TryGetProperty("FlightItinerary", out var itinerary))
                    {
                        nonRefundable = itinerary.TryGetProperty("NonRefundable", out var isRef) && isRef.ValueKind == JsonValueKind.True;

                        if (itinerary.TryGetProperty("FareRules", out var fr))
                            fareRulesJson = fr.ToString();
                        else if (itinerary.TryGetProperty("MiniFareRules", out var mfr))
                            fareRulesJson = mfr.ToString();
                            
                        if (itinerary.TryGetProperty("CancellationCharges", out var cancNode))
                            cancellationCharges = cancNode.ToString();
                        if (itinerary.TryGetProperty("PartialSegmentCancellation", out var pscNode))
                            partialSegmentCancellation = pscNode.ToString();

                        if (itinerary.TryGetProperty("Fare", out var fare))
                        {
                            totalFare = fare.TryGetProperty("PublishedFare", out var pubFare) && pubFare.ValueKind == JsonValueKind.Number ? pubFare.GetDecimal() : 0;
                            baseFare = fare.TryGetProperty("BaseFare", out var bFare) && bFare.ValueKind == JsonValueKind.Number ? bFare.GetDecimal() : 0;
                            tax = fare.TryGetProperty("Tax", out var tFare) && tFare.ValueKind == JsonValueKind.Number ? tFare.GetDecimal() : 0;
                            customerFare = totalFare;
                            netFare = fare.TryGetProperty("OfferedFare", out var offFare) && offFare.ValueKind == JsonValueKind.Number ? offFare.GetDecimal() : totalFare;
                        }

                        if (itinerary.TryGetProperty("Segments", out var segs) && segs.ValueKind == JsonValueKind.Array && segs.GetArrayLength() > 0)
                        {
                            segmentsJson = segs.ToString();
                            var firstSeg = segs[0];
                            if (firstSeg.TryGetProperty("Airline", out var alNode))
                            {
                                airline = alNode.TryGetProperty("AirlineName", out var alNameNode) ? (alNameNode.GetString() ?? "") : "";
                                flightNumber = alNode.TryGetProperty("FlightNumber", out var fnNode) ? (fnNode.GetString() ?? "") : "";
                            }
                            
                            if (firstSeg.TryGetProperty("Origin", out var orig) && orig.TryGetProperty("CityCode", out var origCity))
                                fromCity = origCity.GetString() ?? "";
                            if (firstSeg.TryGetProperty("Destination", out var dest) && dest.TryGetProperty("CityCode", out var destCity))
                                toCity = destCity.GetString() ?? "";
                            
                            if (firstSeg.TryGetProperty("DepTime", out var dTime) && DateTime.TryParse(dTime.GetString(), out var parsedDep))
                                depTime = parsedDep;

                            var lastSeg = segs[segs.GetArrayLength() - 1];
                            if (lastSeg.TryGetProperty("Destination", out var dest2) && dest2.TryGetProperty("CityCode", out var destCity2))
                                toCity = destCity2.GetString() ?? toCity;
                            if (lastSeg.TryGetProperty("ArrTime", out var aTime) && DateTime.TryParse(aTime.GetString(), out var parsedArr))
                                arrTime = parsedArr;
                            if (firstSeg.TryGetProperty("CabinClass", out var cClass) && cClass.ValueKind == JsonValueKind.Number)
                            {
                                travelClassStr = cClass.GetInt32() switch
                                {
                                    2 => "Economy",
                                    3 => "PremiumEconomy",
                                    4 => "Business",
                                    5 => "PremiumBusiness",
                                    6 => "First",
                                    _ => "Economy"
                                };
                            }
                        }
                    }
                    var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0";
                    
                    var firstPax = request.Passengers?.FirstOrDefault();
                    string paxName = firstPax != null ? $"{firstPax.FirstName} {firstPax.LastName}" : "";
                    string paxPhone = firstPax != null ? firstPax.ContactNo : "";
                    string paxEmail = firstPax != null ? firstPax.Email : "";
                    int adults = request.Passengers?.Count(p => p.PaxType == 1) ?? 0;
                    int children = request.Passengers?.Count(p => p.PaxType == 2) ?? 0;
                    int infants = request.Passengers?.Count(p => p.PaxType == 3) ?? 0;
                    int seatsBooked = adults + children;

                    var pricingBreakdown = await _pricingService.CalculatePricingAsync(
                        supplierBaseFare: baseFare,
                        supplierTaxAmount: tax,
                        airlineCode: airline,
                        airlineName: airline,
                        origin: fromCity,
                        destination: toCity,
                        departureDate: depTime,
                        travelClass: travelClassStr,
                        tripType: TripType.OneWay,
                        passengerCount: adults + children + infants,
                        couponCode: request.CouponCode,
                        userId: userIdStr
                    );

                    var reservation = new FlightReservation
                    {
                        BookingReference = $"FL-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 1000)}",
                        Pnr = pnr,
                        UserId = userIdStr,
                        Status = "Booked",
                        BookedAtUtc = DateTime.UtcNow,
                        
                        TraceId = request.TraceId,
                        ResultIndex = request.ResultIndex,
                        FlightNumber = flightNumber,
                        Airline = airline,
                        FromCity = fromCity,
                        ToCity = toCity,
                        DepartureTime = depTime,
                        ArrivalTime = arrTime,
                        SegmentsJson = segmentsJson,
                        
                        NonRefundable = nonRefundable,
                        FareRulesJson = fareRulesJson,

                        TotalPriceInr = pricingBreakdown.FinalAmount,
                        CustomerFareInr = pricingBreakdown.FinalAmount,
                        NetFareInr = netFare,
                        SupplierBaseFare = baseFare,
                        SupplierTaxAmount = tax,
                        SupplierTotalFare = totalFare,
                        MarkupAmount = pricingBreakdown.MarkupAmount,
                        PromotionDiscount = pricingBreakdown.PromotionDiscount,
                        CouponDiscount = pricingBreakdown.CouponDiscount,
                        SrdvTicketResponseJson = responseRaw,
                        
                        PassengerName = paxName,
                        PassengerPhone = paxPhone,
                        PassengerEmail = paxEmail,
                        Adults = adults,
                        Children = children,
                        Infants = infants,
                        SeatsBooked = seatsBooked,
                        
                        SrdvBookingId = bookingId,
                        SrdvPnr = pnr,
                        TicketStatus = resp.TryGetProperty("TicketStatus", out var ts) ? ts.ToString() : null,
                        IsLcc = true,
                        SrdvType = request.SrdvType,
                        SrdvIndex = request.SrdvIndex
                    };

                    _dbContext.FlightReservations.Add(reservation);
                    await _dbContext.SaveChangesAsync();

                    if (request.Passengers != null && request.Passengers.Any())
                    {
                        var reservationPassengers = new List<FlightReservationPassenger>();
                        var responsePassengers = new List<JsonElement>();
                        if (resp.TryGetProperty("FlightItinerary", out var itineraryNode) && 
                            itineraryNode.TryGetProperty("Passenger", out var passArray) && 
                            passArray.ValueKind == JsonValueKind.Array)
                        {
                            responsePassengers = passArray.EnumerateArray().ToList();
                        }

                        for (int i = 0; i < request.Passengers.Count; i++)
                        {
                            var p = request.Passengers[i];
                            var passObj = new FlightReservationPassenger
                            {
                                FlightReservationId = reservation.Id,
                                FullName = $"{p.FirstName} {p.LastName}",
                                FirstName = p.FirstName,
                                LastName = p.LastName,
                                Title = p.Title,
                                PassportNo = p.PassportNo,
                                Nationality = p.CountryName,
                                Email = p.Email,
                                ContactNo = p.ContactNo,
                                DateOfBirth = DateTime.TryParse(p.DateOfBirth, out var dob1) ? dob1 : null,
                                PassengerType = p.PaxType == 1 ? "Adult" : p.PaxType == 2 ? "Child" : "Infant",
                                Gender = p.Gender == "1" ? "Male" : "Female",
                                SeatNumber = null // Re-assigned below
                            };

                            if (p.Seat != null && p.Seat.Any())
                            {
                                var rawSeats = p.Seat.Select(s => s.SeatNumber ?? string.Empty).Where(s => !string.IsNullOrWhiteSpace(s));
                                passObj.SeatNumber = rawSeats.Any() ? string.Join(", ", rawSeats) : null;
                            }

                            if (i < responsePassengers.Count)
                            {
                                var rPax = responsePassengers[i];
                                
                                if (rPax.TryGetProperty("PaxId", out var paxIdNode))
                                {
                                    if (paxIdNode.ValueKind == JsonValueKind.Number)
                                        passObj.PaxId = paxIdNode.GetInt32();
                                    else if (paxIdNode.ValueKind == JsonValueKind.String && int.TryParse(paxIdNode.GetString(), out var parsedPaxId))
                                        passObj.PaxId = parsedPaxId;
                                }
                                
                                if (rPax.TryGetProperty("Ticket", out var tktNode))
                                {
                                    var tIdStr = tktNode.TryGetProperty("TicketId", out var tId) ? tId.ToString() : null;
                                    passObj.TicketId = string.IsNullOrWhiteSpace(tIdStr) ? null : tIdStr;

                                    var tNumStr = tktNode.TryGetProperty("TicketNumber", out var tNum) ? tNum.ToString() : null;
                                    passObj.TicketNumber = string.IsNullOrWhiteSpace(tNumStr) ? null : tNumStr;
                                }
                            }

                            reservationPassengers.Add(passObj);
                        }
                        _dbContext.FlightReservationPassengers.AddRange(reservationPassengers);
                        await _dbContext.SaveChangesAsync();
                    }

                    // If agent, deduct wallet
                    if (int.TryParse(userIdStr, out var agentId) && agentId > 0)
                    {
                        var user = await _dbContext.Users.FindAsync(agentId);
                        if (user != null && user.Role == AuthRoles.Agent)
                        {
                            await _walletService.DebitWalletForBookingAsync(agentId, totalFare, reservation.BookingReference, "Flight", $"Flight Booking LCC PNR {pnr}");
                        }
                    }

                    // Dispatch email
                    try
                    {
                        global::User? agentInfo = null;
                        if (int.TryParse(userIdStr, out var aId) && aId > 0)
                        {
                            agentInfo = await _dbContext.Users.FindAsync(aId);
                        }
                        var emailReq = new SendFlightTicketEmailRequest
                        {
                            ToEmail = string.IsNullOrEmpty(reservation.PassengerEmail) ? (agentInfo?.Email ?? "") : reservation.PassengerEmail,
                            PassengerName = reservation.PassengerName,
                            BookingReference = reservation.BookingReference,
                            Airline = reservation.Airline,
                            Origin = reservation.FromCity,
                            Destination = reservation.ToCity,
                            DepartureTime = reservation.DepartureTime,
                            ArrivalTime = reservation.ArrivalTime,
                            Pnr = reservation.Pnr,
                            Price = reservation.TotalPriceInr,
                            Currency = "INR",
                            NonRefundable = reservation.NonRefundable,
                            CancellationCharges = reservation.CancellationCharges,
                                PartialSegmentCancellation = reservation.PartialSegmentCancellation,
                            AgentCompanyName = agentInfo?.CompanyName,
                            AgentLogoUrl = agentInfo?.AgentLogoUrl,
                            Passengers = await _dbContext.FlightReservationPassengers
                                            .Where(p => p.FlightReservationId == reservation.Id)
                                            .Select(p => new FlightPassengerTicketDto {
                                                FullName = p.FullName,
                                                PassengerType = p.PassengerType,
                                                Gender = p.Gender,
                                                SeatNumber = p.SeatNumber,
                                                TicketNumber = p.TicketNumber
                                            }).ToListAsync()
                        };
                        var scopeFactory = HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                        _ = Task.Run(async () =>
                        {
                            using var scope = scopeFactory.CreateScope();
                            var scopedEmailService = scope.ServiceProvider.GetRequiredService<ITicketEmailService>();
                            await scopedEmailService.SendFlightTicketAsync(emailReq);
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send ticket email for Booking {BookingReference}", reservation.BookingReference);
                    }
                }
                
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting TicketLCC.");
                return StatusCode(500, new { message = "Failed to get TicketLCC.", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("HoldGDS")]
        public async Task<IActionResult> HoldGDS([FromBody] HoldGDSRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.HoldGDSRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                var root = doc.RootElement;
                
                bool isSuccess = false;
                JsonElement resp = root;
                if (root.TryGetProperty("Response", out var responseNode))
                {
                    resp = responseNode;
                }
                else if (root.TryGetProperty("Results", out var resultsNode))
                {
                    resp = resultsNode;
                }

                if (resp.TryGetProperty("ResponseStatus", out var status))
                {
                    if (status.ValueKind == JsonValueKind.Number && status.GetInt32() == 1) isSuccess = true;
                    if (status.ValueKind == JsonValueKind.String && status.GetString() == "1") isSuccess = true;
                }
                
                var errSource = root.TryGetProperty("Error", out var rootErr) ? root : resp;
                if (errSource.TryGetProperty("Error", out var err) && err.TryGetProperty("ErrorCode", out var errCode))
                {
                    if (errCode.ValueKind == JsonValueKind.Number && errCode.GetInt32() == 0) isSuccess = true;
                    if (errCode.ValueKind == JsonValueKind.String && (errCode.GetString() == "0" || errCode.GetString() == "")) isSuccess = true;
                    if (errCode.ValueKind == JsonValueKind.Null) isSuccess = true;
                }

                string pnr = resp.TryGetProperty("PNR", out var pnrProp) ? (pnrProp.GetString() ?? "") : "";
                if (string.IsNullOrEmpty(pnr) && root.TryGetProperty("PNR", out var rootPnrProp)) pnr = rootPnrProp.GetString() ?? "";

                string bookingId = resp.TryGetProperty("BookingId", out var bIdProp) ? (bIdProp.ToString() ?? "") : "";
                if (string.IsNullOrEmpty(bookingId) && root.TryGetProperty("BookingId", out var rootBIdProp)) bookingId = rootBIdProp.ToString() ?? "";

                if (isSuccess && (!string.IsNullOrEmpty(pnr) || !string.IsNullOrEmpty(bookingId)))
                {
                    decimal totalFare = 0, baseFare = 0, tax = 0, netFare = 0, customerFare = 0;
                    string airline = "", flightNumber = "", fromCity = "", toCity = "";
                    DateTime depTime = DateTime.MinValue, arrTime = DateTime.MinValue;
                    bool nonRefundable = false;
                    string segmentsJson = "", fareRulesJson = "", travelClassStr = "Economy";

                    nonRefundable = resp.TryGetProperty("IsRefundable", out var isRef) && isRef.ValueKind == JsonValueKind.True ? false : true;

                    if (resp.TryGetProperty("FareRules", out var fr))
                        fareRulesJson = fr.ToString();
                    else if (resp.TryGetProperty("MiniFareRules", out var mfr))
                        fareRulesJson = mfr.ToString();

                    if (resp.TryGetProperty("FlightItinerary", out var itinerary))
                    {
                        if (itinerary.TryGetProperty("Fare", out var fare))
                        {
                            totalFare = fare.TryGetProperty("PublishedFare", out var pubFare) && pubFare.ValueKind == JsonValueKind.Number ? pubFare.GetDecimal() : 0;
                            baseFare = fare.TryGetProperty("BaseFare", out var bFare) && bFare.ValueKind == JsonValueKind.Number ? bFare.GetDecimal() : 0;
                            tax = fare.TryGetProperty("Tax", out var tFare) && tFare.ValueKind == JsonValueKind.Number ? tFare.GetDecimal() : 0;
                            customerFare = totalFare;
                            netFare = fare.TryGetProperty("OfferedFare", out var offFare) && offFare.ValueKind == JsonValueKind.Number ? offFare.GetDecimal() : totalFare;
                        }

                        if (itinerary.TryGetProperty("Segments", out var segs) && segs.ValueKind == JsonValueKind.Array && segs.GetArrayLength() > 0)
                        {
                            segmentsJson = segs.ToString();
                            var firstSeg = segs[0];
                            if (firstSeg.TryGetProperty("Airline", out var alNode) && alNode.TryGetProperty("AirlineName", out var alNameNode))
                                airline = alNameNode.GetString() ?? "";
                            if (firstSeg.TryGetProperty("Airline", out var alNode2) && alNode2.TryGetProperty("FlightNumber", out var fnNode))
                                flightNumber = fnNode.GetString() ?? "";
                            
                            if (firstSeg.TryGetProperty("Origin", out var orig) && orig.TryGetProperty("Airport", out var origApt) && origApt.TryGetProperty("CityName", out var origCity))
                                fromCity = origCity.GetString() ?? "";
                            if (firstSeg.TryGetProperty("Destination", out var dest) && dest.TryGetProperty("Airport", out var destApt) && destApt.TryGetProperty("CityName", out var destCity))
                                toCity = destCity.GetString() ?? "";
                            
                            if (firstSeg.TryGetProperty("Origin", out var dep) && dep.TryGetProperty("DepTime", out var dTime) && DateTime.TryParse(dTime.GetString(), out var parsedDep))
                                depTime = parsedDep;
                            if (firstSeg.TryGetProperty("Destination", out var arr) && arr.TryGetProperty("ArrTime", out var aTime) && DateTime.TryParse(aTime.GetString(), out var parsedArr))
                                arrTime = parsedArr;
                            if (firstSeg.TryGetProperty("CabinClass", out var cClass) && cClass.ValueKind == JsonValueKind.Number)
                            {
                                travelClassStr = cClass.GetInt32() switch
                                {
                                    2 => "Economy",
                                    3 => "PremiumEconomy",
                                    4 => "Business",
                                    5 => "PremiumBusiness",
                                    6 => "First",
                                    _ => "Economy"
                                };
                            }
                        }
                    }

                    var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0";
                    
                    var firstPax = request.Passengers?.FirstOrDefault();
                    string paxName = firstPax != null ? $"{firstPax.FirstName} {firstPax.LastName}" : "";
                    string paxPhone = firstPax != null ? firstPax.ContactNo : "";
                    string paxEmail = firstPax != null ? firstPax.Email : "";
                    int adults = request.Passengers?.Count(p => p.PaxType == 1) ?? 0;
                    int children = request.Passengers?.Count(p => p.PaxType == 2) ?? 0;
                    int infants = request.Passengers?.Count(p => p.PaxType == 3) ?? 0;
                    int seatsBooked = adults + children;

                    var pricingBreakdown = await _pricingService.CalculatePricingAsync(
                        supplierBaseFare: baseFare,
                        supplierTaxAmount: tax,
                        airlineCode: airline,
                        airlineName: airline,
                        origin: fromCity,
                        destination: toCity,
                        departureDate: depTime,
                        travelClass: travelClassStr,
                        tripType: TripType.OneWay,
                        passengerCount: adults + children + infants,
                        couponCode: null,
                        userId: userIdStr
                    );

                    var reservation = new FlightReservation
                    {
                        BookingReference = $"FL-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 1000)}",
                        Pnr = pnr,
                        UserId = userIdStr,
                        Status = "Hold",
                        BookedAtUtc = DateTime.UtcNow,
                        
                        TraceId = request.TraceId,
                        ResultIndex = request.ResultIndex,
                        FlightNumber = flightNumber,
                        Airline = airline,
                        FromCity = fromCity,
                        ToCity = toCity,
                        DepartureTime = depTime,
                        ArrivalTime = arrTime,
                        SegmentsJson = segmentsJson,
                        
                        NonRefundable = nonRefundable,
                        FareRulesJson = fareRulesJson,

                        TotalPriceInr = pricingBreakdown.FinalAmount,
                        CustomerFareInr = pricingBreakdown.FinalAmount,
                        NetFareInr = netFare,
                        SupplierBaseFare = baseFare,
                        SupplierTaxAmount = tax,
                        SupplierTotalFare = totalFare,
                        MarkupAmount = pricingBreakdown.MarkupAmount,
                        PromotionDiscount = pricingBreakdown.PromotionDiscount,
                        CouponDiscount = pricingBreakdown.CouponDiscount,
                        SrdvTicketResponseJson = responseRaw,
                        
                        PassengerName = paxName,
                        PassengerPhone = paxPhone,
                        PassengerEmail = paxEmail,
                        Adults = adults,
                        Children = children,
                        Infants = infants,
                        SeatsBooked = seatsBooked,
                        
                        SrdvBookingId = resp.TryGetProperty("BookingId", out var bId) ? bId.ToString() : null,
                        SrdvPnr = pnr,
                        TicketStatus = resp.TryGetProperty("TicketStatus", out var ts) ? ts.ToString() : null,
                        IsLcc = false,
                        SrdvType = request.SrdvType,
                        SrdvIndex = request.SrdvIndex
                    };

                    _dbContext.FlightReservations.Add(reservation);
                    await _dbContext.SaveChangesAsync();

                    if (request.Passengers != null && request.Passengers.Any())
                    {
                        var reservationPassengers = new List<FlightReservationPassenger>();
                        var responsePassengers = new List<JsonElement>();
                        if (resp.TryGetProperty("FlightItinerary", out var itineraryNode) && 
                            itineraryNode.TryGetProperty("Passenger", out var passArray) && 
                            passArray.ValueKind == JsonValueKind.Array)
                        {
                            responsePassengers = passArray.EnumerateArray().ToList();
                        }

                        for (int i = 0; i < request.Passengers.Count; i++)
                        {
                            var p = request.Passengers[i];
                            var passObj = new FlightReservationPassenger
                            {
                                FlightReservationId = reservation.Id,
                                FullName = $"{p.FirstName} {p.LastName}",
                                FirstName = p.FirstName,
                                LastName = p.LastName,
                                Title = p.Title,
                                PassportNo = p.PassportNo,
                                Nationality = p.CountryName,
                                Email = p.Email,
                                ContactNo = p.ContactNo,
                                DateOfBirth = DateTime.TryParse(p.DateOfBirth, out var dob2) ? dob2 : null,
                                PassengerType = p.PaxType == 1 ? "Adult" : p.PaxType == 2 ? "Child" : "Infant",
                                Gender = p.Gender == "1" ? "Male" : "Female",
                                SeatNumber = p.Seat != null && p.Seat.Any() ? string.Join(", ", p.Seat.Select(s => s.SeatNumber)) : null
                            };

                            if (i < responsePassengers.Count)
                            {
                                var rPax = responsePassengers[i];
                                passObj.PaxId = rPax.TryGetProperty("PaxId", out var paxIdNode) && paxIdNode.ValueKind == JsonValueKind.Number ? paxIdNode.GetInt32() : null;
                                
                                if (rPax.TryGetProperty("Ticket", out var tktNode))
                                {
                                    passObj.TicketId = tktNode.TryGetProperty("TicketId", out var tId) ? tId.ToString() : null;
                                    passObj.TicketNumber = tktNode.TryGetProperty("TicketNumber", out var tNum) ? tNum.ToString() : null;
                                }
                            }

                            reservationPassengers.Add(passObj);
                        }
                        _dbContext.FlightReservationPassengers.AddRange(reservationPassengers);
                        await _dbContext.SaveChangesAsync();
                    }
                }

                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting HoldGDS.");
                return StatusCode(500, new { message = "Failed to get HoldGDS.", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("TicketGDS")]
        public async Task<IActionResult> TicketGDS([FromBody] TicketGDSRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.TicketGDSRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                var root = doc.RootElement;

                bool isSuccess = false;
                JsonElement resp = root;
                if (root.TryGetProperty("Response", out var responseNode))
                {
                    resp = responseNode;
                }
                else if (root.TryGetProperty("Results", out var resultsNode))
                {
                    resp = resultsNode;
                }

                if (resp.TryGetProperty("ResponseStatus", out var status))
                {
                    if (status.ValueKind == JsonValueKind.Number && status.GetInt32() == 1) isSuccess = true;
                    if (status.ValueKind == JsonValueKind.String && status.GetString() == "1") isSuccess = true;
                }
                
                var errSource = root.TryGetProperty("Error", out var rootErr) ? root : resp;
                if (errSource.TryGetProperty("Error", out var err) && err.TryGetProperty("ErrorCode", out var errCode))
                {
                    if (errCode.ValueKind == JsonValueKind.Number && errCode.GetInt32() == 0) isSuccess = true;
                    if (errCode.ValueKind == JsonValueKind.String && (errCode.GetString() == "0" || errCode.GetString() == "")) isSuccess = true;
                    if (errCode.ValueKind == JsonValueKind.Null) isSuccess = true;
                }

                string pnr = resp.TryGetProperty("PNR", out var pnrProp) ? (pnrProp.GetString() ?? "") : request.PNR;
                if (string.IsNullOrEmpty(pnr) && root.TryGetProperty("PNR", out var rootPnrProp)) pnr = rootPnrProp.GetString() ?? "";
                if (string.IsNullOrEmpty(pnr)) pnr = request.PNR;

                if (isSuccess && !string.IsNullOrEmpty(pnr))
                {

                    var reservation = await _dbContext.FlightReservations.FirstOrDefaultAsync(r => r.Pnr == pnr);
                    if (reservation != null)
                    {
                        reservation.Status = "Booked";
                        reservation.SrdvTicketResponseJson = responseRaw;

                        reservation.SrdvBookingId = resp.TryGetProperty("BookingId", out var bId) ? bId.ToString() : reservation.SrdvBookingId;
                        reservation.TicketStatus = resp.TryGetProperty("TicketStatus", out var ts) ? ts.ToString() : reservation.TicketStatus;

                        var responsePassengers = new List<JsonElement>();
                        if (resp.TryGetProperty("FlightItinerary", out var itineraryNode) && 
                            itineraryNode.TryGetProperty("Passenger", out var passArray) && 
                            passArray.ValueKind == JsonValueKind.Array)
                        {
                            responsePassengers = passArray.EnumerateArray().ToList();
                        }

                        var existingPassengers = await _dbContext.FlightReservationPassengers
                                                 .Where(p => p.FlightReservationId == reservation.Id)
                                                 .OrderBy(p => p.Id)
                                                 .ToListAsync();
                        
                        for (int i = 0; i < existingPassengers.Count; i++)
                        {
                            if (i < responsePassengers.Count)
                            {
                                var rPax = responsePassengers[i];
                                if (rPax.TryGetProperty("PaxId", out var paxIdNode) && paxIdNode.ValueKind == JsonValueKind.Number)
                                {
                                    existingPassengers[i].PaxId = paxIdNode.GetInt32();
                                }
                                if (rPax.TryGetProperty("Ticket", out var tktNode))
                                {
                                    if (tktNode.TryGetProperty("TicketId", out var tId))
                                        existingPassengers[i].TicketId = tId.ToString();
                                    if (tktNode.TryGetProperty("TicketNumber", out var tNum))
                                        existingPassengers[i].TicketNumber = tNum.ToString();
                                }
                            }
                        }

                        await _dbContext.SaveChangesAsync();

                        // If agent, deduct wallet
                        if (int.TryParse(reservation.UserId, out var agentId) && agentId > 0)
                        {
                            var user = await _dbContext.Users.FindAsync(agentId);
                            if (user != null && user.Role == AuthRoles.Agent)
                            {
                                await _walletService.DebitWalletForBookingAsync(agentId, reservation.SupplierTotalFare, reservation.BookingReference, "Flight", $"Flight Booking GDS PNR {pnr}");
                            }
                        }

                        // Dispatch email
                        try
                        {
                            global::User? agentInfo = null;
                            if (int.TryParse(reservation.UserId, out var aId) && aId > 0)
                            {
                                agentInfo = await _dbContext.Users.FindAsync(aId);
                            }
                            var emailReq = new SendFlightTicketEmailRequest
                            {
                                ToEmail = string.IsNullOrEmpty(reservation.PassengerEmail) ? (agentInfo?.Email ?? "") : reservation.PassengerEmail,
                                PassengerName = reservation.PassengerName,
                                BookingReference = reservation.BookingReference,
                                Airline = reservation.Airline,
                                Origin = reservation.FromCity,
                                Destination = reservation.ToCity,
                                DepartureTime = reservation.DepartureTime,
                                ArrivalTime = reservation.ArrivalTime,
                                Pnr = reservation.Pnr,
                                Price = reservation.TotalPriceInr,
                                Currency = "INR",
                                NonRefundable = reservation.NonRefundable,
                                CancellationCharges = reservation.CancellationCharges,
                                PartialSegmentCancellation = reservation.PartialSegmentCancellation,
                                AgentCompanyName = agentInfo?.CompanyName,
                                AgentLogoUrl = agentInfo?.AgentLogoUrl,
                                Passengers = await _dbContext.FlightReservationPassengers
                                                .Where(p => p.FlightReservationId == reservation.Id)
                                                .Select(p => new FlightPassengerTicketDto {
                                                    FullName = p.FullName,
                                                    PassengerType = p.PassengerType,
                                                    Gender = p.Gender,
                                                    SeatNumber = p.SeatNumber,
                                                    TicketNumber = p.TicketNumber
                                                }).ToListAsync()
                            };
                            var scopeFactory = HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                            _ = Task.Run(async () =>
                            {
                                using var scope = scopeFactory.CreateScope();
                                var scopedEmailService = scope.ServiceProvider.GetRequiredService<ITicketEmailService>();
                                await scopedEmailService.SendFlightTicketAsync(emailReq);
                            });
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to send ticket email for Booking {BookingReference}", reservation.BookingReference);
                        }
                    }
                    else
                    {
                    decimal totalFare = 0, baseFare = 0, tax = 0, netFare = 0, customerFare = 0;
                    string airline = "", flightNumber = "", fromCity = "", toCity = "";
                    DateTime depTime = DateTime.MinValue, arrTime = DateTime.MinValue;
                    bool nonRefundable = false;
                    string segmentsJson = "", fareRulesJson = "", travelClassStr = "Economy";

                    nonRefundable = resp.TryGetProperty("IsRefundable", out var isRef) && isRef.ValueKind == JsonValueKind.True ? false : true;

                    if (resp.TryGetProperty("FareRules", out var fr))
                        fareRulesJson = fr.ToString();
                    else if (resp.TryGetProperty("MiniFareRules", out var mfr))
                        fareRulesJson = mfr.ToString();

                    if (resp.TryGetProperty("FlightItinerary", out var itinerary))
                    {
                        if (itinerary.TryGetProperty("Fare", out var fare))
                        {
                            totalFare = fare.TryGetProperty("PublishedFare", out var pubFare) && pubFare.ValueKind == JsonValueKind.Number ? pubFare.GetDecimal() : 0;
                            baseFare = fare.TryGetProperty("BaseFare", out var bFare) && bFare.ValueKind == JsonValueKind.Number ? bFare.GetDecimal() : 0;
                            tax = fare.TryGetProperty("Tax", out var tFare) && tFare.ValueKind == JsonValueKind.Number ? tFare.GetDecimal() : 0;
                            customerFare = totalFare;
                            netFare = fare.TryGetProperty("OfferedFare", out var offFare) && offFare.ValueKind == JsonValueKind.Number ? offFare.GetDecimal() : totalFare;
                        }

                        if (itinerary.TryGetProperty("Segments", out var segs) && segs.ValueKind == JsonValueKind.Array && segs.GetArrayLength() > 0)
                        {
                            segmentsJson = segs.ToString();
                            var firstSeg = segs[0];
                            if (firstSeg.TryGetProperty("Airline", out var alNode) && alNode.TryGetProperty("AirlineName", out var alNameNode))
                                airline = alNameNode.GetString() ?? "";
                            if (firstSeg.TryGetProperty("Airline", out var alNode2) && alNode2.TryGetProperty("FlightNumber", out var fnNode))
                                flightNumber = fnNode.GetString() ?? "";
                            
                            if (firstSeg.TryGetProperty("Origin", out var orig) && orig.TryGetProperty("Airport", out var origApt) && origApt.TryGetProperty("CityName", out var origCity))
                                fromCity = origCity.GetString() ?? "";
                            if (firstSeg.TryGetProperty("Destination", out var dest) && dest.TryGetProperty("Airport", out var destApt) && destApt.TryGetProperty("CityName", out var destCity))
                                toCity = destCity.GetString() ?? "";
                            
                            if (firstSeg.TryGetProperty("Origin", out var dep) && dep.TryGetProperty("DepTime", out var dTime) && DateTime.TryParse(dTime.GetString(), out var parsedDep))
                                depTime = parsedDep;
                            if (firstSeg.TryGetProperty("Destination", out var arr) && arr.TryGetProperty("ArrTime", out var aTime) && DateTime.TryParse(aTime.GetString(), out var parsedArr))
                                arrTime = parsedArr;
                            if (firstSeg.TryGetProperty("CabinClass", out var cClass) && cClass.ValueKind == JsonValueKind.Number)
                            {
                                travelClassStr = cClass.GetInt32() switch
                                {
                                    2 => "Economy",
                                    3 => "PremiumEconomy",
                                    4 => "Business",
                                    5 => "PremiumBusiness",
                                    6 => "First",
                                    _ => "Economy"
                                };
                            }
                        }
                    }

                    var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0";
                    
                    var firstPax = request.Passengers?.FirstOrDefault();
                    string paxName = firstPax != null ? $"{firstPax.FirstName} {firstPax.LastName}" : "";
                    string paxPhone = firstPax != null ? firstPax.ContactNo : "";
                    string paxEmail = firstPax != null ? firstPax.Email : "";
                    int adults = request.Passengers?.Count(p => p.PaxType == 1) ?? 0;
                    int children = request.Passengers?.Count(p => p.PaxType == 2) ?? 0;
                    int infants = request.Passengers?.Count(p => p.PaxType == 3) ?? 0;
                    int seatsBooked = adults + children;

                    var pricingBreakdown = await _pricingService.CalculatePricingAsync(
                        supplierBaseFare: baseFare,
                        supplierTaxAmount: tax,
                        airlineCode: airline,
                        airlineName: airline,
                        origin: fromCity,
                        destination: toCity,
                        departureDate: depTime,
                        travelClass: travelClassStr,
                        tripType: TripType.OneWay,
                        passengerCount: adults + children + infants,
                        couponCode: request.CouponCode,
                        userId: userIdStr
                    );

                    var newReservation = new FlightReservation
                    {
                        BookingReference = $"FL-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 1000)}",
                        Pnr = pnr,
                        UserId = userIdStr,
                        Status = "Booked",
                        BookedAtUtc = DateTime.UtcNow,
                        
                        TraceId = request.TraceId,
                        ResultIndex = request.ResultIndex,
                        FlightNumber = flightNumber,
                        Airline = airline,
                        FromCity = fromCity,
                        ToCity = toCity,
                        DepartureTime = depTime,
                        ArrivalTime = arrTime,
                        SegmentsJson = segmentsJson,
                        
                        NonRefundable = nonRefundable,
                        FareRulesJson = fareRulesJson,

                        TotalPriceInr = pricingBreakdown.FinalAmount,
                        CustomerFareInr = pricingBreakdown.FinalAmount,
                        NetFareInr = netFare,
                        SupplierBaseFare = baseFare,
                        SupplierTaxAmount = tax,
                        SupplierTotalFare = totalFare,
                        MarkupAmount = pricingBreakdown.MarkupAmount,
                        PromotionDiscount = pricingBreakdown.PromotionDiscount,
                        CouponDiscount = pricingBreakdown.CouponDiscount,
                        SrdvTicketResponseJson = responseRaw,
                        
                        PassengerName = paxName,
                        PassengerPhone = paxPhone,
                        PassengerEmail = paxEmail,
                        Adults = adults,
                        Children = children,
                        Infants = infants,
                        SeatsBooked = seatsBooked,
                        
                        SrdvBookingId = resp.TryGetProperty("BookingId", out var bId) ? bId.ToString() : null,
                        SrdvPnr = pnr,
                        TicketStatus = resp.TryGetProperty("TicketStatus", out var ts) ? ts.ToString() : null,
                        IsLcc = false,
                        SrdvType = request.SrdvType,
                        SrdvIndex = request.SrdvIndex
                    };

                    _dbContext.FlightReservations.Add(newReservation);
                    await _dbContext.SaveChangesAsync();

                    if (request.Passengers != null && request.Passengers.Any())
                    {
                        var reservationPassengers = new List<FlightReservationPassenger>();
                        var responsePassengers = new List<JsonElement>();
                        if (resp.TryGetProperty("FlightItinerary", out var itineraryNode) && 
                            itineraryNode.TryGetProperty("Passenger", out var passArray) && 
                            passArray.ValueKind == JsonValueKind.Array)
                        {
                            responsePassengers = passArray.EnumerateArray().ToList();
                        }

                        for (int i = 0; i < request.Passengers.Count; i++)
                        {
                            var p = request.Passengers[i];
                            var passObj = new FlightReservationPassenger
                            {
                                FlightReservationId = newReservation.Id,
                                FullName = $"{p.FirstName} {p.LastName}",
                                FirstName = p.FirstName,
                                LastName = p.LastName,
                                Title = p.Title,
                                PassportNo = p.PassportNo,
                                Nationality = p.CountryName,
                                Email = p.Email,
                                ContactNo = p.ContactNo,
                                DateOfBirth = DateTime.TryParse(p.DateOfBirth, out var dob2) ? dob2 : null,
                                PassengerType = p.PaxType == 1 ? "Adult" : p.PaxType == 2 ? "Child" : "Infant",
                                Gender = p.Gender == "1" ? "Male" : "Female",
                                SeatNumber = p.Seat != null && p.Seat.Any() ? string.Join(", ", p.Seat.Select(s => s.SeatNumber)) : null
                            };

                            if (i < responsePassengers.Count)
                            {
                                var rPax = responsePassengers[i];
                                passObj.PaxId = rPax.TryGetProperty("PaxId", out var paxIdNode) && paxIdNode.ValueKind == JsonValueKind.Number ? paxIdNode.GetInt32() : null;
                                
                                if (rPax.TryGetProperty("Ticket", out var tktNode))
                                {
                                    passObj.TicketId = tktNode.TryGetProperty("TicketId", out var tId) ? tId.ToString() : null;
                                    passObj.TicketNumber = tktNode.TryGetProperty("TicketNumber", out var tNum) ? tNum.ToString() : null;
                                }
                            }

                            reservationPassengers.Add(passObj);
                        }
                        _dbContext.FlightReservationPassengers.AddRange(reservationPassengers);
                        await _dbContext.SaveChangesAsync();
                    }
                }
            } // Close if (isSuccess)

            return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting TicketGDS.");
                return StatusCode(500, new { message = "Failed to get TicketGDS.", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("SendChangeRequest")]
        public async Task<IActionResult> SendChangeRequest([FromBody] SendChangeRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.SendChangeRequestRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                var root = doc.RootElement;
                
                var reservation = await _dbContext.FlightReservations.FirstOrDefaultAsync(r => r.SrdvBookingId == request.BookingId);
                if (reservation == null && !string.IsNullOrEmpty(request.PNR))
                {
                    reservation = await _dbContext.FlightReservations.FirstOrDefaultAsync(r => r.Pnr == request.PNR);
                }
                
                if (reservation != null)
                {
                    var isSuccess = false;
                    JsonElement resp = root;
                    if (root.TryGetProperty("Response", out var responseNode))
                    {
                        resp = responseNode;
                    }
                    else if (root.TryGetProperty("Results", out var resultsNode))
                    {
                        resp = resultsNode;
                    }
                    
                    if (resp.TryGetProperty("ResponseStatus", out var status))
                    {
                        if (status.ValueKind == JsonValueKind.Number && status.GetInt32() == 1) isSuccess = true;
                        if (status.ValueKind == JsonValueKind.String && status.GetString() == "1") isSuccess = true;
                    }
                    
                    var errSource = root.TryGetProperty("Error", out var rootErr) ? root : resp;
                    if (errSource.TryGetProperty("Error", out var err) && err.TryGetProperty("ErrorCode", out var errCode))
                    {
                        if (errCode.ValueKind == JsonValueKind.Number && errCode.GetInt32() == 0) isSuccess = true;
                        if (errCode.ValueKind == JsonValueKind.String && (errCode.GetString() == "0" || errCode.GetString() == "")) isSuccess = true;
                        if (errCode.ValueKind == JsonValueKind.Null) isSuccess = true;
                    }
                    
                    if (isSuccess)
                    {
                        string changeRequestId = "";
                        if (resp.TryGetProperty("TicketCRInfo", out var crInfo) && crInfo.ValueKind == JsonValueKind.Array && crInfo.GetArrayLength() > 0)
                        {
                            var firstCR = crInfo[0];
                            if (firstCR.TryGetProperty("ChangeRequestId", out var crIdNode))
                                changeRequestId = crIdNode.ToString();
                        }
                        
                        var cancelReq = new FlightCancellationRequest
                        {
                            FlightReservationId = reservation.Id,
                            RequestDateUtc = DateTime.UtcNow,
                            CancellationStatus = "Pending",
                            CustomerRefundStatus = "Pending",
                            AdminRefundStatus = "Pending",
                            SrdvChangeRequestId = changeRequestId,
                            SrdvBookingId = request.BookingId,
                            SrdvType = request.SrdvType,
                            SrdvIndex = request.SrdvIndex,
                            CustomerRemark = request.Remarks
                        };
                        
                        reservation.Status = "Cancellation Requested";
                        
                        _dbContext.FlightCancellationRequests.Add(cancelReq);
                        await _dbContext.SaveChangesAsync();
                    }
                }

                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending change request.");
                return StatusCode(500, new { message = "Failed to send change request.", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("GetCancelStatus")]
        public async Task<IActionResult> GetCancelStatus([FromBody] GetCancelStatusRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.GetCancelStatusRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                var root = doc.RootElement;
                
                var isSuccess = false;
                JsonElement resp = root;
                if (root.TryGetProperty("Response", out var responseNode))
                {
                    resp = responseNode;
                }
                else if (root.TryGetProperty("Results", out var resultsNode))
                {
                    resp = resultsNode;
                }
                
                if (resp.TryGetProperty("ResponseStatus", out var status))
                {
                    if (status.ValueKind == JsonValueKind.Number && status.GetInt32() == 1) isSuccess = true;
                    if (status.ValueKind == JsonValueKind.String && status.GetString() == "1") isSuccess = true;
                }
                
                var errSource = root.TryGetProperty("Error", out var rootErr) ? root : resp;
                if (errSource.TryGetProperty("Error", out var err) && err.TryGetProperty("ErrorCode", out var errCode))
                {
                    if (errCode.ValueKind == JsonValueKind.Number && errCode.GetInt32() == 0) isSuccess = true;
                    if (errCode.ValueKind == JsonValueKind.String && (errCode.GetString() == "0" || errCode.GetString() == "")) isSuccess = true;
                    if (errCode.ValueKind == JsonValueKind.Null) isSuccess = true;
                }

                if (isSuccess)
                {
                    string changeRequestId = request.ChangeRequestId;
                    if (!string.IsNullOrEmpty(changeRequestId))
                    {
                        var cancelReq = await _dbContext.FlightCancellationRequests.FirstOrDefaultAsync(c => c.SrdvChangeRequestId == changeRequestId);
                        if (cancelReq != null)
                        {
                            string cStatus = "Completed";
                            if (resp.TryGetProperty("RefundDetails", out var rd) && rd.TryGetProperty("CancellationStatus", out var csNode))
                                cStatus = csNode.GetString() ?? "Completed";
                            
                            cancelReq.CancellationStatus = cStatus;
                            cancelReq.CustomerRefundStatus = cStatus;
                            cancelReq.AdminRefundStatus = cStatus;
                            
                            var res = await _dbContext.FlightReservations.FindAsync(cancelReq.FlightReservationId);
                            if (res != null) 
                            {
                                res.Status = "Cancelled";
                                res.CancelledAtUtc = DateTime.UtcNow;
                                res.CancellationReason = !string.IsNullOrWhiteSpace(cancelReq.CustomerRemark) ? cancelReq.CustomerRemark 
                                                       : (!string.IsNullOrWhiteSpace(cancelReq.SupplierRemark) ? cancelReq.SupplierRemark 
                                                       : (!string.IsNullOrWhiteSpace(cancelReq.AdminRemark) ? cancelReq.AdminRemark 
                                                       : "Cancelled via API / Provider"));
                                await _dbContext.SaveChangesAsync();

                                // Dispatch Cancellation email
                                try
                                {
                                    global::User? agentInfo = null;
                                    if (int.TryParse(res.UserId, out var aId) && aId > 0)
                                    {
                                        agentInfo = await _dbContext.Users.FindAsync(aId);
                                    }
                                    decimal refundAmount = 0;
                                    if (resp.TryGetProperty("RefundDetails", out var rdNode) && rdNode.TryGetProperty("RefundAmount", out var rAmt))
                                    {
                                        refundAmount = rAmt.ValueKind == JsonValueKind.Number ? rAmt.GetDecimal() : 0;
                                    }
                                    
                                    var emailReq = new SendFlightTicketEmailRequest
                                    {
                                        ToEmail = string.IsNullOrEmpty(res.PassengerEmail) ? (agentInfo?.Email ?? "") : res.PassengerEmail,
                                        PassengerName = res.PassengerName,
                                        BookingReference = res.BookingReference,
                                        Airline = res.Airline,
                                        Origin = res.FromCity,
                                        Destination = res.ToCity,
                                        DepartureTime = res.DepartureTime,
                                        ArrivalTime = res.ArrivalTime,
                                        Pnr = res.Pnr,
                                        Price = res.TotalPriceInr,
                                        Currency = "INR",
                                        NonRefundable = res.NonRefundable,
                                        CancellationCharges = res.CancellationCharges,
                                        AgentCompanyName = agentInfo?.CompanyName,
                                        AgentLogoUrl = agentInfo?.AgentLogoUrl,
                                        Passengers = await _dbContext.FlightReservationPassengers
                                                        .Where(p => p.FlightReservationId == res.Id)
                                                        .Select(p => new FlightPassengerTicketDto {
                                                            FullName = p.FullName,
                                                            PassengerType = p.PassengerType,
                                                            Gender = p.Gender,
                                                            SeatNumber = p.SeatNumber,
                                                            TicketNumber = p.TicketNumber
                                                        }).ToListAsync()
                                    };
                                    var scopeFactory = HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                                    _ = Task.Run(async () =>
                                    {
                                        using var scope = scopeFactory.CreateScope();
                                        var scopedEmailService = scope.ServiceProvider.GetRequiredService<ITicketEmailService>();
                                        await scopedEmailService.SendFlightCancellationAsync(emailReq, refundAmount);
                                    });
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, "Failed to send cancellation email for Booking {BookingReference}", res.BookingReference);
                                }
                            }
                            else
                            {
                                await _dbContext.SaveChangesAsync();
                            }
                        }
                    }
                }

                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cancel status.");
                return StatusCode(500, new { message = "Failed to get cancel status.", error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("GetCancellationCharges")]
        public async Task<IActionResult> GetCancellationCharges([FromBody] GetCancellationChargesRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.GetCancellationChargesRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cancellation charges.");
                return StatusCode(500, new { message = "Failed to get cancellation charges.", error = ex.Message });
            }
        }
        [HttpPost("GetApiBalanceCheck")]
        public async Task<IActionResult> GetApiBalanceCheck([FromBody] ApiBalanceRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.GetApiBalanceCheckRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting API balance check.");
                return StatusCode(500, new { message = "Failed to get API balance check.", error = ex.Message });
            }
        }

        [HttpPost("GetApiBalanceLog")]
        public async Task<IActionResult> GetApiBalanceLog([FromBody] ApiBalanceRequestDto request)
        {
            try
            {
                var responseRaw = await _srdvFlightService.GetApiBalanceLogRawAsync(request);
                using var doc = JsonDocument.Parse(responseRaw);
                return Ok(doc.RootElement.Clone());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting API balance log.");
                return StatusCode(500, new { message = "Failed to get API balance log.", error = ex.Message });
            }
        }

        [HttpPost("flight_callback")]
        [ProducesResponseType(typeof(SrdvBookingCallbackResponseDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> BookingCallback([FromBody] SrdvBookingCallbackRequestDto request)
        {
            try
            {
                _logger.LogInformation("Received SRDV Booking Update Callback for BookingId: {BookingId}", request.BookingId);

                // Security Check: Verify credentials against settings
                if (request.ClientId != _srdvSettings.ClientId || 
                    request.UserName != _srdvSettings.UserName || 
                    request.Password != _srdvSettings.Password)
                {
                    _logger.LogWarning("SRDV Booking Callback failed authentication for BookingId: {BookingId}", request.BookingId);
                    return Ok(new SrdvBookingCallbackResponseDto { Error = new SrdvCallbackErrorDto { ErrorCode = "1", ErrorMessage = "Unauthorized" } });
                }

                if (string.IsNullOrEmpty(request.BookingId) && string.IsNullOrEmpty(request.PNR))
                {
                    _logger.LogWarning("Received callback with missing PNR and BookingId.");
                    return Ok(new SrdvBookingCallbackResponseDto { Error = new SrdvCallbackErrorDto { ErrorCode = "2", ErrorMessage = "Missing PNR and BookingId" } });
                }

                var reservationQuery = _dbContext.FlightReservations.AsQueryable();

                if (!string.IsNullOrEmpty(request.BookingId))
                {
                    reservationQuery = reservationQuery.Where(r => r.SrdvBookingId == request.BookingId);
                }
                else if (!string.IsNullOrEmpty(request.PNR))
                {
                    reservationQuery = reservationQuery.Where(r => r.Pnr == request.PNR);
                }

                var reservation = await reservationQuery.FirstOrDefaultAsync();

                if (reservation != null)
                {
                    reservation.SrdvCallbackResponseJson = JsonSerializer.Serialize(request);
                    reservation.CallbackReceivedAtUtc = DateTime.UtcNow;

                    if (!string.IsNullOrEmpty(request.Status))
                    {
                        reservation.TicketStatus = request.Status;
                    }

                    if (!string.IsNullOrEmpty(request.PNR) && string.IsNullOrEmpty(reservation.Pnr))
                    {
                        reservation.Pnr = request.PNR;
                    }

                    // Sync Passenger Ticket Numbers
                    if (request.Passengers != null && request.Passengers.Any())
                    {
                        var reservationPassengers = await _dbContext.FlightReservationPassengers
                            .Where(p => p.FlightReservationId == reservation.Id)
                            .ToListAsync();

                        foreach (var incPax in request.Passengers)
                        {
                            if (!string.IsNullOrEmpty(incPax.TicketNumber))
                            {
                                var dbPax = reservationPassengers.FirstOrDefault(p => 
                                    string.Equals(p.FirstName, incPax.FirstName, StringComparison.OrdinalIgnoreCase) && 
                                    string.Equals(p.LastName, incPax.LastName, StringComparison.OrdinalIgnoreCase));
                                
                                if (dbPax != null)
                                {
                                    dbPax.TicketNumber = incPax.TicketNumber;
                                }
                            }
                        }
                    }

                    await _dbContext.SaveChangesAsync();
                    _logger.LogInformation("Successfully updated reservation {ReservationId} with callback data.", reservation.Id);

                    // Dispatch final email if tickets are issued
                    if (reservation.TicketStatus == "Ticketed" || reservation.TicketStatus == "Booked" || !string.IsNullOrEmpty(reservation.Pnr))
                    {
                        try
                        {
                            global::User? agentInfo = null;
                            if (int.TryParse(reservation.UserId, out var aId) && aId > 0)
                            {
                                agentInfo = await _dbContext.Users.FindAsync(aId);
                            }
                            var emailReq = new SendFlightTicketEmailRequest
                            {
                                ToEmail = string.IsNullOrEmpty(reservation.PassengerEmail) ? (agentInfo?.Email ?? "") : reservation.PassengerEmail,
                                PassengerName = reservation.PassengerName,
                                BookingReference = reservation.BookingReference,
                                Airline = reservation.Airline,
                                Origin = reservation.FromCity,
                                Destination = reservation.ToCity,
                                DepartureTime = reservation.DepartureTime,
                                ArrivalTime = reservation.ArrivalTime,
                                Pnr = reservation.Pnr,
                                Price = reservation.TotalPriceInr,
                                Currency = "INR",
                                NonRefundable = reservation.NonRefundable,
                                CancellationCharges = reservation.CancellationCharges,
                                PartialSegmentCancellation = reservation.PartialSegmentCancellation,
                                AgentCompanyName = agentInfo?.CompanyName,
                                AgentLogoUrl = agentInfo?.AgentLogoUrl,
                                Passengers = await _dbContext.FlightReservationPassengers
                                                .Where(p => p.FlightReservationId == reservation.Id)
                                                .Select(p => new FlightPassengerTicketDto {
                                                    FullName = p.FullName,
                                                    PassengerType = p.PassengerType,
                                                    Gender = p.Gender,
                                                    SeatNumber = p.SeatNumber,
                                                    TicketNumber = p.TicketNumber
                                                }).ToListAsync()
                            };
                            var scopeFactory = HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
                            _ = Task.Run(async () =>
                            {
                                using var scope = scopeFactory.CreateScope();
                                var scopedEmailService = scope.ServiceProvider.GetRequiredService<ITicketEmailService>();
                                await scopedEmailService.SendFlightTicketAsync(emailReq);
                            });
                            _logger.LogInformation("Successfully dispatched final ticket email via callback for BookingReference: {BookingRef}", reservation.BookingReference);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to send final ticket email via callback for Booking {BookingReference}", reservation.BookingReference);
                        }
                    }
                }
                else
                {
                    _logger.LogWarning("Received callback for PNR {PNR} / BookingId {BookingId} but no matching reservation was found.", request.PNR, request.BookingId);
                    // Still return success to SRDV so they don't retry unnecessarily if the record doesn't exist on our end.
                }

                // Exactly match the required success response structure
                return Ok(new SrdvBookingCallbackResponseDto { Error = new SrdvCallbackErrorDto { ErrorCode = "0", ErrorMessage = "" } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing SRDV Booking Callback.");
                return Ok(new SrdvBookingCallbackResponseDto { Error = new SrdvCallbackErrorDto { ErrorCode = "500", ErrorMessage = "Internal Server Error" } });
            }
        }
    }
}



















