using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
        private readonly IMemoryCache _cache;

        public HotelsController(
            IHotelService hotelService,
            AppDbContext dbContext,
            ICurrentUserService currentUserService,
            ILogger<HotelsController> logger,
            ITicketEmailService ticketEmailService,
            IMemoryCache cache)
        {
            _hotelService = hotelService;
            _dbContext = dbContext;
            _currentUserService = currentUserService;
            _logger = logger;
            _ticketEmailService = ticketEmailService;
            _cache = cache;
        }

        // =====================================
        // SEARCH HOTELS
        // =====================================


        [HttpPost("SearchHotels")]
        [AllowAnonymous]
        public async Task<IActionResult> SearchHotelsMultiLevelPost([FromBody] SrdvHotelSearchRequestDto request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Request body is required." });
            }

            if (string.IsNullOrWhiteSpace(request.CityId))
            {
                return BadRequest(new { message = "CityId is required." });
            }

            try
            {
                var response = await _hotelService.SearchHotelsMultiLevelAsync(request);

                // Fire-and-forget logging to the database
                var userId = _currentUserService.GetUserOrGuestId();
                var cityId = request.CityId.Trim().ToUpperInvariant();
                var checkInStr = request.CheckInDate;
                var checkOutStr = request.CheckOutDate;
                var roomGuests = request.RoomGuests;
                var noOfRoomsStr = request.NoOfRooms;
                var scopeFactory = HttpContext.RequestServices.GetRequiredService<Microsoft.Extensions.DependencyInjection.IServiceScopeFactory>();

                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = scopeFactory.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                        DateTime parsedCheckIn = DateTime.TryParse(checkInStr, out var cin) ? cin : DateTime.UtcNow.AddDays(10);
                        DateTime parsedCheckOut = DateTime.TryParse(checkOutStr, out var cout) ? cout : DateTime.UtcNow.AddDays(13);
                        int adults = roomGuests?.Sum(rg => int.TryParse(rg.NoOfAdults, out var a) ? a : 1) ?? 1;
                        int rooms = int.TryParse(noOfRoomsStr, out var r) ? r : 1;

                        var searchLog = new HotelSearchLog
                        {
                            SearchQuery = cityId,
                            CheckInDate = DateOnly.FromDateTime(parsedCheckIn),
                            CheckOutDate = DateOnly.FromDateTime(parsedCheckOut),
                            Adults = adults,
                            Rooms = rooms,
                            UserId = userId,
                            SearchedAtUtc = DateTime.UtcNow
                        };
                        dbContext.HotelSearchLogs.Add(searchLog);
                        await dbContext.SaveChangesAsync();
                    }
                    catch (Exception logEx)
                    {
                        // Background task exceptions should ideally be logged via a resolved logger from the scope
                    }
                });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during hotel search for CityId {CityId}", request.CityId);
                return StatusCode(500, new { message = $"SRDV Provider failure: {ex.Message}" });
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
        // GET HOTEL INFO
        // =====================================
        [HttpGet("GetHotelInfo")]
        [HttpGet("info")]
        [AllowAnonymous]
        public async Task<IActionResult> GetHotelInfo([FromQuery] string traceId, [FromQuery] string resultIndex, [FromQuery] string hotelCode, [FromQuery] string srdvType = "", [FromQuery] string srdvIndex = "", [FromQuery] string endUserIp = "", [FromQuery] string clientId = "", [FromQuery] string userName = "", [FromQuery] string password = "")
        {
            _logger.LogInformation("Fetch hotel info GET request received: HotelCode: {HotelCode}", hotelCode);

            if (string.IsNullOrWhiteSpace(traceId) || string.IsNullOrWhiteSpace(resultIndex) || string.IsNullOrWhiteSpace(hotelCode))
            {
                return BadRequest(new { message = "traceId, resultIndex, and hotelCode are required." });
            }

            try
            {
                var req = new HotelInfoRequestDto
                {
                    TraceId = traceId.Trim(),
                    ResultIndex = resultIndex.Trim(),
                    HotelCode = hotelCode.Trim(),
                    SrdvType = srdvType?.Trim() ?? "",
                    SrdvIndex = srdvIndex?.Trim() ?? "",
                    EndUserIp = endUserIp?.Trim() ?? "",
                    ClientId = clientId?.Trim() ?? "",
                    UserName = userName?.Trim() ?? "",
                    Password = password?.Trim() ?? ""
                };
                var details = await _hotelService.GetHotelInfoAsync(req);
                return Ok(details);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during hotel info retrieval for HotelCode {HotelCode}", hotelCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("GetHotelInfo")]
        [AllowAnonymous]
        public async Task<IActionResult> PostHotelInfo([FromBody] HotelInfoRequestDto request)
        {
            _logger.LogInformation("Fetch hotel info POST request received: HotelCode: {HotelCode}", request.HotelCode);

            if (string.IsNullOrWhiteSpace(request.TraceId) || string.IsNullOrWhiteSpace(request.ResultIndex) || string.IsNullOrWhiteSpace(request.HotelCode))
            {
                return BadRequest(new { message = "traceId, resultIndex, and hotelCode are required in the request body." });
            }

            try
            {
                var details = await _hotelService.GetHotelInfoAsync(request);
                return Ok(details);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during hotel info retrieval for HotelCode {HotelCode}", request.HotelCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpGet("rooms")]
        [AllowAnonymous]
        public async Task<IActionResult> GetHotelRooms([FromQuery] string traceId, [FromQuery] string resultIndex, [FromQuery] string hotelCode)
        {
            _logger.LogInformation("Fetch hotel rooms GET request received: HotelCode: {HotelCode}", hotelCode);

            if (string.IsNullOrWhiteSpace(traceId) || string.IsNullOrWhiteSpace(resultIndex) || string.IsNullOrWhiteSpace(hotelCode))
            {
                return BadRequest(new { message = "traceId, resultIndex, and hotelCode are required." });
            }

            try
            {
                var rooms = await _hotelService.GetHotelRoomAsync(traceId.Trim(), resultIndex.Trim(), hotelCode.Trim());
                return Ok(rooms);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during hotel rooms retrieval for HotelCode {HotelCode}", hotelCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("GetHotelRoom")]
        [AllowAnonymous]
        public async Task<IActionResult> PostHotelRooms([FromBody] HotelRoomRequestDto request)
        {
            _logger.LogInformation("Fetch hotel rooms POST request received: HotelCode: {HotelCode}", request.HotelCode);

            if (string.IsNullOrWhiteSpace(request.TraceId) || string.IsNullOrWhiteSpace(request.ResultIndex) || string.IsNullOrWhiteSpace(request.HotelCode))
            {
                return BadRequest(new { message = "traceId, resultIndex, and hotelCode are required in the request body." });
            }

            try
            {
                var rooms = await _hotelService.GetHotelRoomAsync(request);
                return Ok(rooms);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during hotel rooms retrieval for HotelCode {HotelCode}", request.HotelCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // =====================================
        // BLOCK ROOM
        // =====================================
        [HttpPost("BlockRoom")]
        [AllowAnonymous]
        public async Task<IActionResult> PostBlockRoom([FromBody] BlockRoomRequestDto request)
        {
            _logger.LogInformation("Block room POST request received: HotelCode: {HotelCode}", request.HotelCode);

            if (string.IsNullOrWhiteSpace(request.TraceId) || string.IsNullOrWhiteSpace(request.ResultIndex) || string.IsNullOrWhiteSpace(request.HotelCode))
            {
                return BadRequest(new { message = "traceId, resultIndex, and hotelCode are required in the request body." });
            }

            try
            {
                var blockRes = await _hotelService.BlockRoomAsync(request);
                return Ok(blockRes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during block room for HotelCode {HotelCode}", request.HotelCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpGet("blockRoom")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBlockRoom([FromQuery] string traceId, [FromQuery] string resultIndex, [FromQuery] string hotelCode, [FromQuery] string hotelName = "", [FromQuery] int noOfRooms = 1, [FromQuery] decimal price = 0m)
        {
            _logger.LogInformation("Block room GET request received: HotelCode: {HotelCode}", hotelCode);

            if (string.IsNullOrWhiteSpace(traceId) || string.IsNullOrWhiteSpace(resultIndex) || string.IsNullOrWhiteSpace(hotelCode))
            {
                return BadRequest(new { message = "traceId, resultIndex, and hotelCode are required." });
            }

            try
            {
                var req = new BlockRoomRequestDto
                {
                    TraceId = traceId.Trim(),
                    ResultIndex = resultIndex.Trim(),
                    HotelCode = hotelCode.Trim(),
                    HotelName = hotelName.Trim(),
                    NoOfRooms = noOfRooms,
                    Price = price
                };
                var blockRes = await _hotelService.BlockRoomAsync(req);
                return Ok(blockRes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during block room for HotelCode {HotelCode}", hotelCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpGet("bookRoom")]
        [Authorize]
        public async Task<IActionResult> GetBookRoom([FromQuery] string traceId, [FromQuery] string resultIndex, [FromQuery] string hotelCode, [FromQuery] string hotelName = "", [FromQuery] string guestName = "John Doe", [FromQuery] string guestEmail = "guest@example.com", [FromQuery] string guestPhone = "9876543210", [FromQuery] int noOfRooms = 1, [FromQuery] decimal price = 0m)
        {
            _logger.LogInformation("Book room GET request received: HotelCode: {HotelCode}, Guest: {GuestName}", hotelCode, guestName);

            if (string.IsNullOrWhiteSpace(traceId) || string.IsNullOrWhiteSpace(resultIndex) || string.IsNullOrWhiteSpace(hotelCode))
            {
                return BadRequest(new { message = "traceId, resultIndex, and hotelCode are required." });
            }

            try
            {
                var req = new HotelBookRequestDto
                {
                    TraceId = traceId.Trim(),
                    ResultIndex = resultIndex.Trim(),
                    HotelCode = hotelCode.Trim(),
                    HotelName = hotelName.Trim(),
                    GuestName = guestName.Trim(),
                    GuestEmail = guestEmail.Trim(),
                    GuestPhone = guestPhone.Trim(),
                    NoOfRooms = noOfRooms,
                    Price = price
                };
                var bookRes = await _hotelService.BookRoomAsync(req);

                if (bookRes?.BookResult != null && bookRes.BookResult.Error.ErrorCode == 0)
                {
                    try
                    {
                        var bRes = bookRes.BookResult;
                        var bookingRef = !string.IsNullOrWhiteSpace(bRes.BookingRefNo) ? bRes.BookingRefNo : $"HT-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 1000)}";

                        var reservation = new HotelReservation
                        {
                            BookingReference = bookingRef,
                            ProviderBookingId = bRes.BookingId > 0 ? bRes.BookingId.ToString() : null,
                            SrdvBookingId = bRes.BookingId > 0 ? bRes.BookingId.ToString() : null,
                            ConfirmationNo = bRes.ConfirmationNo,
                            InvoiceNumber = bRes.InvoiceNumber,
                            UserId = _currentUserService.GetUserOrGuestId(),
                            HotelId = hotelCode.Trim(),
                            HotelName = !string.IsNullOrWhiteSpace(hotelName) ? hotelName.Trim() : hotelCode.Trim(),
                            OfferId = resultIndex.Trim(),
                            TraceId = traceId.Trim(),
                            GuestName = string.IsNullOrWhiteSpace(guestName) ? "Guest User" : guestName.Trim(),
                            GuestEmail = string.IsNullOrWhiteSpace(guestEmail) ? "guest@example.com" : guestEmail.Trim(),
                            GuestPhone = string.IsNullOrWhiteSpace(guestPhone) ? "9876543210" : guestPhone.Trim(),
                            GuestNationality = "IN",
                            CheckInDate = DateTime.UtcNow.AddDays(1),
                            CheckOutDate = DateTime.UtcNow.AddDays(5),
                            Adults = 1,
                            Rooms = noOfRooms > 0 ? noOfRooms : 1,
                            Price = price,
                            SrdvOfferedPrice = price,
                            TotalPrice = price,
                            Status = !string.IsNullOrWhiteSpace(bRes.Status) ? bRes.Status : "Confirmed",
                            CreatedAt = DateTime.UtcNow
                        };

                        _dbContext.HotelReservations.Add(reservation);
                        await _dbContext.SaveChangesAsync();
                    }
                    catch (Exception dbEx)
                    {
                        _logger.LogWarning(dbEx, "Failed to persist HotelReservation record to database during GetBookRoom.");
                    }
                }

                return Ok(bookRes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during book room for HotelCode {HotelCode}", hotelCode);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // =====================================
        // SEND CHANGE REQUEST / HOTEL CANCEL (EXACT MULTI-LEVEL PARITY & MOCK FOR SWAGGER/B2B)
        // =====================================
        [HttpPost("SendChangeRequest")]
        [HttpPost("CancelRoom")]
        [AllowAnonymous]
        public async Task<IActionResult> PostSendChangeRequest([FromBody] HotelCancelRequestDto request)
        {
            _logger.LogInformation("Hotel cancel POST request received: BookingId: {BookingId}, RequestType: {RequestType}", request.BookingId, request.RequestType);

            if (request.BookingId <= 0)
            {
                return BadRequest(new { message = "bookingId is required in the request body." });
            }

            try
            {
                var cancelRes = await _hotelService.CancelRoomAsync(request);

                // If cancellation was successful on provider side, update DB status and send email
                if (cancelRes != null && cancelRes.Error.ErrorCode == 0)
                {
                    var bookingIdStr = request.BookingId.ToString();
                    var reservation = await _dbContext.HotelReservations.FirstOrDefaultAsync(r => 
                        r.ProviderBookingId == bookingIdStr || 
                        r.SrdvBookingId == bookingIdStr ||
                        r.Id == request.BookingId);

                    if (reservation != null)
                    {
                        reservation.Status = "Cancelled";
                        reservation.CancelledAt = DateTime.UtcNow;
                        reservation.UpdatedAt = DateTime.UtcNow;
                        if (!string.IsNullOrWhiteSpace(request.Remarks))
                        {
                            reservation.CancellationReason = request.Remarks;
                        }

                        await _dbContext.SaveChangesAsync();
                        _logger.LogInformation("Updated HotelReservation {BookingReference} (ID: {Id}) status to Cancelled in database.", reservation.BookingReference, reservation.Id);

                        try
                        {
                            await _ticketEmailService.SendHotelCancellationAsync(reservation);
                        }
                        catch (Exception mailEx)
                        {
                            _logger.LogError(mailEx, "Failed to send hotel cancellation email for booking {BookingReference}", reservation.BookingReference);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("HotelReservation record not found in database for BookingId {BookingId}", request.BookingId);
                    }
                }
                else if (cancelRes != null && cancelRes.Error != null && cancelRes.Error.ErrorCode != 0)
                {
                    _logger.LogWarning("Hotel cancel provider failure for BookingId {BookingId}, ErrorCode: {ErrorCode}", request.BookingId, cancelRes.Error.ErrorCode);
                    return StatusCode(502, cancelRes);
                }

                return Ok(cancelRes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during hotel cancel for BookingId {BookingId}", request.BookingId);
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // =====================================
        // BOOK HOTEL
        // =====================================
        [HttpPost("BookRoom")]
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
                System.IO.File.WriteAllText("book_error.txt", "Required fields missing.");
                return BadRequest(new { message = "OfferId, GuestName, GuestEmail, and GuestPhone are required." });
            }

            // 1. Revalidate and retrieve offer details
            HotelOfferDto? offerDetails;
            try
            {
                _logger.LogDebug("Getting offer details for OfferId: '{OfferId}'", request.OfferId.Trim());
                offerDetails = await _hotelService.GetOfferDetailsAsync(request.OfferId.Trim());
                if (offerDetails == null)
                {
                    _logger.LogDebug("GetOfferDetailsAsync returned NULL for OfferId: '{OfferId}'", request.OfferId.Trim());
                }
                else
                {
                    _logger.LogDebug("GetOfferDetailsAsync returned SUCCESS for OfferId: '{OfferId}'", request.OfferId.Trim());
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during offer revalidation before booking OfferId: {OfferId}", request.OfferId);
                return StatusCode(500, new { message = $"Unable to revalidate offer with provider: {ex.Message}" });
            }

            // If not in cache, return NotFound directly (no fallback offer construction)
            if (offerDetails == null)
            {
                return NotFound(new
                {
                    message = "Selected offer is no longer available or expired.",
                    hint = "Please search for hotels again (offers are cached for 30 minutes)."
                });
            }

            var strategy = _dbContext.Database.CreateExecutionStrategy();
            try
            {
                return await strategy.ExecuteAsync<IActionResult>(async () =>
                {
                    await using var transaction = await _dbContext.Database.BeginTransactionAsync();

                    // SRDV Supplier Pricing: Direct supplier rate without platform markup, convenience fee, or custom GST
                    decimal srdvOfferedPrice = offerDetails.Price;
                    decimal basePrice = srdvOfferedPrice;
                    decimal netPrice = srdvOfferedPrice;
                    
                    decimal markupAmount = 0m;
                    using var markupScope = HttpContext.RequestServices.CreateScope();
                    var markupService = markupScope.ServiceProvider.GetService<IHotelMarkupService>();
                    if (markupService != null && srdvOfferedPrice > 0)
                    {
                        markupAmount = await markupService.CalculateMarkupAsync(srdvOfferedPrice, offerDetails.CityCode, offerDetails.HotelId, "B2C");
                    }
                    
                    decimal convenienceFee = 0m;
                    decimal gstPercent = 0m;
                    decimal gstAmount = 0m;
                    decimal totalPrice = srdvOfferedPrice + markupAmount;

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

                    // Round final total price
                    totalPrice = decimal.Round(totalPrice, 2, MidpointRounding.AwayFromZero);

                    // Generate local booking reference
                    var bookingRef = $"HT-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(100, 1000)}";

                    // Retrieve cached BlockRoom details if present to copy SRDV GST and Cancellation Policies
                    _cache.TryGetValue($"block_{offerDetails.ResultIndex}", out PickNBookBlockRoomResponseDto? cachedBlockRes);
                    var blockResult = cachedBlockRes?.BlockRoomResult;
                    var firstRoom = blockResult?.HotelRoomsDetails?.FirstOrDefault();

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
                        GuestNationality = "IN",
                        RoomTypeName = offerDetails.RoomCategory,
                        CheckInDate = DateTime.TryParse(offerDetails.CheckInDate, out var checkIn) ? checkIn : DateTime.MinValue,
                        CheckOutDate = DateTime.TryParse(offerDetails.CheckOutDate, out var checkOut) ? checkOut : DateTime.MinValue,
                        Adults = offerDetails.Beds > 0 ? offerDetails.Beds : 1,
                        Rooms = offerDetails.RoomQuantity,
                        
                        SrdvOfferedPrice = srdvOfferedPrice,
                        Price = srdvOfferedPrice,
                        NetPrice = netPrice,
                        MarkupAmount = markupAmount,
                        BasePrice = basePrice,
                        ConvenienceFee = convenienceFee,
                        GstPercent = gstPercent,
                        GstAmount = gstAmount,
                        TotalPrice = totalPrice,

                        // SRDV Supplier GST Breakdown
                        SrdvGstAmount = firstRoom?.Price?.TotalGSTAmount ?? 0m,
                        SrdvCgstAmount = firstRoom?.Price?.GST?.CGSTAmount ?? 0m,
                        SrdvSgstAmount = firstRoom?.Price?.GST?.SGSTAmount ?? 0m,
                        SrdvIgstAmount = firstRoom?.Price?.GST?.IGSTAmount ?? 0m,

                        // SRDV Supplier Specs & Cancellation Policy
                        RatePlanCode = firstRoom?.RatePlanCode,
                        RoomTypeCode = firstRoom?.RoomTypeCode,
                        LastCancellationDate = DateTime.TryParse(firstRoom?.LastCancellationDate, out var lcd) ? lcd : null,
                        CancellationPolicyJson = firstRoom?.CancellationPolicies != null ? System.Text.Json.JsonSerializer.Serialize(firstRoom.CancellationPolicies) : null,
                        
                        CouponCode = request.CouponCode?.Trim().ToUpperInvariant(),
                        CouponDiscount = couponDiscount,
                        
                        Currency = offerDetails.Currency,
                        Status = "Booked",
                        CreatedAt = DateTime.UtcNow
                    };

                    _dbContext.HotelReservations.Add(reservation);
                    await _dbContext.SaveChangesAsync();

                    // 2. Call SRDV Booking API
                    HotelBookingResponseDto srdvBooking;
                    try
                    {
                        srdvBooking = await _hotelService.BookHotelAsync(
                            offerDetails.OfferId,
                            reservation.GuestName,
                            reservation.GuestEmail,
                            reservation.GuestPhone,
                            userId!);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "SRDV booking provider call failed for OfferId {OfferId}", offerDetails.OfferId);
                        // Rollback local db entry
                        await transaction.RollbackAsync();
                        System.IO.File.WriteAllText("book_error.txt", $"Exception: {ex.Message}");
                        return BadRequest(new { message = $"Booking failed at provider: {ex.Message}" });
                    }

                    reservation.ProviderBookingId = srdvBooking.ProviderBookingId;
                    reservation.SrdvBookingId = srdvBooking.ProviderBookingId;
                    reservation.ConfirmationNo = srdvBooking.ConfirmationNo;
                    reservation.InvoiceNumber = srdvBooking.InvoiceNumber;
                    reservation.SrdvBookingResponseJson = System.Text.Json.JsonSerializer.Serialize(srdvBooking);
                    reservation.UpdatedAt = DateTime.UtcNow;

                    if (!string.IsNullOrEmpty(srdvBooking.Error))
                    {
                        reservation.Status = "Failed";
                        await _dbContext.SaveChangesAsync();
                        await transaction.CommitAsync();
                        System.IO.File.WriteAllText("book_error.txt", $"Provider Error: {srdvBooking.Error}");
                        return BadRequest(new { message = $"Booking failed at provider: {srdvBooking.Error}" });
                    }
                    
                    reservation.TraceId = offerDetails.TraceId;
                    reservation.Status = srdvBooking.Status;
                    reservation.UpdatedAt = DateTime.UtcNow;

                    if (srdvBooking.Status == "VerifyPrice")
                    {
                        await _dbContext.SaveChangesAsync();
                        await transaction.CommitAsync();
                        return Ok(new
                        {
                            message = "Price or Cancellation Policy has changed at provider. Please verify the new price before confirming.",
                            requiresPriceVerification = true,
                            bookingDetails = srdvBooking
                        });
                    }

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
                        System.IO.File.WriteAllText("email_error.txt", $"Email Exception: {mailEx.ToString()}");
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
                            providerCancelled = await _hotelService.CancelBookingAsync(booking.ProviderBookingId, booking.TraceId);
                            if (!providerCancelled)
                            {
                                _logger.LogWarning("Cancellation at provider was unsuccessful for BookingId {BookingId}. Aborting local cancellation.", parsedBookingId);
                                return StatusCode(502, new { message = "Supplier failed to cancel the booking. Please contact support or try again later." });
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

                    var (cancellationCharges, refundAmount) = SrdvHotelService.EvaluateCancellationFee(booking);

                    booking.CancellationCharges = cancellationCharges;
                    booking.RefundAmount = refundAmount;
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
    }
}

