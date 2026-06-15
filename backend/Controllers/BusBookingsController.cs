using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;
using PickNBook.Api.Services.SeatLayouts;

namespace PickNBook.Api.Controllers
{
    [Authorize]
    public class BusBookingsController(
    AppDbContext dbContext,
      IBusPromotionEngineService promotionEngine,
    ITicketEmailService ticketEmailService,
    IWhatsAppService whatsAppService,
    ICurrentUserService currentUserService,
    ILogger<BusBookingsController> logger) : BaseApiController
    {
        //private const string UserIdHeaderName = "X-User-Id";
        private readonly IBusPromotionEngineService _promotionEngine
    = promotionEngine;

        private static readonly TimeSpan IndiaOffset = TimeSpan.FromHours(5.5);
        private static readonly string[] AllowedPassengerGenders = ["Male", "Female"];
        private readonly IWhatsAppService _whatsAppService = whatsAppService;
        private readonly ITicketEmailService _ticketEmailService = ticketEmailService;

        [HttpGet("user/available")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvailableCoupons()
        {
            var today = DateOnly.FromDateTime(
                DateTime.UtcNow.AddHours(5.5));

            var coupons = await dbContext.BusCoupons
                .AsNoTracking()
                .Where(x =>
                    x.Status == "Active" &&
                       x.StartDate <= today &&
                    x.ExpiryDate >= today &&
                    (x.UseLimit == 0 || x.UsedCount < x.UseLimit))
                .OrderBy(x => x.ExpiryDate)
                .Select(x => new
                {
                    x.Id,
                    x.CouponCode,
                    x.CouponType,
                    x.Value,
                    x.MinBookingAmount,
                    x.MaxUsagePerUser,
                    x.ExpiryDate,
                    Description = x.Remark
                })
                .ToListAsync();

            return Ok(coupons);
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> SearchBuses(
            [FromQuery] string? fromCity,
            [FromQuery] string? toCity,
           [FromQuery] string? date,
            [FromQuery(Name = "from")] string? from,
            [FromQuery(Name = "to")] string? to)
        {
            var requestedFrom = string.IsNullOrWhiteSpace(fromCity) ? from : fromCity;
            var requestedTo = string.IsNullOrWhiteSpace(toCity) ? to : toCity;
            DateOnly? parsedDate = null;

            if (!string.IsNullOrWhiteSpace(date))
            {
                if (!DateOnly.TryParseExact(
                        date,
                        "dd-MM-yyyy",
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None,
                        out var tempDate))
                {
                    return BadRequest("Date must be in dd-MM-yyyy format");
                }

                parsedDate = tempDate;
            }

            if (parsedDate.HasValue)
            {
                await EnsureBusSchedulesForDateAsync(
    parsedDate.Value,
    requestedFrom?.Trim(),
    requestedTo?.Trim()
);
            }

            var queryable = dbContext.BusBookings.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(requestedFrom))
            {
                var fromValue = requestedFrom.Trim();
                queryable = queryable.Where(x =>
     x.FromCity.ToLower() == fromValue.ToLower());
            }

            if (!string.IsNullOrWhiteSpace(requestedTo))
            {
                var toValue = requestedTo.Trim();
                queryable = queryable.Where(x =>
     x.ToCity.ToLower() == toValue.ToLower());
            }

            if (parsedDate.HasValue)
            {
                var (startUtc, endUtc) =
                    GetUtcRangeForIstDate(parsedDate.Value);

                queryable = queryable.Where(x =>
                    x.DepartureTime >= startUtc &&
                    x.DepartureTime < endUtc);

                var todayIst = DateOnly.FromDateTime(
      DateTimeOffset.UtcNow.ToOffset(IndiaOffset).DateTime);

                if (parsedDate.Value == todayIst)
                {
                    var nowUtc = DateTime.UtcNow;

                    queryable = queryable.Where(x =>
                        x.DepartureTime >= nowUtc);
                }
                if (parsedDate.Value < todayIst)
                {
                    queryable = queryable.Where(x => false);
                }
            }

            var buses = await queryable
                .OrderBy(x => x.DepartureTime)
                .Take(200)
                .ToListAsync();

            if (!string.IsNullOrWhiteSpace(requestedFrom) && !string.IsNullOrWhiteSpace(requestedTo))
            {
                await IncrementBusRouteSearchCounterAsync(
                    requestedFrom.Trim(),
                    requestedTo.Trim(),
                    currentUserService.GetUserOrGuestId(),
                    parsedDate);
            }

            var response = new List<object>();

            foreach (var x in buses)
            {
                await EnsureBusSeatsGeneratedAsync(x.Id);

                var seatTypes = await dbContext.BusSeats
                    .AsNoTracking()
                    .Where(s => s.BusBookingId == x.Id)
                    .Select(s => s.SeatType)
                    .Distinct()
                    .ToListAsync();

                decimal startingFromPrice = x.PriceInr;

                if (seatTypes.Count > 0)
                {
                    var prices = new List<decimal>();

                    foreach (var seatType in seatTypes)
                    {
                        prices.Add(
                            await GetSeatFinalFareAsync(
                                x.PriceInr,
                                seatType));
                    }

                    startingFromPrice = prices.Min();
                }

                var boardingPoint = x.BoardingPoint;
                var droppingPoint = x.DroppingPoint;

                try
                {
                    var jsonOptions = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                    if (!string.IsNullOrWhiteSpace(x.BoardingPointsJson))
                    {
                        var bps = System.Text.Json.JsonSerializer.Deserialize<List<PickNBook.Api.Models.DTOs.BusPointDto>>(x.BoardingPointsJson, jsonOptions);
                        if (bps != null && bps.Count > 0)
                        {
                            boardingPoint = bps[0].Name;
                        }
                    }
                    if (!string.IsNullOrWhiteSpace(x.DroppingPointsJson))
                    {
                        var dps = System.Text.Json.JsonSerializer.Deserialize<List<PickNBook.Api.Models.DTOs.BusPointDto>>(x.DroppingPointsJson, jsonOptions);
                        if (dps != null && dps.Count > 0)
                        {
                            droppingPoint = dps[dps.Count - 1].Name;
                        }
                    }
                }
                catch { }

                response.Add(new
                {
                    x.Id,
                    x.BusNumber,
                    x.OperatorName,
                    x.BusType,
                    x.FromCity,
                    x.ToCity,
                    BoardingPoint = boardingPoint,
                    DroppingPoint = droppingPoint,


                    DepartureTimeUtc = x.DepartureTime,
                    ArrivalTimeUtc = x.ArrivalTime,

                    DepartureTimeIst = ToIst(x.DepartureTime),
                    ArrivalTimeIst = ToIst(x.ArrivalTime),

                    // FINAL DISPLAY PRICE
                    PriceInr = startingFromPrice,

                    AvailableSeats = await dbContext.BusSeats
                        .CountAsync(s =>
                            s.BusBookingId == x.Id &&
                            !s.IsBooked),

                    x.TotalSeats
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

            var stats = await dbContext.BusRouteStats
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

        [HttpGet("{busId:int}/seats")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBusSeatMap(int busId)
        {
            var bus = await dbContext.BusBookings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == busId);
            if (bus is null)
            {
                return NotFound("Bus not found.");
            }

            await EnsureBusSeatsGeneratedAsync(busId);

            var seats = await dbContext.BusSeats
                .AsNoTracking()
                .Where(x => x.BusBookingId == busId)
                .OrderBy(x => x.SeatCode)
                .ToListAsync();

            var bookedPassengers = await dbContext.BusReservationPassengers
    .Include(x => x.BusReservation)
    .Where(x =>
        x.BusReservation.BusBookingId == busId &&
        x.BusReservation.Status == "Booked")
    .ToListAsync();

            var seatGenderMap = bookedPassengers
                .Where(x => !string.IsNullOrWhiteSpace(x.SeatNumber))
                .ToDictionary(x => x.SeatNumber!, x => x.Gender);

            var booked = seats.Count(x => x.IsBooked);
            // AFTER — layout-aware
            var layout = BusSeatLayoutRegistry.Resolve(bus.BusType);
           

            var sections = layout.GetSections(
                         seats.Count,
                         bus.BusType)
                      .Select(s => new SeatSectionDto
                      {
                                     Label = s.Label,
                                     SeatCodes = s.SeatCodes,
                                     ColumnsPerRow = s.ColumnsPerRow,
                                     AisleAfterColumn = s.AisleAfterColumn
                                 }).ToList();

            var definitions =
   layout.GetSeatDefinitions(
       seats.Count,
       bus.BusType);

            var definitionMap = definitions.ToDictionary(x => x.SeatCode, x => x.SeatType, StringComparer.OrdinalIgnoreCase);

            var seatDtos = new List<SeatMapItemDto>();

            foreach (var seat in seats)
            {
                // 🔥 Use layout definition for seat type to avoid stale DB values
                var effectiveSeatType = definitionMap.TryGetValue(seat.SeatCode, out var type)
                    ? type
                    : seat.SeatType;

                var markup =
                    await GetActiveSeatMarkupAsync(
                        effectiveSeatType);

                var markupAmount =
                    CalculateMarkupAmount(
                        bus.PriceInr,
                        markup);

                markupAmount = decimal.Round(
                    markupAmount,
                    2,
                    MidpointRounding.AwayFromZero);

                var fareBeforeTax = decimal.Round(
                    bus.PriceInr + markupAmount,
                    2,
                    MidpointRounding.AwayFromZero);

                seatDtos.Add(new SeatMapItemDto
                {
                    SeatCode = seat.SeatCode,

                    IsBooked = seat.IsBooked,

                    Gender = seat.IsBooked &&
                             seatGenderMap.ContainsKey(seat.SeatCode)
                        ? seatGenderMap[seat.SeatCode]
                        : null,

                    // NEW
                    SeatType = effectiveSeatType,

                    BaseFare = decimal.Round(
                        bus.PriceInr,
                        2,
                        MidpointRounding.AwayFromZero),

                    MarkupAmount = markupAmount,

                    FareBeforeTax = fareBeforeTax,

                    // KEEP FOR BACKWARD COMPATIBILITY
                    PriceInr = fareBeforeTax
                });
            }

            List<BusPointDto> boardingPoints = [];
            if (!string.IsNullOrWhiteSpace(bus.BoardingPointsJson))
            {
                try
                {
                    boardingPoints = System.Text.Json.JsonSerializer.Deserialize<List<BusPointDto>>(
                        bus.BoardingPointsJson,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
                }
                catch
                {
                    // Ignore or log error
                }
            }

            List<BusPointDto> droppingPoints = [];
            if (!string.IsNullOrWhiteSpace(bus.DroppingPointsJson))
            {
                try
                {
                    droppingPoints = System.Text.Json.JsonSerializer.Deserialize<List<BusPointDto>>(
                        bus.DroppingPointsJson,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
                }
                catch
                {
                    // Ignore or log error
                }
            }

            if (boardingPoints.Count > 0 && droppingPoints.Count > 0)
            {
                var boardingNames = boardingPoints.Select(x => x.Name.Trim().ToLowerInvariant()).ToHashSet();
                var cleanDropping = new List<BusPointDto>();

                foreach (var dp in droppingPoints)
                {
                    var dpName = dp.Name.Trim().ToLowerInvariant();
                    if (boardingNames.Contains(dpName))
                    {
                        continue;
                    }
                    cleanDropping.Add(dp);
                }

                if (cleanDropping.Count == 0)
                {
                    cleanDropping.Add(droppingPoints[0]);
                    if (boardingPoints.Count > 1)
                    {
                        var firstDroppingName = droppingPoints[0].Name.Trim().ToLowerInvariant();
                        boardingPoints = boardingPoints.Where(bp => bp.Name.Trim().ToLowerInvariant() != firstDroppingName).ToList();
                    }
                }

                droppingPoints = cleanDropping;
            }

            var response = new SeatMapResponseDto
            {
                TripId = busId,
                TripType = "Bus",

                LayoutType = layout.LayoutType,

                Variant = bus.BusType.Contains("Hybrid", StringComparison.OrdinalIgnoreCase)
    ? "HYBRID"
    : "STANDARD",

                PriceInr = seatDtos
         .Where(s => !s.IsBooked)
         .Select(s => s.PriceInr)
         .DefaultIfEmpty(bus.PriceInr)
         .Min(),

                TotalSeats = seats.Count,
                BookedSeats = booked,
                AvailableSeats = seats.Count - booked,

                Seats = seatDtos,

                SeatDefinitions =
         definitions.Select(d =>
             new SeatDefinitionDto
             {
                 SeatCode = d.SeatCode,
                 SeatType = d.SeatType,
                 Deck = d.Deck,
                 Row = d.Row,
                 Column = d.Column,
                 IsSleeper = d.IsSleeper,
                 IsUpper = d.IsUpper,
                 
             }).ToList(),

                Sections = sections,
                BoardingPoints = boardingPoints,
                DroppingPoints = droppingPoints
            };

            return Ok(response);
        }
        [HttpPost("pricing-preview")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPricingPreview(
    [FromBody] BusPricingPreviewRequestDto request)
        {
            if (request.SeatCodes.Count == 0)
            {
                return BadRequest(
                    "At least one seat must be selected.");
            }

            var result = await _promotionEngine.CalculateAsync(
     request.BusId,
     request.SeatCodes,
     request.CouponCode,
     request.PromotionId,
         selectedFeaturedOfferId: request.SelectedFeaturedOfferId);

            result.DiscountLabel =
                result.DiscountSource switch
                {
                    "Offer" => "Offer Applied",
                    "Discount" => "Discount Applied",
                    "Coupon" => "Coupon Applied",
                    _ => "Discount Applied"
                };

            return Ok(result);
        }

        [HttpGet("pricing-config")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPricingConfig(
    [FromQuery] string seatType,
    [FromQuery] string gstCategory,
    [FromQuery] decimal baseFare)
        {
            var markup =
                await GetActiveSeatMarkupAsync(seatType);

            var markupAmount =
                CalculateMarkupAmount(baseFare, markup);

            var sellingFare =
                baseFare + markupAmount;

            var gstSetting =
                await GetActiveBusGstAsync(gstCategory);

            var gstPercent =
                gstSetting?.GstPercent ?? 0m;

            var gstAmount = decimal.Round(
                sellingFare * gstPercent / 100m,
                2,
                MidpointRounding.AwayFromZero);

            var convenienceFee =
                await GetActiveBusConvenienceFeeAsync();

            var grandTotal =
                sellingFare +
                gstAmount +
                convenienceFee;

            return Ok(new
            {
                baseFare,

                markupType = markup?.MarkupType,
                markupValue = markup?.Value ?? 0,
                markupAmount,

                sellingFare,

                gstPercent,
                gstAmount,

                convenienceFee,

                grandTotal
            });
        }
        [HttpPost("{busId:int}/book")]
        public async Task<IActionResult> BookBus(int busId, [FromBody] CreateBusBookingRequestDto request)
        {
            if (!currentUserService.IsAuthenticated())
            {
                return Unauthorized("Please login to continue booking.");
            }
            var userId = currentUserService.GetUserOrGuestId();

            var passengerValidationError = ValidateAndNormalizePassengers(request.Passengers, out var normalizedPassengers);
            if (passengerValidationError is not null)
                return BadRequest(passengerValidationError);

            if (string.IsNullOrWhiteSpace(request.PassengerPhone))
                return BadRequest("PassengerPhone is required for contact.");

            var contactName = string.IsNullOrWhiteSpace(request.PassengerName)
                ? normalizedPassengers![0].FullName
                : request.PassengerName.Trim();

            if (string.IsNullOrWhiteSpace(contactName))
                return BadRequest("PassengerName is required for contact.");

            var seatsRequired = normalizedPassengers!.Count;
            var strategy = dbContext.Database.CreateExecutionStrategy();

            try
            {
                var executionResult = await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await dbContext.Database.BeginTransactionAsync();
                    try
                    {
                        var bus = await dbContext.BusBookings.FirstOrDefaultAsync(x => x.Id == busId);
                        if (bus is null)
                            throw new Exception("Bus not found.");

                        await EnsureBusSeatsGeneratedAsync(busId);

                        if (bus.DepartureTime <= DateTime.UtcNow)
                            throw new Exception("Cannot book a bus that already departed.");
                        var actualAvailableSeats = await dbContext.BusSeats
    .CountAsync(x => x.BusBookingId == busId && !x.IsBooked);

                        if (actualAvailableSeats < seatsRequired)
                            throw new Exception("Not enough seats available");

                        var requestedSeatCodes = normalizedPassengers
                            .Where(x => !string.IsNullOrWhiteSpace(x.SeatNumber))
                            .Select(x => x.SeatNumber!)
                            .ToList();

                        if (requestedSeatCodes.Count != requestedSeatCodes.Distinct(StringComparer.OrdinalIgnoreCase).Count())
                            throw new Exception("Duplicate seat numbers in request.");

                        var seatAssignedPassengers = new List<string>();
                        var allSeats = await dbContext.BusSeats
    .Where(x => x.BusBookingId == busId)
    .ToListAsync();

                        var layout = BusSeatLayoutRegistry.Resolve(bus.BusType);
                        var sections =
     layout.GetSections(
         allSeats.Count,
         bus.BusType);

                        var grid = BuildSeatGrid(sections);

                        // preload booked seats
                        var bookedPassengers = await dbContext.BusReservationPassengers
                            .Include(x => x.BusReservation)
                            .Where(x =>
                                x.BusReservation.BusBookingId == busId &&
                                x.BusReservation.Status == "Booked")
                            .ToListAsync();

                        var bookedSeatGenderMap = bookedPassengers
                            .Where(x => !string.IsNullOrWhiteSpace(x.SeatNumber))
                            .ToDictionary(x => x.SeatNumber!, x => x.Gender);

                        // 🔥 HANDLE MANUAL SEATS
                        if (requestedSeatCodes.Count > 0)
                        {
                            foreach (var passenger in normalizedPassengers.Where(p => p.SeatNumber != null))
                            {
                                var seatCode = passenger.SeatNumber!;

                                var adjacentSeats = GetAdjacentSeats(seatCode, grid, sections);

                                foreach (var adjSeat in adjacentSeats)
                                {
                                    var isSameRequest = normalizedPassengers.Any(p => p.SeatNumber == adjSeat);
                                    if (isSameRequest) continue;

                                    if (bookedSeatGenderMap.TryGetValue(adjSeat, out var gender))
                                    {
                                        if (!gender.Equals(passenger.Gender, StringComparison.OrdinalIgnoreCase))
                                        {
                                            throw new Exception(
                                                $"Seat {seatCode} blocked. Adjacent seat {adjSeat} is booked by {gender}");
                                        }
                                    }
                                }

                                var rows = await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
        UPDATE `bus_seats`
        SET IsBooked = TRUE
        WHERE BusBookingId = {busId}
        AND SeatCode = {seatCode}
        AND IsBooked = FALSE
    ");

                                if (rows == 0)
                                    throw new Exception($"Seat {seatCode} already booked");

                                seatAssignedPassengers.Add(seatCode);
                            }
                        }

                        // 🔥 HANDLE AUTO SEATS
                        // 🔥 REMOVE AUTO SEAT ASSIGNMENT
                        var autoSeatCount = normalizedPassengers.Count - requestedSeatCodes.Count;

                        if (autoSeatCount > 0)
                        {
                            throw new Exception("Seat selection is mandatory for all passengers.");
                        }




                        // 🔥 FINAL VALIDATION (VERY IMPORTANT)
                        if (seatAssignedPassengers.Count != seatsRequired)
                        {
                            throw new Exception("Seat allocation mismatch");
                        }
                        // ========================================
                        // UNIFIED PROMOTION VALIDATION
                        // ========================================
                        BusPromotion? promotionToApply = null;
                        FeaturedOffer? selectedFeaturedOffer = null;

                        if (request.SelectedFeaturedOfferId.HasValue)
                        {
                            selectedFeaturedOffer = await dbContext.FeaturedOffers
                                .Include(x => x.Conditions)
                                .FirstOrDefaultAsync(x => x.Id == request.SelectedFeaturedOfferId.Value && x.IsActive);

                            if (selectedFeaturedOffer == null)
                                throw new Exception("Selected offer is invalid or inactive.");

                            if (!string.IsNullOrWhiteSpace(request.CouponCode))
                            {
                                throw new Exception("Featured offers cannot stack with manual coupons.");
                            }
                            if (request.PromotionId.HasValue)
                            {
                                throw new Exception("Only one manual promotion/offer can be applied.");
                            }
                        }
                        else if (!string.IsNullOrWhiteSpace(request.CouponCode))
                        {
                            var normalizedCoupon = request.CouponCode.Trim().ToUpperInvariant();
                            var promoByCode = await dbContext.BusPromotions
                                .Include(x => x.Conditions)
                                .FirstOrDefaultAsync(x => x.Code == normalizedCoupon && x.IsActive && !x.IsAutoApply);

                            if (promoByCode == null)
                            {
                                throw new Exception("Invalid or inactive coupon code.");
                            }

                            if (request.PromotionId.HasValue && request.PromotionId.Value != promoByCode.Id)
                            {
                                throw new Exception("Only one manual promotion/offer can be applied.");
                            }

                            promotionToApply = promoByCode;
                        }
                        else if (request.PromotionId.HasValue)
                        {
                            var promoById = await dbContext.BusPromotions
                                .Include(x => x.Conditions)
                                .FirstOrDefaultAsync(x => x.Id == request.PromotionId.Value && x.IsActive && !x.IsAutoApply);

                            if (promoById == null)
                            {
                                throw new Exception("Invalid or inactive promotion.");
                            }

                            promotionToApply = promoById;
                        }

                        if (selectedFeaturedOffer != null)
                        {
                            var nowUtc = DateTime.UtcNow;

                            if (selectedFeaturedOffer.StartDateUtc.HasValue && selectedFeaturedOffer.StartDateUtc.Value > nowUtc)
                            {
                                throw new Exception("Featured offer has not started yet.");
                            }

                            if (selectedFeaturedOffer.EndDateUtc.HasValue && selectedFeaturedOffer.EndDateUtc.Value < nowUtc)
                            {
                                throw new Exception("Featured offer has expired.");
                            }

                            if (selectedFeaturedOffer.MaxUsage.HasValue && selectedFeaturedOffer.UsedCount >= selectedFeaturedOffer.MaxUsage.Value)
                            {
                                throw new Exception("Featured offer usage limit reached.");
                            }
                        }
                        else if (promotionToApply != null)
                        {
                            var nowUtc = DateTime.UtcNow;

                            if (promotionToApply.StartDateUtc.HasValue && promotionToApply.StartDateUtc.Value > nowUtc)
                            {
                                throw new Exception("Promotion has not started yet.");
                            }

                            if (promotionToApply.EndDateUtc.HasValue && promotionToApply.EndDateUtc.Value < nowUtc)
                            {
                                throw new Exception("Promotion has expired.");
                            }

                            if (promotionToApply.MaxUsage.HasValue && promotionToApply.UsedCount >= promotionToApply.MaxUsage.Value)
                            {
                                throw new Exception("Promotion usage limit reached.");
                            }

                            if (promotionToApply.MaxUsagePerUser > 0)
                            {
                                var userPromoUsageCount = await dbContext.BusPromotionUsages
                                    .CountAsync(x => x.BusPromotionId == promotionToApply.Id && x.UserId == userId && x.BookingStatus == "Booked");

                                if (userPromoUsageCount >= promotionToApply.MaxUsagePerUser)
                                {
                                    throw new Exception("Your usage limit for this promotion has been reached.");
                                }
                            }

                            if (promotionToApply.IsFirstTimeUserOnly)
                            {
                                var userBookingHistoryService = HttpContext.RequestServices.GetRequiredService<IUserBookingHistoryService>();
                                var hasPrior = await userBookingHistoryService.HasPriorBookingAsync(userId, request.PassengerPhone);
                                if (hasPrior)
                                {
                                    throw new Exception("This promotion is only valid for your first booking.");
                                }
                            }
                        }

                        // ========================================
                        // CENTRALIZED PRICING ENGINE
                        // ========================================
                        var pricing = await _promotionEngine.CalculateAsync(
                            bus.Id,
                            seatAssignedPassengers,
                            request.CouponCode,
                            request.PromotionId,
                            int.Parse(userId!),
                            request.SelectedFeaturedOfferId);

                        var pnr = await GenerateUniqueBusPnrAsync();
                        var reservation = new BusReservation
                        {
                            BookingReference = $"BS-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 1000)}",
                            Pnr = pnr,
                            UserId = userId!,
                            BusBookingId = bus.Id,
                            PassengerName = contactName,
                            PassengerPhone = request.PassengerPhone.Trim(),
                            PassengerEmail = string.IsNullOrWhiteSpace(request.PassengerEmail) ? null : request.PassengerEmail.Trim(),
                            SeatsBooked = seatsRequired,
                            TotalPriceInr = pricing.GrandTotal,
                            CustomerFareInr = pricing.GrandTotal,
                            NetFareInr = pricing.SubtotalBeforeCoupon,
                            BaseFareInr = pricing.Seats.Sum(x => x.BaseFare),
                            MarkupAmountInr = pricing.Seats.Sum(x => x.MarkupAmount),
                            TaxableFareInr = pricing.TaxableFare,
                            GstPercent = pricing.GstPercent,
                            GstAmountInr = pricing.GstAmount,
                            DiscountAmountInr = pricing.AutoDiscountAmount + pricing.CouponDiscountAmount + pricing.ManualDiscountAmount,
                            ConvenienceFeeInr = pricing.ConvenienceFee,
                            CouponCode = string.IsNullOrWhiteSpace(request.CouponCode) ? null : request.CouponCode.Trim().ToUpperInvariant(),
                            AppliedPromotionId = promotionToApply?.Id,
                            AppliedPromotionCode = pricing.AppliedPromotionCode,
                            AppliedPromotionType = pricing.AppliedPromotionType ?? pricing.DiscountSource,
                            AppliedFeaturedOfferId = request.SelectedFeaturedOfferId,
                            AppliedFeaturedOfferTitle = selectedFeaturedOffer?.Title,
                            FeaturedOfferDiscountAmount = selectedFeaturedOffer != null ? pricing.ManualDiscountAmount : 0m,
                            AutoPromotionId = pricing.AutoPromotionCode != null ? (await dbContext.BusPromotions.Where(x => x.Code == pricing.AutoPromotionCode).Select(x => (int?)x.Id).FirstOrDefaultAsync()) : null,
                            AutoPromotionCode = pricing.AutoPromotionCode,
                            DiscountSource = pricing.DiscountSource,
                            Status = "Booked",
                            BookedAtUtc = DateTime.UtcNow
                        };

                        dbContext.BusReservations.Add(reservation);
                        await dbContext.SaveChangesAsync();

                        // ========================================
                        // ATOMIC INCREMENT & USAGE LOGGING
                        // ========================================
                        if (pricing.AutoDiscountAmount > 0 && !string.IsNullOrEmpty(pricing.AutoPromotionCode))
                        {
                            var autoPromo = await dbContext.BusPromotions.FirstOrDefaultAsync(x => x.Code == pricing.AutoPromotionCode);
                            if (autoPromo != null)
                            {
                                var autoUsage = new BusPromotionUsage
                                {
                                    BusPromotionId = autoPromo.Id,
                                    FeaturedOfferId = null,
                                    BusReservationId = reservation.Id,
                                    UserId = userId!,
                                    PromotionCode = autoPromo.Code,
                                    PromotionType = autoPromo.PromotionType,
                                    DiscountAmountInr = pricing.AutoDiscountAmount,
                                    BookingTotalInr = pricing.GrandTotal,
                                    BookingStatus = "Booked",
                                    UsedAtUtc = DateTime.UtcNow
                                };
                                dbContext.BusPromotionUsages.Add(autoUsage);

                                var autoRows = await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
                                    UPDATE buspromotions
                                    SET UsedCount = UsedCount + 1
                                    WHERE Id = {autoPromo.Id}
                                    AND (MaxUsage IS NULL OR UsedCount < MaxUsage)
                                ");
                                if (autoRows == 0 && autoPromo.MaxUsage.HasValue)
                                {
                                    throw new Exception($"Auto-promotion '{autoPromo.Code}' usage limit reached concurrently.");
                                }
                            }
                        }

                        if (selectedFeaturedOffer != null)
                        {
                            var featuredUsage = new FeaturedOfferUsage
                            {
                                FeaturedOfferId = selectedFeaturedOffer.Id,
                                BusReservationId = reservation.Id,
                                UserId = userId!,
                                DiscountAmount = pricing.ManualDiscountAmount,
                                UsedAtUtc = DateTime.UtcNow
                            };
                            dbContext.FeaturedOfferUsages.Add(featuredUsage);

                            var rowsUpdated = await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
                                UPDATE featuredoffers
                                SET UsedCount = UsedCount + 1
                                WHERE Id = {selectedFeaturedOffer.Id}
                                AND (MaxUsage IS NULL OR UsedCount < MaxUsage)
                            ");
                            if (rowsUpdated == 0 && selectedFeaturedOffer.MaxUsage.HasValue)
                            {
                                throw new Exception("Featured offer usage limit reached concurrently.");
                            }
                        }
                        else if (promotionToApply != null)
                        {
                            var discountAmt = promotionToApply.PromotionType.Equals("Coupon", StringComparison.OrdinalIgnoreCase)
                                ? pricing.CouponDiscountAmount
                                : pricing.ManualDiscountAmount;

                            var manualUsage = new BusPromotionUsage
                            {
                                BusPromotionId = promotionToApply.Id,
                                BusReservationId = reservation.Id,
                                UserId = userId!,
                                PromotionCode = promotionToApply.Code,
                                PromotionType = promotionToApply.PromotionType,
                                DiscountAmountInr = discountAmt,
                                BookingTotalInr = pricing.GrandTotal,
                                BookingStatus = "Booked",
                                UsedAtUtc = DateTime.UtcNow
                            };
                            dbContext.BusPromotionUsages.Add(manualUsage);

                            var manualRows = await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
                                UPDATE buspromotions
                                SET UsedCount = UsedCount + 1
                                WHERE Id = {promotionToApply.Id}
                                AND (MaxUsage IS NULL OR UsedCount < MaxUsage)
                            ");
                            if (manualRows == 0 && promotionToApply.MaxUsage.HasValue)
                            {
                                throw new Exception("Promotion usage limit reached concurrently.");
                            }
                        }

                        var passengers = new List<BusReservationPassenger>();
                        foreach (var p in normalizedPassengers)
                        {
                            passengers.Add(new BusReservationPassenger
                            {
                                BusReservationId = reservation.Id,
                                FullName = p.FullName,
                                Gender = p.Gender,
                                SeatNumber = p.SeatNumber!,
                                Age = p.Age
                            });
                        }
                        dbContext.BusReservationPassengers.AddRange(passengers);

                        await TrackBusRouteBookingCounterAsync(bus.FromCity, bus.ToCity);

                        await dbContext.SaveChangesAsync();
                        await transaction.CommitAsync();




                        return new
                        {
                            Reservation = reservation,
                            Bus = bus,
                            Passengers = passengers,
                            Response = MapBusReservation(reservation, bus, passengers)
                        };
                    }

                    catch (Exception)
                    {
                        await transaction.RollbackAsync();
                        throw;
                    }
                });

               

                try
                {


                    await TrySendBusBookingNotificationsAsync(
                        executionResult.Reservation,
                        executionResult.Bus,
                        executionResult.Passengers
                    );
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Booking notification failed for {BookingReference}",
                        executionResult.Reservation.BookingReference);
                }
                return CreatedAtAction(
     nameof(GetBusBookingById),
     new { bookingId = executionResult.Reservation.Id },
     executionResult.Response
 );

            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("bookings")]
        public async Task<IActionResult> GetBusBookings([FromQuery] string? passengerPhone, [FromQuery] string? status)
        {
            if (!currentUserService.IsAuthenticated())
            {
                return Unauthorized("Please login to continue booking.");
            }
            var userId = currentUserService.GetUserOrGuestId();

            var queryable = dbContext.BusReservations
                .AsNoTracking()
                .Include(x => x.BusBooking)
                .Where(x => x.UserId == userId)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(passengerPhone))
            {
                var phone = passengerPhone.Trim();
                queryable = queryable.Where(x => EF.Functions.Like(x.PassengerPhone, phone));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim();
                queryable = queryable.Where(x => EF.Functions.Like(x.Status, normalizedStatus));
            }

            var bookings = await queryable
                .OrderByDescending(x => x.BookedAtUtc)
                .Take(200)
                .ToListAsync();

            var bookingIds = bookings.Select(x => x.Id).ToList();
            var passengers = await dbContext.BusReservationPassengers
                .AsNoTracking()
                .Where(x => bookingIds.Contains(x.BusReservationId))
                .OrderBy(x => x.Id)
                .ToListAsync();

            var passengersByBooking = passengers
                .GroupBy(x => x.BusReservationId)
                .ToDictionary(x => x.Key, x => (IReadOnlyList<BusReservationPassenger>)x.ToList());

            var response = bookings
                .Where(x => x.BusBooking is not null)
                .Select(x =>
                {
                    if (!passengersByBooking.TryGetValue(x.Id, out var passengerRows))
                    {
                        passengerRows = Array.Empty<BusReservationPassenger>();
                    }

                    return MapBusReservation(x, x.BusBooking!, passengerRows);
                });

            return Ok(response);
        }

        

        [HttpGet("bookings/{bookingId:int}")]
        public async Task<IActionResult> GetBusBookingById(int bookingId)
        {
            if (!currentUserService.IsAuthenticated())
            {
                return Unauthorized("Please login to continue booking.");
            }
            var userId = currentUserService.GetUserOrGuestId();

            var booking = await dbContext.BusReservations
                .AsNoTracking()
                .Include(x => x.BusBooking)
                .FirstOrDefaultAsync(x => x.Id == bookingId && x.UserId == userId);

            if (booking is null || booking.BusBooking is null)
            {
                return NotFound("Booking not found.");
            }

            var passengers = await dbContext.BusReservationPassengers
                .AsNoTracking()
                .Where(x => x.BusReservationId == booking.Id)
                .OrderBy(x => x.Id)
                .ToListAsync();

            return Ok(MapBusReservation(booking, booking.BusBooking, passengers));
        }

        [HttpPost("bookings/{bookingId:int}/cancel")]
        public async Task<IActionResult> CancelBusBooking(int bookingId, [FromQuery] string? reason)
        {
            if (!currentUserService.IsAuthenticated())
            {
                return Unauthorized("Please login to continue booking.");
            }
            var userId = currentUserService.GetUserOrGuestId();

            var strategy = dbContext.Database.CreateExecutionStrategy();
            try
            {
                var (result, cancelledPassengerIds, currentRefund) = await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await dbContext.Database.BeginTransactionAsync();

                    var booking = await dbContext.BusReservations
                        .Include(x => x.BusBooking)
                        .FirstOrDefaultAsync(x => x.Id == bookingId && x.UserId == userId);

                    if (booking is null || booking.BusBooking is null)
                        throw new Exception("Booking not found.");

                    if (booking.Status == "Cancelled")
                        throw new Exception("Already cancelled.");
                    // Prevent cancellation after departure
                    if (booking.BusBooking.DepartureTime <= DateTime.UtcNow)
                    {
                        throw new Exception("Cannot cancel ticket after bus departure.");
                    }

                    // 🔥 GET PASSENGERS
                    var passengers = await dbContext.BusReservationPassengers
                        .Where(x => x.BusReservationId == booking.Id)
                        .ToListAsync();

                    var activePassengers = passengers.Where(x => !x.IsCancelled).ToList();
                    if (activePassengers.Count == 0)
                        throw new Exception("Already cancelled.");

                    var seatNumbers = activePassengers
                        .Where(x => !string.IsNullOrWhiteSpace(x.SeatNumber))
                        .Select(x => x.SeatNumber!)
                        .ToList();

                    // 🔥 RELEASE SEATS
                    if (seatNumbers.Count > 0)
                    {
                        var seats = await dbContext.BusSeats
                            .Where(x =>
                                x.BusBookingId == booking.BusBookingId &&
                                seatNumbers.Contains(x.SeatCode) &&
                                x.IsBooked)
                            .ToListAsync();

                        // ✅ VALIDATION
                        if (seats.Count != seatNumbers.Count)
                            throw new Exception("Seat mismatch during cancellation");

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

                    // ✅ 1. Update coupon usage status
                    var usage = await dbContext.BusCouponUsages
                        .FirstOrDefaultAsync(x => x.BusReservationId == booking.Id);

                    if (usage != null)
                    {
                        usage.BookingStatus = "Cancelled";
                        usage.UsedAtUtc = DateTime.UtcNow;
                    }

                    // ✅ 2. Decrease global coupon usage
                    if (!string.IsNullOrWhiteSpace(booking.CouponCode))
                    {
                        await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
    UPDATE bus_coupons
    SET UsedCount = CASE 
        WHEN UsedCount > 0 THEN UsedCount - 1 
        ELSE 0 
    END
    WHERE CouponCode = {booking.CouponCode}
");
                    }

                    // Unified promotion cancellation handling:
                    var unifiedUsages = await dbContext.BusPromotionUsages
                        .Where(x => x.BusReservationId == booking.Id && x.BookingStatus == "Booked")
                        .ToListAsync();

                    foreach (var u in unifiedUsages)
                    {
                        u.BookingStatus = "Cancelled";
                        u.UsedAtUtc = DateTime.UtcNow;

                        // Decrement atomic promotion usage
                        await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
                            UPDATE buspromotions
                            SET UsedCount = CASE 
                                WHEN UsedCount > 0 THEN UsedCount - 1 
                                ELSE 0 
                            END
                            WHERE Id = {u.BusPromotionId}
                        ");
                    }

                    // 🔥 validation
                    if (booking.SeatsBooked <= 0)
                        throw new Exception("Invalid seat count in booking");

                    
                    // ── Cancellation policy based on hours before departure ──
                    var istNow = DateTime.UtcNow.Add(IndiaOffset);
                    var istDeparture = booking.BusBooking.DepartureTime.Add(IndiaOffset);
                    var hoursBeforeDeparture = (istDeparture - istNow).TotalHours;

                    decimal refundPercent;

                    if (hoursBeforeDeparture >= 12)
                    {
                        refundPercent = 1.00m;   // 100% refund
                    }
                    else if (hoursBeforeDeparture >= 6)
                    {
                        refundPercent = 0.75m;   // 75% refund
                    }
                    else if (hoursBeforeDeparture > 0)
                    {
                        refundPercent = 0.50m;   // 50% refund
                    }
                    else
                    {
                        refundPercent = 0m;      // Bus already departed — no refund
                    }

                    var proportionalPrice = (booking.TotalPriceInr / booking.SeatsBooked) * activePassengers.Count;
                    var refundAmount = decimal.Round(proportionalPrice * refundPercent, 2);
                    var cancellationCharge = proportionalPrice - refundAmount;

                    booking.CancellationChargeInr = (booking.CancellationChargeInr ?? 0m) + cancellationCharge;
                    booking.RefundAmountInr = (booking.RefundAmountInr ?? 0m) + refundAmount;
                    
                    // 🔥 ALWAYS SYNC FROM SOURCE OF TRUTH
                    var actualAvailableSeats = await dbContext.BusSeats
                        .CountAsync(x => x.BusBookingId == booking.BusBookingId && !x.IsBooked);

                    booking.BusBooking.AvailableSeats = actualAvailableSeats;

                    await dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var resultPassengers = await dbContext.BusReservationPassengers
                        .AsNoTracking()
                        .Where(x => x.BusReservationId == booking.Id)
                        .OrderBy(x => x.Id)
                        .ToListAsync();

                    var mapped = MapBusReservation(booking, booking.BusBooking, resultPassengers);
                    return (mapped, activePassengers.Select(x => x.Id).ToList(), refundAmount);
                });

                await TrySendBusCancellationNotificationsAsync(bookingId, userId!, cancelledPassengerIds, currentRefund);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("bookings/{bookingId:int}/cancel-passengers")]
        public async Task<IActionResult> CancelBusPassengers(int bookingId, [FromBody] CancelPassengersRequestDto request)
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
                var (result, cancelledPassengerIds, currentRefund) = await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await dbContext.Database.BeginTransactionAsync();

                    var booking = await dbContext.BusReservations
                        .Include(x => x.BusBooking)
                        .FirstOrDefaultAsync(x => x.Id == bookingId && x.UserId == userId);

                    if (booking is null || booking.BusBooking is null)
                        throw new Exception("Booking not found.");

                    if (booking.Status == "Cancelled")
                        throw new Exception("Already cancelled.");

                    // Prevent cancellation after departure
                    if (booking.BusBooking.DepartureTime <= DateTime.UtcNow)
                    {
                        throw new Exception("Cannot cancel ticket after bus departure.");
                    }

                    // 🔥 GET PASSENGERS
                    var passengers = await dbContext.BusReservationPassengers
                        .Where(x => x.BusReservationId == booking.Id)
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

                    // 🔥 RELEASE SEATS
                    if (seatNumbers.Count > 0)
                    {
                        var seats = await dbContext.BusSeats
                            .Where(x =>
                                x.BusBookingId == booking.BusBookingId &&
                                seatNumbers.Contains(x.SeatCode) &&
                                x.IsBooked)
                            .ToListAsync();

                        if (seats.Count != seatNumbers.Count)
                            throw new Exception("Seat mismatch during cancellation");

                        foreach (var seat in seats)
                        {
                            seat.IsBooked = false;
                        }
                    }

                    // Mark passengers cancelled
                    foreach (var p in targetPassengers)
                    {
                        p.IsCancelled = true;
                        p.CancelledAtUtc = DateTime.UtcNow;
                    }

                    // ── Cancellation policy based on hours before departure ──
                    var istNow = DateTime.UtcNow.Add(IndiaOffset);
                    var istDeparture = booking.BusBooking.DepartureTime.Add(IndiaOffset);
                    var hoursBeforeDeparture = (istDeparture - istNow).TotalHours;

                    decimal refundPercent;
                    if (hoursBeforeDeparture >= 12)
                    {
                        refundPercent = 1.00m;
                    }
                    else if (hoursBeforeDeparture >= 6)
                    {
                        refundPercent = 0.75m;
                    }
                    else if (hoursBeforeDeparture > 0)
                    {
                        refundPercent = 0.50m;
                    }
                    else
                    {
                        refundPercent = 0m;
                    }

                    var proportionalPrice = (booking.TotalPriceInr / booking.SeatsBooked) * targetPassengers.Count;
                    var refundAmount = decimal.Round(proportionalPrice * refundPercent, 2);
                    var cancellationCharge = proportionalPrice - refundAmount;

                    booking.CancellationChargeInr = (booking.CancellationChargeInr ?? 0m) + cancellationCharge;
                    booking.RefundAmountInr = (booking.RefundAmountInr ?? 0m) + refundAmount;

                    // If all active passengers are now cancelled, set full booking status to Cancelled and cancel coupon/promo usages
                    var remainingActiveCount = activePassengersCount - targetPassengers.Count;
                    if (remainingActiveCount == 0)
                    {
                        booking.Status = "Cancelled";
                        booking.CancelledAtUtc = DateTime.UtcNow;
                        booking.CancellationReason = string.IsNullOrWhiteSpace(request.Reason)
                            ? "All passengers cancelled"
                            : request.Reason.Trim();

                        // ✅ 1. Update coupon usage status
                        var usage = await dbContext.BusCouponUsages
                            .FirstOrDefaultAsync(x => x.BusReservationId == booking.Id);

                        if (usage != null)
                        {
                            usage.BookingStatus = "Cancelled";
                            usage.UsedAtUtc = DateTime.UtcNow;
                        }

                        // ✅ 2. Decrease global coupon usage
                        if (!string.IsNullOrWhiteSpace(booking.CouponCode))
                        {
                            await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
                                UPDATE bus_coupons
                                SET UsedCount = CASE 
                                    WHEN UsedCount > 0 THEN UsedCount - 1 
                                    ELSE 0 
                                END
                                WHERE CouponCode = {booking.CouponCode}
                            ");
                        }

                        // Unified promotion cancellation handling:
                        var unifiedUsages = await dbContext.BusPromotionUsages
                            .Where(x => x.BusReservationId == booking.Id && x.BookingStatus == "Booked")
                            .ToListAsync();

                        foreach (var u in unifiedUsages)
                        {
                            u.BookingStatus = "Cancelled";
                            u.UsedAtUtc = DateTime.UtcNow;

                            // Decrement atomic promotion usage
                            await dbContext.Database.ExecuteSqlInterpolatedAsync($@"
                                UPDATE buspromotions
                                SET UsedCount = CASE 
                                    WHEN UsedCount > 0 THEN UsedCount - 1 
                                    ELSE 0 
                                END
                                WHERE Id = {u.BusPromotionId}
                            ");
                        }
                    }

                    // 🔥 ALWAYS SYNC FROM SOURCE OF TRUTH
                    var actualAvailableSeats = await dbContext.BusSeats
                        .CountAsync(x => x.BusBookingId == booking.BusBookingId && !x.IsBooked);

                    booking.BusBooking.AvailableSeats = actualAvailableSeats;

                    await dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var resultPassengers = await dbContext.BusReservationPassengers
                        .AsNoTracking()
                        .Where(x => x.BusReservationId == booking.Id)
                        .OrderBy(x => x.Id)
                        .ToListAsync();

                    var mapped = MapBusReservation(booking, booking.BusBooking, resultPassengers);
                    return (mapped, targetPassengers.Select(x => x.Id).ToList(), refundAmount);
                });

                await TrySendBusCancellationNotificationsAsync(bookingId, userId!, cancelledPassengerIds, currentRefund);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        private async Task<string> GenerateUniqueBusPnrAsync()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            while (true)
            {
                var pnr = new string(Enumerable.Repeat(chars, 8)
                    .Select(s => s[Random.Shared.Next(s.Length)]).ToArray());
                if (!await dbContext.BusReservations.AnyAsync(x => x.Pnr == pnr))
                {
                    return pnr;
                }
            }
        }

        private static object MapBusReservation(BusReservation reservation, BusBooking bus, IReadOnlyList<BusReservationPassenger> passengers)
        {
            var baseDto = new BookingResponseDto
            {
                BookingId = reservation.Id,
                BookingReference = reservation.BookingReference,
                Pnr = reservation.Pnr,
                TripType = "Bus",
                TripId = bus.Id,
                TripNumber = bus.BusNumber,
                ProviderName = bus.OperatorName,
                FromCity = bus.FromCity,
                ToCity = bus.ToCity,
                DepartureTimeUtc = DateTime.SpecifyKind(bus.DepartureTime, DateTimeKind.Utc),
                ArrivalTimeUtc = DateTime.SpecifyKind(bus.ArrivalTime, DateTimeKind.Utc),
                Status = reservation.Status,
                PassengerName = reservation.PassengerName,
                PassengerPhone = reservation.PassengerPhone,
                PassengerEmail = reservation.PassengerEmail,
                TravelClass = "Not Applicable",
                Adults = reservation.SeatsBooked,
                Children = 0,
                Infants = 0,
                SeatsBooked = reservation.SeatsBooked,
                TotalPriceInr = reservation.TotalPriceInr,
                BookedAtUtc = DateTime.SpecifyKind(reservation.BookedAtUtc, DateTimeKind.Utc),
                CancelledAtUtc = reservation.CancelledAtUtc.HasValue ? DateTime.SpecifyKind(reservation.CancelledAtUtc.Value, DateTimeKind.Utc) : null,
                CancellationReason = reservation.CancellationReason
            };

            var passengerDtos = passengers.Select(x => new BusPassengerResponseDto
            {
                Id = x.Id,
                FullName = x.FullName,
                Gender = x.Gender,
                SeatNumber = x.SeatNumber ?? string.Empty,
                Age = x.Age,
                IsCancelled = x.IsCancelled,
                CancelledAtUtc = x.CancelledAtUtc.HasValue ? DateTime.SpecifyKind(x.CancelledAtUtc.Value, DateTimeKind.Utc) : null
            }).ToList();

            var maleCount = passengers.Count(x => x.Gender.Equals("Male", StringComparison.OrdinalIgnoreCase));
            var femaleCount = passengers.Count(x => x.Gender.Equals("Female", StringComparison.OrdinalIgnoreCase));

            return new
            {
                baseDto.BookingId,
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
                CanCancel =
        reservation.Status == "Booked" &&
        bus.DepartureTime > DateTime.UtcNow,

                TripState =
        reservation.Status == "Cancelled"
            ? "Cancelled"
            : bus.DepartureTime <= DateTime.UtcNow
                ? "Completed"
                : "Upcoming",
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
                reservation.AutoDiscountAmountInr,
                reservation.CouponDiscountAmountInr,
                reservation.ConvenienceFeeInr,
                reservation.BaseFareInr,

                reservation.MarkupAmountInr,

                //reservation.MarkupPercent,

                reservation.TaxableFareInr,

                reservation.GstPercent,

                reservation.GstAmountInr,
                reservation.AppliedPromotionId,
                reservation.AppliedPromotionCode,
                reservation.AppliedPromotionType,
                reservation.AppliedFeaturedOfferId,
                reservation.AppliedFeaturedOfferTitle,
                reservation.FeaturedOfferDiscountAmount,
                reservation.CouponCode,
                reservation.AutoPromotionCode,
                reservation.CancellationChargeInr,
                reservation.RefundAmountInr,
                baseDto.BookedAtUtc,
                baseDto.CancelledAtUtc,
                baseDto.CancellationReason,
                Passengers = passengerDtos,
                MaleCount = maleCount,
                FemaleCount = femaleCount
            };
        }

        private async Task IncrementBusRouteSearchCounterAsync(
            string fromCity,
            string toCity,
            string? userOrGuestId,
            DateOnly? journeyDate)
        {
            var stat = await dbContext.BusRouteStats
                .FirstOrDefaultAsync(x => x.FromCity == fromCity && x.ToCity == toCity);

            if (stat is null)
            {
                dbContext.BusRouteStats.Add(new BusRouteStat
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

            dbContext.BusSearchLogs.Add(new BusSearchLog
            {
                UserId = currentUserService.IsAuthenticated() ? userOrGuestId : null,
                UserOrGuestId = userOrGuestId,
                IsGuest = currentUserService.IsGuest(),
                FromCity = fromCity,
                ToCity = toCity,
                JourneyDate = journeyDate,
                SearchedAtUtc = DateTime.UtcNow
            });

            await dbContext.SaveChangesAsync();
        }

        private async Task TrackBusRouteBookingCounterAsync(string fromCity, string toCity)
        {
            var stat = await dbContext.BusRouteStats
                .FirstOrDefaultAsync(x => x.FromCity == fromCity && x.ToCity == toCity);

            if (stat is null)
            {
                dbContext.BusRouteStats.Add(new BusRouteStat
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

        private async Task<decimal> GetActiveBusConvenienceFeeAsync()
        {
            var feeRow = await dbContext.BusConvenienceFees
                .AsNoTracking()
                .OrderByDescending(x => x.UpdateDateUtc)
                .FirstOrDefaultAsync(x => x.Status == "Active");

            return feeRow?.FeeInr ?? 0m;
        }
        private async Task<BusMarkupSetting?> GetActiveSeatMarkupAsync(
    string seatType)
        {
            return await dbContext.BusMarkupSettings
                .AsNoTracking()
                .OrderByDescending(x => x.UpdateDateUtc)
                .FirstOrDefaultAsync(x =>
                    x.Status == "Active" &&
                    x.SeatType.ToUpper() == seatType.ToUpper());
        }
        private async Task<BusGstSetting?> GetActiveBusGstAsync(
     string gstCategory)
        {
            return await dbContext.BusGstSettings
                .AsNoTracking()
                .OrderByDescending(x => x.UpdateDateUtc)
                .FirstOrDefaultAsync(x =>
                    x.Status == "Active" &&
                    x.GstCategory == gstCategory);
        }
        private static decimal CalculateCouponAmount(decimal baseFare, BusCoupon coupon)
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

        private static string? ValidateAndNormalizePassengers(IReadOnlyList<CreateBusPassengerDto>? passengers, out List<CreateBusPassengerDto>? normalizedPassengers)
        {
            normalizedPassengers = null;

            if (passengers is null || passengers.Count == 0)
            {
                return "At least one passenger is required.";
            }

            normalizedPassengers = new List<CreateBusPassengerDto>();
            for (var i = 0; i < passengers.Count; i++)
            {
                var passenger = passengers[i];
                if (string.IsNullOrWhiteSpace(passenger.FullName))
                {
                    return $"Passenger at index {i} has invalid FullName.";
                }

                var normalizedGender = AllowedPassengerGenders.FirstOrDefault(x =>
                    x.Equals(passenger.Gender?.Trim(), StringComparison.OrdinalIgnoreCase));

                if (normalizedGender is null)
                {
                    return $"Passenger at index {i} has invalid Gender. Allowed values: {string.Join(", ", AllowedPassengerGenders)}.";
                }

                var normalizedSeat = NormalizeBusSeatCode(passenger.SeatNumber);
                if (string.IsNullOrWhiteSpace(passenger.SeatNumber))
                {
                    return $"Passenger at index {i} must select a seat.";
                }

                if (normalizedSeat is null)
                {
                    return $"Passenger at index {i} has invalid SeatNumber.";
                }
                if (passenger.Age <= 0 || passenger.Age > 120)
                {
                    return $"Passenger at index {i} has invalid Age.";
                }

                normalizedPassengers.Add(new CreateBusPassengerDto
                {
                    FullName = passenger.FullName.Trim(),
                    Gender = normalizedGender,
                    SeatNumber = normalizedSeat,
                    Age=passenger.Age
                });
            }

            return null;
        }

        private static string? NormalizeBusSeatCode(string? seatNumber)
        {
            if (string.IsNullOrWhiteSpace(seatNumber))
                return null;

            var value = seatNumber.Trim().ToUpperInvariant();

            // Sleeper: L1, U1, etc.
            if ((value.StartsWith('L') || value.StartsWith('U'))
                && int.TryParse(value[1..], out _))
                return value;

            // Seater: 1A, 2B, 10D, etc.
            if (value.Length >= 2 && char.IsDigit(value[0]))
            {
                var numPart = new string(value.TakeWhile(char.IsDigit).ToArray());
                var letterPart = value[numPart.Length..];
                if (int.TryParse(numPart, out _)
                    && letterPart.Length == 1
                    && char.IsLetter(letterPart[0]))
                    return value;
            }

            // Semi-sleeper: W1, W2, etc.
            if (value.StartsWith('W') && int.TryParse(value[1..], out _))
                return value;

            // Legacy: plain number → L prefix
            if (int.TryParse(value, out var numeric) && numeric > 0)
                return $"L{numeric}";

            return null;
        }
        

        private static (DateTime StartUtc, DateTime EndUtc) GetUtcRangeForIstDate(DateOnly date)
        {
            var startIst = new DateTimeOffset(date.Year, date.Month, date.Day, 0, 0, 0, IndiaOffset);
            var endIst = startIst.AddDays(1);

            var startUtcRaw = startIst.UtcDateTime;
            var endUtcRaw = endIst.UtcDateTime;

            // Return exact UTC range (no truncation) to match second-precision scheduling
            return (
                new DateTime(startUtcRaw.Ticks, DateTimeKind.Utc),
                new DateTime(endUtcRaw.Ticks, DateTimeKind.Utc)
            );
        }
        private static decimal CalculateMarkupAmount(
    decimal baseFare,
    BusMarkupSetting? markup)
        {
            if (markup == null)
                return 0m;

            if (markup.MarkupType.Equals(
                "Percentage",
                StringComparison.OrdinalIgnoreCase))
            {
                return baseFare * markup.Value / 100m;
            }

            // FIXED
            return markup.Value;
        }
    //    private async Task<BusPricingPreviewResponseDto> CalculateBusPricingAsync(
    //int busId,
    //List<string> seatCodes,
    //string? couponCode)
    //    {
    //        var bus = await dbContext.BusBookings
    //            .AsNoTracking()
    //            .FirstOrDefaultAsync(x => x.Id == busId);

    //        if (bus is null)
    //            throw new Exception("Bus not found.");

    //        var seats = await dbContext.BusSeats
    //            .AsNoTracking()
    //            .Where(x =>
    //                x.BusBookingId == busId &&
    //                seatCodes.Contains(x.SeatCode))
    //            .ToListAsync();

    //        var response = new BusPricingPreviewResponseDto
    //        {
    //            BusId = bus.Id,
    //            GstCategory = bus.GstCategory
    //        };

    //        decimal subtotal = 0m;

    //        foreach (var seat in seats)
    //        {
    //            var markup = await GetActiveSeatMarkupAsync(seat.SeatType);

    //            var markupAmount = CalculateMarkupAmount(
    //                bus.PriceInr,
    //                markup);

    //            var fareBeforeTax = bus.PriceInr + markupAmount;

    //            subtotal += fareBeforeTax;

    //            response.Seats.Add(new BusSeatPriceBreakdownDto
    //            {
    //                SeatCode = seat.SeatCode,
    //                SeatType = seat.SeatType,
    //                BaseFare = bus.PriceInr,

    //                MarkupAmount = decimal.Round(
    //                    markupAmount,
    //                    2,
    //                    MidpointRounding.AwayFromZero),

    //                FareBeforeTax = decimal.Round(
    //                    fareBeforeTax,
    //                    2,
    //                    MidpointRounding.AwayFromZero)
    //            });
    //        }

    //        response.SubtotalBeforeCoupon = decimal.Round(
    //            subtotal,
    //            2,
    //            MidpointRounding.AwayFromZero);

    //        decimal couponAmount = 0m;

    //        if (!string.IsNullOrWhiteSpace(couponCode))
    //        {
    //            var coupon = await dbContext.BusCoupons
    //                .FirstOrDefaultAsync(x =>
    //                    x.CouponCode == couponCode &&
    //                    x.Status == "Active");

    //            if (coupon is not null)
    //            {
    //                couponAmount =
    //coupon.CouponType.Equals(
    //    "Percentage",
    //    StringComparison.OrdinalIgnoreCase)
    //? subtotal * coupon.Value / 100m
    //: coupon.Value;
    //            }
    //        }

    //        couponAmount = Math.Min(couponAmount, subtotal);

    //        response.CouponAmount = decimal.Round(
    //            couponAmount,
    //            2,
    //            MidpointRounding.AwayFromZero);

    //        var taxableFare = subtotal - couponAmount;

    //        response.TaxableFare = decimal.Round(
    //            taxableFare,
    //            2,
    //            MidpointRounding.AwayFromZero);

    //        var gstSetting = await GetActiveBusGstAsync(
    //            bus.GstCategory);

    //        var gstPercent = gstSetting?.GstPercent ?? 0m;

    //        response.GstPercent = gstPercent;

    //        var gstAmount = taxableFare * gstPercent / 100m;

    //        response.GstAmount = decimal.Round(
    //            gstAmount,
    //            2,
    //            MidpointRounding.AwayFromZero);

    //        var convenienceFee =
    //            await GetActiveBusConvenienceFeeAsync();

    //        response.ConvenienceFee = convenienceFee;

    //        response.GrandTotal = decimal.Round(
    //            taxableFare +
    //            gstAmount +
    //            convenienceFee,
    //            2,
    //            MidpointRounding.AwayFromZero);

    //        return response;
    //    }
        private async Task<decimal> GetSeatFinalFareAsync(
            decimal baseFare,
            string seatType)
        {
            var markup = await GetActiveSeatMarkupAsync(seatType);

            var markupAmount = CalculateMarkupAmount(baseFare, markup);

            return decimal.Round(
                baseFare + markupAmount,
                2,
                MidpointRounding.AwayFromZero);
        }
        private static DateTime ToIst(DateTime utcDateTime)
        {
            return DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc).Add(IndiaOffset);
        }

        private async Task EnsureBusSchedulesForDateAsync(DateOnly date, string? fromCity, string? toCity)
        {
            var todayUtc = DateTime.UtcNow.Date;

            var allRows = await dbContext.BusBookings
                .AsNoTracking()
                .Where(x => string.IsNullOrWhiteSpace(fromCity) || x.FromCity == fromCity)
                .Where(x => string.IsNullOrWhiteSpace(toCity) || x.ToCity == toCity)
                .ToListAsync();

            // One template per BusNumber+Route — always the original seed row
            var templateRows = allRows
                .GroupBy(x => new { x.BusNumber, x.FromCity, x.ToCity })
                .Select(g => g.OrderBy(x => x.Id).First())
                .ToList();

            if (templateRows.Count == 0)
                return;

            // ✅ REMOVED: the second redundant GroupBy that was here

            var (startUtc, endUtc) = GetUtcRangeForIstDate(date);

            var existingKeys = await dbContext.BusBookings
                .AsNoTracking()
                .Where(x => x.DepartureTime >= startUtc && x.DepartureTime < endUtc)
                .Select(x => new { x.BusNumber, x.FromCity, x.ToCity, x.DepartureTime })
                .ToListAsync();

            var existingSet = existingKeys
      .Select(x => $"{x.BusNumber}|{x.FromCity}|{x.ToCity}|{x.DepartureTime:yyyy-MM-ddTHH:mm:ss}")
      .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var toInsert = new List<BusBooking>();
            foreach (var template in templateRows)  // ✅ use templateRows directly
            {
                var depIstTime = ToIst(template.DepartureTime).TimeOfDay;
                var depIst = new DateTime(date.Year, date.Month, date.Day).Add(depIstTime);
                var depUtc = DateTime.SpecifyKind(depIst - IndiaOffset, DateTimeKind.Utc);

                // ✅ FIX: use yyyy-MM-ddTHH:mm:ss to include seconds
                var key = $"{template.BusNumber}|{template.FromCity}|{template.ToCity}|{depUtc:yyyy-MM-ddTHH:mm:ss}";
                if (existingSet.Contains(key))
                    continue;

                var duration = template.ArrivalTime - template.DepartureTime;
                if (duration <= TimeSpan.Zero)
                    duration = TimeSpan.FromMinutes(300);

                toInsert.Add(new BusBooking
                {
                    BusNumber = template.BusNumber,
                    OperatorName = template.OperatorName,
                    BusType = template.BusType,
                    GstCategory = template.GstCategory,
                    FromCity = template.FromCity,
                    ToCity = template.ToCity,
                    BoardingPoint = template.BoardingPoint,
                    DroppingPoint = template.DroppingPoint,
                    BoardingPointsJson = template.BoardingPointsJson,
                    DroppingPointsJson = template.DroppingPointsJson,
                    DepartureTime = depUtc,
                    ArrivalTime = depUtc.Add(duration),
                    PriceInr = template.PriceInr,
                    TotalSeats = template.TotalSeats,
                    AvailableSeats = template.TotalSeats
                });
            }

            if (toInsert.Count > 0)
            {
                // FINAL DUPLICATE CHECK FROM DATABASE
                var finalInsertList = new List<BusBooking>();

                foreach (var item in toInsert)
                {
                    bool alreadyExists = await dbContext.BusBookings.AnyAsync(x =>
                        x.BusNumber == item.BusNumber &&
                        x.FromCity == item.FromCity &&
                        x.ToCity == item.ToCity &&
                        x.DepartureTime == item.DepartureTime);

                    if (!alreadyExists)
                    {
                        finalInsertList.Add(item);
                    }
                }

                if (finalInsertList.Count > 0)
                {
                    await dbContext.BusBookings.AddRangeAsync(finalInsertList);
                    await dbContext.SaveChangesAsync();
                }
            }
        }

        private async Task EnsureBusSeatsGeneratedAsync(int busId)
        {
            var exists = await dbContext.BusSeats.AnyAsync(x => x.BusBookingId == busId);
            if (exists) return;

            var bus = await dbContext.BusBookings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == busId);
            if (bus is null) return;

            var seatCodes = BusSeatLayoutRegistry.BuildSeatCodes(
                Math.Max(1, bus.TotalSeats),
                bus.BusType);

            var seatsToInsert = seatCodes.Select(seatCode => new BusSeat
            {
                BusBookingId = busId,
                SeatCode = seatCode,
                SeatType = BusSeatLayoutRegistry.GetSeatType(
                    bus.BusType,
                    seatCode,
                    bus.TotalSeats),
                IsBooked = false
            }).ToList();

            try
            {
                await dbContext.BusSeats.AddRangeAsync(seatsToInsert);
                await dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("Duplicate entry") == true || ex.Message.Contains("Duplicate entry"))
            {
                dbContext.ChangeTracker.Clear();
            }
        }
       
        private Dictionary<string, (int row, int col, int sectionIndex)> BuildSeatGrid(
    List<SeatSection> sections)
        {
            var map = new Dictionary<string, (int, int, int)>();

            for (int s = 0; s < sections.Count; s++)
            {
                var section = sections[s];

                for (int i = 0; i < section.SeatCodes.Count; i++)
                {
                    var row = i / section.ColumnsPerRow;
                    var col = i % section.ColumnsPerRow;

                    map[section.SeatCodes[i]] = (row, col, s);
                }
            }

            return map;
        }

        private List<string> GetAdjacentSeats(
            string seatCode,
            Dictionary<string, (int row, int col, int sectionIndex)> grid,
            List<SeatSection> sections)
        {
            if (!grid.TryGetValue(seatCode, out var pos))
                return [];

            var (row, col, sectionIndex) = pos;
            var section = sections[sectionIndex];

            var result = new List<string>();

            // LEFT
            if (col > 0 && section.AisleAfterColumn != col - 1)
            {
                result.Add(section.SeatCodes[row * section.ColumnsPerRow + (col - 1)]);
            }

            // RIGHT
            if (col < section.ColumnsPerRow - 1 && section.AisleAfterColumn != col)
            {
                result.Add(section.SeatCodes[row * section.ColumnsPerRow + (col + 1)]);
            }

            return result;
        }





        
        private async Task TrySendBusCancellationNotificationsAsync(
            int bookingId,
            string userId,
            List<int> newlyCancelledPassengerIds,
            decimal currentRefundAmount)
        {
            var booking = await dbContext.BusReservations
                .Include(x => x.BusBooking)
                .FirstOrDefaultAsync(x => x.Id == bookingId && x.UserId == userId);

            if (booking == null || booking.BusBooking == null)
                return;

            var passengers = await dbContext.BusReservationPassengers
                .Where(x => x.BusReservationId == booking.Id)
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
                    await _ticketEmailService.SendBusCancellationAsync(
                        new SendBusTicketEmailRequest
                        {
                            ToEmail = booking.PassengerEmail,
                            PassengerName = booking.PassengerName,
                            BookingReference = booking.BookingReference,
                            Pnr = booking.Pnr,
                            OperatorName = booking.BusBooking.OperatorName,
                            BusType = booking.BusBooking.BusType,
                            Origin = booking.BusBooking.FromCity,
                            Destination = booking.BusBooking.ToCity,
                            DepartureTime = booking.BusBooking.DepartureTime,
                            ArrivalTime = booking.BusBooking.ArrivalTime,
                            IsOvernightArrival = booking.BusBooking.ArrivalTime.Date > booking.BusBooking.DepartureTime.Date,
                            DurationMinutes = (int)(booking.BusBooking.ArrivalTime - booking.BusBooking.DepartureTime).TotalMinutes,
                            BoardingPoint = booking.BusBooking.BoardingPoint,
                            ArrivalPoint = booking.BusBooking.ToCity,

                            // Fare breakdown
                            Price = booking.TotalPriceInr,
                            BaseFare = booking.BaseFareInr,
                            ConvenienceFee = booking.ConvenienceFeeInr,
                            Currency = "INR",

                            NetFare = booking.NetFareInr,
                            GstPercent = booking.GstPercent,
                            GstAmount = booking.GstAmountInr,

                            AppliedPromotionCode = booking.AppliedPromotionCode,
                            AppliedPromotionType = booking.AppliedPromotionType,
                            DiscountSource = booking.DiscountSource,
                            DiscountAmount = booking.DiscountAmountInr > 0 ? booking.DiscountAmountInr : null,

                            // Legacy fallback
                            SeatNumber = seatNumbers,
                            AutoDiscountAmount = booking.AutoDiscountAmountInr,
                            CouponDiscountAmount = booking.CouponDiscountAmountInr,

                            // Per-passenger details
                            Passengers = newlyCancelledPassengers.Select(p => new BusPassengerSeatDto
                            {
                                FullName = p.FullName,
                                Gender = p.Gender,
                                SeatNumber = p.SeatNumber ?? string.Empty
                            }).ToList()
                        },
                        currentRefundAmount
                    );
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Cancellation email failed for {BookingReference}", booking.BookingReference);
                }
            }

            // ---------------- WHATSAPP ----------------
            var message = $@"
Booking Cancelled ❌

Ref: {booking.BookingReference}
Route: {booking.BusBooking.FromCity} → {booking.BusBooking.ToCity}
Seats: {seatNumbers}
Refund: ₹{currentRefundAmount}
";

            var (sent, msg) = await _whatsAppService.SendTextAsync(
                booking.PassengerPhone,
                message
            );

            if (!sent)
                logger.LogWarning("WhatsApp cancellation failed: {Message}", msg);
        }

        private async Task TrySendBusBookingNotificationsAsync(
     BusReservation reservation,
     BusBooking bus,
     IReadOnlyList<BusReservationPassenger> passengers)
        {
            var seatNumbers = string.Join(", ",
                passengers.Select(x => x.SeatNumber).Where(x => !string.IsNullOrWhiteSpace(x)));

            if (string.IsNullOrWhiteSpace(seatNumbers))
                seatNumbers = "N/A";

            // ---------------- EMAIL ----------------
            if (!string.IsNullOrWhiteSpace(reservation.PassengerEmail))
            {
                try
                {
                    // Fetch coupon details for PDF
                    //BusCoupon? couponDetails = null;
                    //if (!string.IsNullOrWhiteSpace(reservation.CouponCode))
                    //{
                    //    couponDetails = await dbContext.BusCoupons
                    //        .AsNoTracking()
                    //        .FirstOrDefaultAsync(x => x.CouponCode == reservation.CouponCode);
                    //}

                    await _ticketEmailService.SendBusTicketAsync(new SendBusTicketEmailRequest
                    {
                        ToEmail = reservation.PassengerEmail,
                        PassengerName = reservation.PassengerName,
                        BookingReference = reservation.BookingReference,
                        Pnr = reservation.Pnr,
                        OperatorName = bus.OperatorName,
                        BusType = bus.BusType,
                        Origin = bus.FromCity,
                        Destination = bus.ToCity,
                        DepartureTime = bus.DepartureTime,
                        ArrivalTime = bus.ArrivalTime,
                        IsOvernightArrival = bus.ArrivalTime.Date > bus.DepartureTime.Date,
                        DurationMinutes = (int)(bus.ArrivalTime - bus.DepartureTime).TotalMinutes,
                        BoardingPoint = bus.BoardingPoint,
                        ArrivalPoint = bus.ToCity,

                        // Fare breakdown
                        Price = reservation.TotalPriceInr,
                        BaseFare = reservation.BaseFareInr,
                        ConvenienceFee = reservation.ConvenienceFeeInr,
                        Currency = "INR",
                        NetFare = reservation.NetFareInr,

                        AppliedPromotionCode =
    reservation.AppliedPromotionCode,

                        AppliedPromotionType =
    reservation.AppliedPromotionType,

                        DiscountSource =
    reservation.DiscountSource,

                        DiscountAmount =
    reservation.DiscountAmountInr > 0
        ? reservation.DiscountAmountInr
        : null,

                        // Legacy fallback
                        SeatNumber = seatNumbers,
                        GstPercent = reservation.GstPercent,
                        GstAmount = reservation.GstAmountInr,

                        AutoDiscountAmount =
    reservation.AutoDiscountAmountInr,

                        CouponDiscountAmount =
    reservation.CouponDiscountAmountInr,

                        // Per-passenger details
                        Passengers = passengers.Select(p => new BusPassengerSeatDto
                        {
                            FullName = p.FullName,
                            Gender = p.Gender,
                            SeatNumber = p.SeatNumber ?? string.Empty
                        }).ToList()
                    });
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Booking email failed for {BookingReference}", reservation.BookingReference);
                }
            }

            // ---------------- WHATSAPP ----------------
            var message = $@"
                Booking Confirmed ✅

                Ref: {reservation.BookingReference}
                Route: {bus.FromCity} → {bus.ToCity}
                Seats: {seatNumbers}
                Departure: {bus.DepartureTime}
                ";

            var (sent, msg) = await _whatsAppService.SendTextAsync(
                reservation.PassengerPhone,
                message
            );

            if (!sent)
                logger.LogWarning("WhatsApp booking failed: {Message}", msg);
        }
       
    }

}
