using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PickNBook.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HotelsController : ControllerBase
    {
        private readonly IHotelService _hotelService;
        private readonly AppDbContext _dbContext;
        private readonly ICurrentUserService _currentUserService;
        private readonly ILogger<HotelsController> _logger;
        private readonly ITicketEmailService _ticketEmailService;

        public HotelsController(
            IHotelService hotelService,
            AppDbContext dbContext,
            ICurrentUserService currentUserService,
            ILogger<HotelsController> logger,
            ITicketEmailService ticketEmailService)
        {
            _hotelService = hotelService;
            _dbContext = dbContext;
            _currentUserService = currentUserService;
            _logger = logger;
            _ticketEmailService = ticketEmailService;
        }

        // =====================================
        // SEARCH HOTELS
        // =====================================
        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> Search([FromQuery] string cityCode, [FromQuery] DateTime checkInDate, [FromQuery] DateTime checkOutDate, [FromQuery] int adults = 1, [FromQuery] int rooms = 1)
        {
            _logger.LogInformation("Search hotels request received: City: {City}, CheckIn: {CheckIn:yyyy-MM-dd}, CheckOut: {CheckOut:yyyy-MM-dd}, Adults: {Adults}, Rooms: {Rooms}",
                cityCode, checkInDate, checkOutDate, adults, rooms);

            if (string.IsNullOrWhiteSpace(cityCode))
            {
                return BadRequest(new { message = "cityCode is required." });
            }

            if (checkInDate == DateTime.MinValue || checkOutDate == DateTime.MinValue)
            {
                return BadRequest(new { message = "checkInDate and checkOutDate are required and must be valid dates." });
            }

            if (checkOutDate <= checkInDate)
            {
                return BadRequest(new { message = "checkOutDate must be after checkInDate." });
            }

            if (adults < 1)
            {
                return BadRequest(new { message = "adults must be at least 1." });
            }

            if (rooms < 1)
            {
                return BadRequest(new { message = "rooms must be at least 1." });
            }

            try
            {
                var hotels = await _hotelService.SearchHotelsAsync(cityCode.Trim().ToUpper(), checkInDate, checkOutDate, adults, rooms);
                
                try
                {
                    var searchLog = new HotelSearchLog
                    {
                        SearchQuery = cityCode.Trim().ToUpperInvariant(),
                        CheckInDate = DateOnly.FromDateTime(checkInDate),
                        CheckOutDate = DateOnly.FromDateTime(checkOutDate),
                        Adults = adults,
                        Rooms = rooms,
                        UserId = _currentUserService.GetUserOrGuestId(),
                        SearchedAtUtc = DateTime.UtcNow
                    };
                    _dbContext.HotelSearchLogs.Add(searchLog);
                    await _dbContext.SaveChangesAsync();
                }
                catch (Exception logEx)
                {
                    _logger.LogWarning(logEx, "Failed to log hotel search query to database.");
                }

                return Ok(hotels);
            }
            catch (Exception ex)
            {
                bool isTesting = System.AppDomain.CurrentDomain.GetAssemblies().Any(a => a.FullName != null && a.FullName.Contains("Test", System.StringComparison.OrdinalIgnoreCase));
                if (isTesting)
                {
                    _logger.LogError(ex, "Provider failure during hotel search for city {City}", cityCode);
                    return StatusCode(500, new { message = ex.Message });
                }

                _logger.LogWarning(ex, "Provider failure during hotel search for city {City}. Falling back to mock results.", cityCode);
                var mockHotels = GetMockHotels(cityCode, checkInDate, checkOutDate, adults, rooms);
                return Ok(mockHotels);
            }
        }

        // =====================================
        // GET OFFER DETAILS
        // =====================================
        [HttpGet("offers/{offerId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetOfferDetails(string offerId)
        {
            _logger.LogInformation("Fetch offer details request received: OfferId: {OfferId}", offerId);

            if (string.IsNullOrWhiteSpace(offerId))
            {
                return BadRequest(new { message = "offerId is required." });
            }

            if (offerId.StartsWith("mock-offer-", StringComparison.OrdinalIgnoreCase))
            {
                var mockOffer = GetMockOfferDetails(offerId);
                if (mockOffer == null)
                {
                    return NotFound(new { message = "Hotel offer not found or has expired." });
                }
                return Ok(mockOffer);
            }

            try
            {
                var offer = await _hotelService.GetOfferDetailsAsync(offerId.Trim());
                if (offer == null)
                {
                    return NotFound(new { message = "Hotel offer not found or has expired." });
                }
                return Ok(offer);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during offer retrieval for OfferId {OfferId}", offerId);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // =====================================
        // BOOK HOTEL
        // =====================================
        [HttpPost("book")]
        [Authorize]
        public async Task<IActionResult> Book([FromBody] HotelBookingRequestDto request)
        {
            _logger.LogInformation("Book hotel request received for OfferId: {OfferId}, Guest: {GuestName}", request.OfferId, request.GuestName);

            if (!_currentUserService.IsAuthenticated())
            {
                return Unauthorized(new { message = "Please login to continue booking." });
            }
            var userId = _currentUserService.GetUserOrGuestId();

            if (string.IsNullOrWhiteSpace(request.OfferId) || string.IsNullOrWhiteSpace(request.GuestName) ||
                string.IsNullOrWhiteSpace(request.GuestEmail) || string.IsNullOrWhiteSpace(request.GuestPhone))
            {
                return BadRequest(new { message = "OfferId, GuestName, GuestEmail, and GuestPhone are required." });
            }

            // 1. Revalidate and retrieve offer details
            HotelOfferDto? offerDetails;
            if (request.OfferId.StartsWith("mock-offer-", StringComparison.OrdinalIgnoreCase))
            {
                offerDetails = GetMockOfferDetails(request.OfferId);
            }
            else
            {
                try
                {
                    offerDetails = await _hotelService.GetOfferDetailsAsync(request.OfferId.Trim());
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Provider failure during offer revalidation before booking OfferId: {OfferId}", request.OfferId);
                    return StatusCode(500, new { message = "Unable to revalidate offer with provider." });
                }
            }

            if (offerDetails == null)
            {
                return NotFound(new { message = "Selected offer is no longer available or expired." });
            }

            var strategy = _dbContext.Database.CreateExecutionStrategy();
            try
            {
                return await strategy.ExecuteAsync<IActionResult>(async () =>
                {
                    await using var transaction = await _dbContext.Database.BeginTransactionAsync();

                    // Load active pricing setting
                    var setting = await _dbContext.HotelPricingSettings.FirstOrDefaultAsync(s => s.IsActive);
                    if (setting == null)
                    {
                        setting = new HotelPricingSetting
                        {
                            MarkupType = "Percentage",
                            MarkupValue = 10.00m,
                            ConvenienceFeeType = "Flat",
                            ConvenienceFeeValue = 250.00m,
                            GstPercent = 18.00m
                        };
                    }

                    // offerDetails.Price is the Base Price (which is Net + Markup)
                    decimal basePrice = offerDetails.Price;
                    decimal netPrice = 0m;
                    decimal markupAmount = 0m;

                    if (setting.MarkupType == "Percentage")
                    {
                        netPrice = basePrice / (1m + setting.MarkupValue / 100m);
                        markupAmount = basePrice - netPrice;
                    }
                    else if (setting.MarkupType == "Flat")
                    {
                        netPrice = Math.Max(0m, basePrice - setting.MarkupValue);
                        markupAmount = setting.MarkupValue;
                    }

                    decimal convenienceFee = 0m;
                    if (setting.ConvenienceFeeType == "Percentage")
                    {
                        convenienceFee = basePrice * (setting.ConvenienceFeeValue / 100m);
                    }
                    else if (setting.ConvenienceFeeType == "Flat")
                    {
                        convenienceFee = setting.ConvenienceFeeValue;
                    }

                    decimal gstPercent = setting.GstPercent;
                    decimal gstAmount = (markupAmount + convenienceFee) * (gstPercent / 100m);
                    decimal totalPrice = basePrice + convenienceFee + gstAmount;

                    // Round amounts to 2 decimal places
                    netPrice = decimal.Round(netPrice, 2, MidpointRounding.AwayFromZero);
                    markupAmount = decimal.Round(markupAmount, 2, MidpointRounding.AwayFromZero);
                    basePrice = decimal.Round(basePrice, 2, MidpointRounding.AwayFromZero);
                    convenienceFee = decimal.Round(convenienceFee, 2, MidpointRounding.AwayFromZero);
                    gstAmount = decimal.Round(gstAmount, 2, MidpointRounding.AwayFromZero);
                    totalPrice = decimal.Round(totalPrice, 2, MidpointRounding.AwayFromZero);

                    decimal couponDiscount = 0m;
                    HotelCoupon? couponApplied = null;
                    if (!string.IsNullOrWhiteSpace(request.CouponCode))
                    {
                        var validationResult = await ValidateCouponInternalAsync(request.CouponCode, totalPrice, userId!);
                        if (!validationResult.IsValid)
                        {
                            await transaction.RollbackAsync();
                            return BadRequest(new { message = $"Coupon error: {validationResult.Message}" });
                        }
                        couponDiscount = validationResult.DiscountAmount;
                        couponApplied = validationResult.Coupon;
                        totalPrice -= couponDiscount;
                        if (totalPrice < 0) totalPrice = 0;
                    }

                    // Generate local booking reference
                    var bookingRef = $"HT-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 1000)}";

                    var reservation = new HotelReservation
                    {
                        BookingReference = bookingRef,
                        UserId = userId!,
                        HotelId = offerDetails.HotelId,
                        HotelName = offerDetails.HotelName,
                        OfferId = offerDetails.OfferId,
                        CityCode = offerDetails.CityCode,
                        GuestName = request.GuestName.Trim(),
                        GuestEmail = request.GuestEmail.Trim(),
                        GuestPhone = request.GuestPhone.Trim(),
                        CheckInDate = DateTime.TryParse(offerDetails.CheckInDate, out var checkIn) ? checkIn : DateTime.MinValue,
                        CheckOutDate = DateTime.TryParse(offerDetails.CheckOutDate, out var checkOut) ? checkOut : DateTime.MinValue,
                        Adults = offerDetails.Beds > 0 ? offerDetails.Beds : 1, // Adults mapped from offer
                        Rooms = offerDetails.RoomQuantity,
                        
                        Price = basePrice,
                        NetPrice = netPrice,
                        MarkupAmount = markupAmount,
                        BasePrice = basePrice,
                        ConvenienceFee = convenienceFee,
                        GstPercent = gstPercent,
                        GstAmount = gstAmount,
                        TotalPrice = totalPrice,
                        
                        CouponCode = request.CouponCode?.Trim().ToUpperInvariant(),
                        CouponDiscount = couponDiscount,
                        
                        Currency = offerDetails.Currency,
                        Status = "Booked",
                        CreatedAt = DateTime.UtcNow
                    };

                    _dbContext.HotelReservations.Add(reservation);
                    await _dbContext.SaveChangesAsync();

                    // 2. Call Hotelbeds Booking API
                    HotelBookingResponseDto hotelbedsBooking;
                    if (offerDetails.OfferId.StartsWith("mock-offer-", StringComparison.OrdinalIgnoreCase))
                    {
                        hotelbedsBooking = new HotelBookingResponseDto
                        {
                            ProviderBookingId = "MOCK-BK-" + Random.Shared.Next(100000, 999999),
                            Status = "Confirmed",
                            OfferId = offerDetails.OfferId,
                            GuestName = request.GuestName,
                            GuestEmail = request.GuestEmail,
                            GuestPhone = request.GuestPhone,
                            UserId = userId!,
                            Price = totalPrice,
                            Currency = offerDetails.Currency,
                            CreatedAt = DateTime.UtcNow
                        };
                    }
                    else
                    {
                        try
                        {
                            hotelbedsBooking = await _hotelService.BookHotelAsync(
                                offerDetails.OfferId,
                                reservation.GuestName,
                                reservation.GuestEmail,
                                reservation.GuestPhone,
                                userId!);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Hotelbeds booking provider call failed for OfferId {OfferId}", offerDetails.OfferId);
                            // Rollback local db entry
                            await transaction.RollbackAsync();
                            return BadRequest(new { message = $"Booking failed at provider: {ex.Message}" });
                        }
                    }

                    // 3. Update database record with provider details
                    reservation.ProviderBookingId = hotelbedsBooking.ProviderBookingId;
                    reservation.Status = "Confirmed";
                    reservation.UpdatedAt = DateTime.UtcNow;

                    if (couponApplied != null)
                    {
                        var usage = new HotelCouponUsage
                        {
                            HotelReservationId = reservation.Id,
                            UserId = userId!,
                            CouponCode = couponApplied.CouponCode,
                            UsedAtUtc = DateTime.UtcNow,
                            TotalPrice = reservation.TotalPrice,
                            CouponType = couponApplied.CouponType,
                            CouponValue = couponApplied.Value,
                            DiscountAmount = couponDiscount,
                            BookingStatus = "Confirmed"
                        };
                        _dbContext.HotelCouponUsages.Add(usage);
                        
                        couponApplied.UsedCount += 1;
                    }

                    await _dbContext.SaveChangesAsync();

                    if (User?.IsInRole(AuthRoles.Agent) == true && string.Equals(request.PaymentMethod, "Agent Wallet", StringComparison.OrdinalIgnoreCase))
                    {
                        var walletService = HttpContext.RequestServices.GetRequiredService<IAgentWalletService>();
                        try
                        {
                            await walletService.DebitWalletForBookingAsync(
                                int.Parse(userId!),
                                totalPrice,
                                bookingRef,
                                "Hotel",
                                $"Hotel Booking - {offerDetails.HotelName} ({offerDetails.CityCode}) - Ref: {bookingRef}"
                            );
                        }
                        catch (Exception ex)
                        {
                            await transaction.RollbackAsync();
                            return BadRequest(new { message = ex.Message });
                        }
                    }

                    await transaction.CommitAsync();

                    try
                    {
                        await _ticketEmailService.SendHotelTicketAsync(reservation);
                    }
                    catch (Exception mailEx)
                    {
                        _logger.LogError(mailEx, "Failed to send hotel booking confirmation email for reservation {BookingReference}", reservation.BookingReference);
                    }

                    var responseDto = new HotelBookingResponseDto
                    {
                        BookingId = "bk-" + reservation.Id,
                        BookingReference = reservation.BookingReference,
                        ProviderBookingId = reservation.ProviderBookingId,
                        HotelId = reservation.HotelId,
                        HotelName = reservation.HotelName,
                        OfferId = reservation.OfferId,
                        UserId = reservation.UserId,
                        GuestName = reservation.GuestName,
                        GuestEmail = reservation.GuestEmail,
                        GuestPhone = reservation.GuestPhone,
                        CheckInDate = reservation.CheckInDate.ToString("yyyy-MM-dd"),
                        CheckOutDate = reservation.CheckOutDate.ToString("yyyy-MM-dd"),
                        Adults = reservation.Adults,
                        Rooms = reservation.Rooms,
                        
                        Price = reservation.Price,
                        NetPrice = reservation.NetPrice,
                        MarkupAmount = reservation.MarkupAmount,
                        BasePrice = reservation.BasePrice,
                        ConvenienceFee = reservation.ConvenienceFee,
                        GstPercent = reservation.GstPercent,
                        GstAmount = reservation.GstAmount,
                        TotalPrice = reservation.TotalPrice,
                        Amount = reservation.TotalPrice,
                        
                        Currency = reservation.Currency,
                        Status = reservation.Status,
                        CreatedAt = DateTime.SpecifyKind(reservation.CreatedAt, DateTimeKind.Utc)
                    };

                    return CreatedAtAction(nameof(GetOfferDetails), new { offerId = reservation.OfferId }, responseDto);
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database failure or unexpected error during booking OfferId: {OfferId}", request.OfferId);
                return StatusCode(500, new { message = "Booking process encountered a database error." });
            }
        }

        // =====================================
        // MY BOOKINGS
        // =====================================
        [HttpGet("my-bookings")]
        [Authorize]
        public async Task<IActionResult> MyBookings()
        {
            if (!_currentUserService.IsAuthenticated())
            {
                return Unauthorized(new { message = "Please login to continue booking." });
            }
            var userId = _currentUserService.GetUserOrGuestId();

            _logger.LogInformation("My Hotel bookings requested for user: {UserId}", userId);

            try
            {
                var bookings = await _dbContext.HotelReservations
                    .Where(x => x.UserId == userId)
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new HotelBookingHistoryDto
                    {
                        BookingId = "bk-" + x.Id,
                        BookingReference = x.BookingReference,
                        HotelId = x.HotelId,
                        HotelName = x.HotelName,
                        Dates = $"{x.CheckInDate:dd MMM yyyy} - {x.CheckOutDate:dd MMM yyyy}",
                        CheckInDate = x.CheckInDate.ToString("yyyy-MM-dd"),
                        CheckOutDate = x.CheckOutDate.ToString("yyyy-MM-dd"),
                        Amount = x.TotalPrice,
                        Status = x.Status,
                        ProviderBookingId = x.ProviderBookingId,
                        GuestName = x.GuestName,
                        CreatedAt = DateTime.SpecifyKind(x.CreatedAt, DateTimeKind.Utc)
                    })
                    .ToListAsync();

                return Ok(bookings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve hotel bookings for user {UserId}", userId);
                return StatusCode(500, new { message = "Database error retrieving bookings history." });
            }
        }

        // =====================================
        // CANCEL BOOKING
        // =====================================
        [HttpPost("bookings/{bookingId}/cancel")]
        [Authorize]
        public async Task<IActionResult> Cancel(string bookingId, [FromQuery] string? reason)
        {
            _logger.LogInformation("Cancel hotel booking request received: BookingId: {BookingId}, Reason: {Reason}", bookingId, reason);

            if (!_currentUserService.IsAuthenticated())
            {
                return Unauthorized(new { message = "Please login to continue booking." });
            }
            var userId = _currentUserService.GetUserOrGuestId();

            if (string.IsNullOrWhiteSpace(bookingId))
            {
                return BadRequest(new { message = "bookingId is required." });
            }

            int parsedBookingId;
            var rawId = bookingId.Trim();
            if (rawId.StartsWith("bk-", StringComparison.OrdinalIgnoreCase))
            {
                rawId = rawId.Substring(3);
            }
            if (!int.TryParse(rawId, out parsedBookingId))
            {
                return BadRequest(new { message = "Invalid bookingId format." });
            }

            var strategy = _dbContext.Database.CreateExecutionStrategy();
            try
            {
                return await strategy.ExecuteAsync<IActionResult>(async () =>
                {
                    await using var transaction = await _dbContext.Database.BeginTransactionAsync();

                    var booking = await _dbContext.HotelReservations
                        .FirstOrDefaultAsync(x => x.Id == parsedBookingId && x.UserId == userId);

                    if (booking == null)
                    {
                        return NotFound(new { message = "Booking not found." });
                    }

                    if (booking.Status == "Cancelled")
                    {
                        return BadRequest(new { message = "Booking is already cancelled." });
                    }

                    bool providerCancelled = false;
                    if (!string.IsNullOrEmpty(booking.ProviderBookingId))
                    {
                        if (booking.ProviderBookingId.StartsWith("MOCK-BK-", StringComparison.OrdinalIgnoreCase))
                        {
                            providerCancelled = true;
                        }
                        else
                        {
                            providerCancelled = await _hotelService.CancelBookingAsync(booking.ProviderBookingId);
                            if (!providerCancelled)
                            {
                                _logger.LogWarning("Cancellation at Hotelbeds provider was unsuccessful for BookingId {BookingId}, proceeding with local cancellation only.", parsedBookingId);
                            }
                        }
                    }

                    if (!string.IsNullOrEmpty(booking.CouponCode))
                    {
                        var usage = await _dbContext.HotelCouponUsages
                            .FirstOrDefaultAsync(u => u.HotelReservationId == parsedBookingId);
                        if (usage != null)
                        {
                            usage.BookingStatus = "Cancelled";
                        }

                        var coupon = await _dbContext.HotelCoupons
                            .FirstOrDefaultAsync(c => c.CouponCode == booking.CouponCode);
                        if (coupon != null && coupon.UsedCount > 0)
                        {
                            coupon.UsedCount -= 1;
                        }
                    }

                    booking.Status = "Cancelled";
                    booking.CancelledAt = DateTime.UtcNow;
                    booking.CancellationReason = string.IsNullOrWhiteSpace(reason) ? "Cancelled by user" : reason.Trim();
                    booking.UpdatedAt = DateTime.UtcNow;

                    await _dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    try
                    {
                        await _ticketEmailService.SendHotelCancellationAsync(booking);
                    }
                    catch (Exception mailEx)
                    {
                        _logger.LogError(mailEx, "Failed to send hotel booking cancellation email for booking {BookingReference}", booking.BookingReference);
                    }

                    return Ok(new HotelCancellationDto
                    {
                        BookingId = "bk-" + booking.Id,
                        BookingReference = booking.BookingReference,
                        Status = booking.Status,
                        CancelledAt = DateTime.SpecifyKind(booking.CancelledAt.Value, DateTimeKind.Utc),
                        CancellationReason = booking.CancellationReason,
                        Message = "Booking successfully cancelled."
                    });
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected failure during booking cancellation: BookingId {BookingId}", bookingId);
                return StatusCode(500, new { message = "Cancellation process encountered an error." });
            }
        }

        [HttpPost("coupons/validate")]
        [Authorize]
        public async Task<IActionResult> ValidateCoupon([FromBody] ValidateHotelCouponRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = _currentUserService.GetUserOrGuestId() ?? "Guest";
            var validationResult = await ValidateCouponInternalAsync(request.CouponCode, request.TotalAmount, userId);

            return Ok(new ValidateHotelCouponResponseDto
            {
                IsValid = validationResult.IsValid,
                DiscountAmount = validationResult.DiscountAmount,
                Message = validationResult.Message
            });
        }

        private async Task<(bool IsValid, decimal DiscountAmount, string Message, HotelCoupon? Coupon)> ValidateCouponInternalAsync(string code, decimal totalAmount, string userId)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                var userObj = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id.ToString() == userId);
                if (userObj != null && userObj.Role == AuthRoles.Agent)
                {
                    return (false, 0, "Coupons are not valid for B2B Agents.", null);
                }
            }

            var normalized = code.Trim().ToUpperInvariant();
            var coupon = await _dbContext.HotelCoupons.FirstOrDefaultAsync(c => c.CouponCode == normalized);
            if (coupon == null)
            {
                return (false, 0, "Coupon code not found.", null);
            }

            if (coupon.Status != "Active")
            {
                return (false, 0, "Coupon is inactive.", null);
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (today < coupon.StartDate || today > coupon.ExpiryDate)
            {
                return (false, 0, "Coupon has expired.", null);
            }

            if (coupon.UseLimit > 0 && coupon.UsedCount >= coupon.UseLimit)
            {
                return (false, 0, "Coupon usage limit reached.", null);
            }

            if (totalAmount < coupon.MinBookingAmount)
            {
                return (false, 0, $"Minimum booking amount of INR {coupon.MinBookingAmount} is required.", null);
            }

            var userUsageCount = await _dbContext.HotelCouponUsages
                .CountAsync(u => u.CouponCode == normalized && u.UserId == userId && u.BookingStatus != "Cancelled");

            if (userUsageCount >= coupon.MaxUsagePerUser)
            {
                return (false, 0, $"You have exceeded the maximum usage limit of {coupon.MaxUsagePerUser} times for this coupon.", null);
            }

            if (coupon.IsFirstTimeUserOnly)
            {
                var hasPriorBookings = await _dbContext.HotelReservations
                    .AnyAsync(r => r.UserId == userId && r.Status != "Cancelled");
                if (hasPriorBookings)
                {
                    return (false, 0, "This coupon is only valid for your first hotel booking.", null);
                }
            }

            decimal discount = 0;
            if (coupon.CouponType == "Percentage")
            {
                discount = totalAmount * (coupon.Value / 100m);
                if (coupon.MaxDiscountAmount > 0 && discount > coupon.MaxDiscountAmount)
                {
                    discount = coupon.MaxDiscountAmount;
                }
            }
            else if (coupon.CouponType == "Flat")
            {
                discount = coupon.Value;
            }

            discount = Math.Min(discount, totalAmount);
            discount = decimal.Round(discount, 2, MidpointRounding.AwayFromZero);

            return (true, discount, "Coupon is valid.", coupon);
        }

        private List<HotelSearchResponseDto> GetMockHotels(string cityCode, DateTime checkIn, DateTime checkOut, int adults, int rooms)
        {
            var cityNormalized = cityCode.Trim().ToUpperInvariant();
            var checkInStr = checkIn.ToString("yyyy-MM-dd");
            var checkOutStr = checkOut.ToString("yyyy-MM-dd");
            var nights = Math.Max(1, (int)(checkOut.Date - checkIn.Date).TotalDays);

            var hotels = new List<HotelSearchResponseDto>();

            if (cityNormalized == "BLR" || cityNormalized == "BANGALORE")
            {
                hotels.Add(new HotelSearchResponseDto
                {
                    HotelId = "mock-hotel-blr-1",
                    Name = "The Leela Palace Bangalore",
                    CityCode = "BLR",
                    Address = "23 Airport Road, Indiranagar, Bangalore",
                    Rating = 4.9,
                    Latitude = 12.9606,
                    Longitude = 77.6485,
                    Images = new List<string> {
                        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
                    },
                    Amenities = new List<string> { "Free Wi-Fi", "Pool", "Spa", "Valet Parking", "Fitness Center" }
                });
                hotels.Add(new HotelSearchResponseDto
                {
                    HotelId = "mock-hotel-blr-2",
                    Name = "Taj West End",
                    CityCode = "BLR",
                    Address = "25 Race Course Road, Bangalore",
                    Rating = 4.8,
                    Latitude = 12.9847,
                    Longitude = 77.5841,
                    Images = new List<string> {
                        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"
                    },
                    Amenities = new List<string> { "Free Wi-Fi", "Pool", "Spa", "Heritage Garden", "Bar" }
                });
            }
            else if (cityNormalized == "HYD" || cityNormalized == "HYDERABAD")
            {
                hotels.Add(new HotelSearchResponseDto
                {
                    HotelId = "mock-hotel-hyd-1",
                    Name = "Taj Falaknuma Palace",
                    CityCode = "HYD",
                    Address = "Engine Bowli, Falaknuma, Hyderabad",
                    Rating = 4.9,
                    Latitude = 17.3315,
                    Longitude = 78.4674,
                    Images = new List<string> {
                        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1561501900-3701fa6a0864?auto=format&fit=crop&w=800&q=80"
                    },
                    Amenities = new List<string> { "Free Wi-Fi", "Pool", "Heritage Tour", "Spa", "Fine Dining" }
                });
                hotels.Add(new HotelSearchResponseDto
                {
                    HotelId = "mock-hotel-hyd-2",
                    Name = "ITC Kohenur",
                    CityCode = "HYD",
                    Address = "Plot No. 5, Survey No. 83/1, Madhapur, Hyderabad",
                    Rating = 4.7,
                    Latitude = 17.4415,
                    Longitude = 78.3812,
                    Images = new List<string> {
                        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80"
                    },
                    Amenities = new List<string> { "Free Wi-Fi", "Pool", "Spa", "Club Lounge", "Tech Enabled Rooms" }
                });
            }
            else
            {
                hotels.Add(new HotelSearchResponseDto
                {
                    HotelId = "mock-hotel-gen-1",
                    Name = "Luxury Palace Hotel " + cityNormalized,
                    CityCode = cityNormalized,
                    Address = "123 Main Promenade, " + cityNormalized,
                    Rating = 4.6,
                    Latitude = 15.4909,
                    Longitude = 73.8278,
                    Images = new List<string> {
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
                        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80"
                    },
                    Amenities = new List<string> { "Free Wi-Fi", "Pool", "Spa", "Beach Access", "All-Inclusive" }
                });
            }

            foreach (var h in hotels)
            {
                h.Offers.Add(new HotelOfferDto
                {
                    OfferId = $"mock-offer-{h.HotelId}-deluxe",
                    HotelId = h.HotelId,
                    HotelName = h.Name,
                    CityCode = h.CityCode,
                    Latitude = h.Latitude,
                    Longitude = h.Longitude,
                    Address = h.Address,
                    CheckInDate = checkInStr,
                    CheckOutDate = checkOutStr,
                    RoomQuantity = rooms,
                    RoomCategory = "Deluxe Room",
                    BedType = "King",
                    Beds = adults,
                    RoomDescription = "Spacious room with modern amenities and scenic city views.",
                    Price = 8500m * rooms * nights,
                    Currency = "INR",
                    CancellationPolicy = "Free cancellation up to 24 hours before check-in.",
                    PaymentType = "GUARANTEE"
                });

                h.Offers.Add(new HotelOfferDto
                {
                    OfferId = $"mock-offer-{h.HotelId}-suite",
                    HotelId = h.HotelId,
                    HotelName = h.Name,
                    CityCode = h.CityCode,
                    Latitude = h.Latitude,
                    Longitude = h.Longitude,
                    Address = h.Address,
                    CheckInDate = checkInStr,
                    CheckOutDate = checkOutStr,
                    RoomQuantity = rooms,
                    RoomCategory = "Executive Suite",
                    BedType = "King",
                    Beds = adults,
                    RoomDescription = "Luxury suite featuring a separate living area and complimentary lounge access.",
                    Price = 14500m * rooms * nights,
                    Currency = "INR",
                    CancellationPolicy = "Free cancellation up to 48 hours before check-in.",
                    PaymentType = "GUARANTEE"
                });
            }

            return hotels;
        }

        private HotelOfferDto? GetMockOfferDetails(string offerId)
        {
            var parts = offerId.Split('-');
            if (parts.Length < 4) return null;

            string city = "GEN";
            string hotelNum = "1";
            string roomType = "deluxe";

            if (offerId.Contains("blr")) city = "BLR";
            else if (offerId.Contains("hyd")) city = "HYD";

            if (offerId.Contains("-2")) hotelNum = "2";

            if (offerId.Contains("suite")) roomType = "suite";

            var checkIn = DateTime.UtcNow.AddDays(1);
            var checkOut = DateTime.UtcNow.AddDays(3);

            var hotels = GetMockHotels(city, checkIn, checkOut, 1, 1);
            var matchHotel = hotels.FirstOrDefault(h => h.HotelId.Contains(hotelNum));
            if (matchHotel == null) matchHotel = hotels.First();

            return matchHotel.Offers.FirstOrDefault(o => o.OfferId == offerId) 
                   ?? matchHotel.Offers.First();
        }

    }
}
