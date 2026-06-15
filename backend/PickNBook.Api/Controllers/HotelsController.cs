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
        private readonly IAmadeusHotelService _amadeusHotelService;
        private readonly AppDbContext _dbContext;
        private readonly ICurrentUserService _currentUserService;
        private readonly ILogger<HotelsController> _logger;

        public HotelsController(
            IAmadeusHotelService amadeusHotelService,
            AppDbContext dbContext,
            ICurrentUserService currentUserService,
            ILogger<HotelsController> logger)
        {
            _amadeusHotelService = amadeusHotelService;
            _dbContext = dbContext;
            _currentUserService = currentUserService;
            _logger = logger;
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
                var hotels = await _amadeusHotelService.SearchHotelsAsync(cityCode.Trim().ToUpper(), checkInDate, checkOutDate, adults, rooms);
                return Ok(hotels);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during hotel search for city {City}", cityCode);
                return StatusCode(500, new { message = ex.Message });
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
                var offer = await _amadeusHotelService.GetOfferDetailsAsync(offerId.Trim());
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
            try
            {
                offerDetails = await _amadeusHotelService.GetOfferDetailsAsync(request.OfferId.Trim());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Provider failure during offer revalidation before booking OfferId: {OfferId}", request.OfferId);
                return StatusCode(500, new { message = "Unable to revalidate offer with provider." });
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
                        CheckInDate = offerDetails.CheckInDate,
                        CheckOutDate = offerDetails.CheckOutDate,
                        Adults = offerDetails.Beds > 0 ? offerDetails.Beds : 1, // Adults mapped from offer
                        Rooms = offerDetails.RoomQuantity,
                        Price = offerDetails.Price,
                        Currency = offerDetails.Currency,
                        Status = "Booked",
                        CreatedAt = DateTime.UtcNow
                    };

                    _dbContext.HotelReservations.Add(reservation);
                    await _dbContext.SaveChangesAsync();

                    // 2. Call Amadeus Booking API
                    HotelBookingResponseDto amadeusBooking;
                    try
                    {
                        amadeusBooking = await _amadeusHotelService.BookHotelAsync(
                            offerDetails.OfferId,
                            reservation.GuestName,
                            reservation.GuestEmail,
                            reservation.GuestPhone,
                            userId!);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Amadeus booking provider call failed for OfferId {OfferId}", offerDetails.OfferId);
                        // Rollback local db entry
                        await transaction.RollbackAsync();
                        return BadRequest(new { message = $"Booking failed at provider: {ex.Message}" });
                    }

                    // 3. Update database record with provider details
                    reservation.ProviderBookingId = amadeusBooking.ProviderBookingId;
                    reservation.Status = "Confirmed";
                    reservation.UpdatedAt = DateTime.UtcNow;

                    await _dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    var responseDto = new HotelBookingResponseDto
                    {
                        BookingId = reservation.Id,
                        BookingReference = reservation.BookingReference,
                        ProviderBookingId = reservation.ProviderBookingId,
                        HotelId = reservation.HotelId,
                        HotelName = reservation.HotelName,
                        OfferId = reservation.OfferId,
                        UserId = reservation.UserId,
                        GuestName = reservation.GuestName,
                        GuestEmail = reservation.GuestEmail,
                        GuestPhone = reservation.GuestPhone,
                        CheckInDate = reservation.CheckInDate,
                        CheckOutDate = reservation.CheckOutDate,
                        Adults = reservation.Adults,
                        Rooms = reservation.Rooms,
                        Price = reservation.Price,
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
                        BookingId = x.Id,
                        BookingReference = x.BookingReference,
                        HotelName = x.HotelName,
                        Dates = $"{x.CheckInDate:dd MMM yyyy} - {x.CheckOutDate:dd MMM yyyy}",
                        Amount = x.Price,
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
        [HttpPost("bookings/{bookingId:int}/cancel")]
        [Authorize]
        public async Task<IActionResult> Cancel(int bookingId, [FromQuery] string? reason)
        {
            _logger.LogInformation("Cancel hotel booking request received: BookingId: {BookingId}, Reason: {Reason}", bookingId, reason);

            if (!_currentUserService.IsAuthenticated())
            {
                return Unauthorized(new { message = "Please login to continue booking." });
            }
            var userId = _currentUserService.GetUserOrGuestId();

            var strategy = _dbContext.Database.CreateExecutionStrategy();
            try
            {
                return await strategy.ExecuteAsync<IActionResult>(async () =>
                {
                    await using var transaction = await _dbContext.Database.BeginTransactionAsync();

                    var booking = await _dbContext.HotelReservations
                        .FirstOrDefaultAsync(x => x.Id == bookingId && x.UserId == userId);

                    if (booking == null)
                    {
                        return NotFound(new { message = "Booking not found." });
                    }

                    if (booking.Status == "Cancelled")
                    {
                        return BadRequest(new { message = "Booking is already cancelled." });
                    }

                    bool amadeusCancelled = false;
                    if (!string.IsNullOrEmpty(booking.ProviderBookingId))
                    {
                        amadeusCancelled = await _amadeusHotelService.CancelBookingAsync(booking.ProviderBookingId);
                        if (!amadeusCancelled)
                        {
                            _logger.LogWarning("Cancellation at Amadeus provider was unsuccessful for BookingId {BookingId}, proceeding with local cancellation only.", bookingId);
                        }
                    }

                    booking.Status = "Cancelled";
                    booking.CancelledAt = DateTime.UtcNow;
                    booking.CancellationReason = string.IsNullOrWhiteSpace(reason) ? "Cancelled by user" : reason.Trim();
                    booking.UpdatedAt = DateTime.UtcNow;

                    await _dbContext.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new HotelCancellationDto
                    {
                        BookingId = booking.Id,
                        BookingReference = booking.BookingReference,
                        Status = booking.Status,
                        CancelledAt = DateTime.SpecifyKind(booking.CancelledAt.Value, DateTimeKind.Utc),
                        CancellationReason = booking.CancellationReason,
                        Message = amadeusCancelled 
                            ? "Booking cancelled successfully at provider and locally." 
                            : "Booking cancelled locally. Provider API cancellation was unavailable or returned error."
                    });
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected failure during booking cancellation: BookingId {BookingId}", bookingId);
                return StatusCode(500, new { message = "Cancellation process encountered an error." });
            }
        }

    }
}
