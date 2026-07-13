using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using PickNBook.Api.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace PickNBook.Api.Controllers;

[Route("api/admin/hotel")]
public class AdminHotelController : AdminApiController
{
    private readonly AppDbContext _context;
    private readonly IHotelService _hotelService;
    private readonly ILogger<AdminHotelController> _logger;

    public AdminHotelController(AppDbContext context, IHotelService hotelService, ILogger<AdminHotelController> logger)
    {
        _context = context;
        _hotelService = hotelService;
        _logger = logger;
    }

    // 1. List All Bookings: GET /api/admin/hotel/bookings
    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings([FromQuery] string? passengerPhone, [FromQuery] string? status)
    {
        _logger.LogInformation("Retrieving all hotel bookings for admin. Phone: {Phone}, Status: {Status}", passengerPhone, status);
        
        var query = _context.HotelReservations.AsQueryable();

        if (!string.IsNullOrWhiteSpace(passengerPhone))
        {
            query = query.Where(b => b.GuestPhone.Contains(passengerPhone.Trim()));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(b => b.Status == status.Trim());
        }

        var list = await query
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                BookingId = b.Id,
                BookingReference = b.BookingReference,
                ProviderBookingId = b.ProviderBookingId,
                HotelId = b.HotelId,
                HotelName = b.HotelName,
                GuestName = b.GuestName,
                GuestEmail = b.GuestEmail,
                GuestPhone = b.GuestPhone,
                CheckInDate = b.CheckInDate.ToString("yyyy-MM-dd"),
                CheckOutDate = b.CheckOutDate.ToString("yyyy-MM-dd"),
                Adults = b.Adults,
                Rooms = b.Rooms,
                TotalPrice = b.TotalPrice,
                Currency = b.Currency,
                Status = b.Status,
                CreatedAt = DateTime.SpecifyKind(b.CreatedAt, DateTimeKind.Utc)
            })
            .ToListAsync();

        return Ok(list);
    }

    // 2. Cancellation Reports: GET /api/admin/hotel/cancellations
    [HttpGet("cancellations")]
    public async Task<IActionResult> GetCancellations()
    {
        _logger.LogInformation("Retrieving hotel cancellation reports for admin.");

        var cancellations = await _context.HotelReservations
            .Where(b => b.Status == "Cancelled")
            .OrderByDescending(b => b.CancelledAt)
            .Select(b => new
            {
                BookingId = "HB-" + b.Id.ToString("D4"),
                BookingReference = b.BookingReference,
                HotelName = b.HotelName,
                PassengerName = b.GuestName,
                PassengerPhone = b.GuestPhone,
                BookedAtUtc = DateTime.SpecifyKind(b.CreatedAt, DateTimeKind.Utc),
                CancelledAtUtc = b.CancelledAt.HasValue ? DateTime.SpecifyKind(b.CancelledAt.Value, DateTimeKind.Utc) : (DateTime?)null,
                CancellationReason = b.CancellationReason,
                TotalPriceInr = b.TotalPrice,
                RefundAmountInr = b.RefundAmount,
                CancellationChargesInr = b.CancellationCharges,
                Status = "cancelled"
            })
            .ToListAsync();

        return Ok(cancellations);
    }

    // 3. Cancel Booking (Admin Override): POST /api/admin/hotel/bookings/{bookingId}/cancel
    [HttpPost("bookings/{bookingId:int}/cancel")]
    public async Task<IActionResult> CancelBooking(int bookingId, [FromBody] AdminCancelHotelBookingRequestDto request)
    {
        _logger.LogInformation("Admin override cancellation request for BookingId: {BookingId}, Reason: {Reason}", bookingId, request.Reason);

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var booking = await _context.HotelReservations
            .FirstOrDefaultAsync(b => b.Id == bookingId);

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
            try
            {
                providerCancelled = await _hotelService.CancelBookingAsync(booking.ProviderBookingId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to cancel booking with provider during admin override. ProviderBookingId: {Id}", booking.ProviderBookingId);
            }
        }

        // Release coupon usage if applicable
        if (!string.IsNullOrEmpty(booking.CouponCode))
        {
            var usage = await _context.HotelCouponUsages
                .FirstOrDefaultAsync(u => u.HotelReservationId == bookingId);
            if (usage != null)
            {
                usage.BookingStatus = "Cancelled";
            }

            var coupon = await _context.HotelCoupons
                .FirstOrDefaultAsync(c => c.CouponCode == booking.CouponCode);
            if (coupon != null && coupon.UsedCount > 0)
            {
                coupon.UsedCount -= 1;
            }
        }

        booking.Status = "Cancelled";
        booking.CancelledAt = DateTime.UtcNow;
        booking.CancellationReason = string.IsNullOrWhiteSpace(request.Reason) ? "Cancelled by admin" : request.Reason.Trim();
        booking.CancellationCharges = request.CancellationCharges;
        booking.RefundAmount = Math.Max(0m, booking.TotalPrice - request.CancellationCharges);
        booking.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            BookingId = booking.Id,
            BookingReference = booking.BookingReference,
            Status = booking.Status,
            CancelledAt = booking.CancelledAt,
            CancellationReason = booking.CancellationReason,
            CancellationCharges = booking.CancellationCharges,
            RefundAmount = booking.RefundAmount,
            Message = providerCancelled 
                ? "Booking cancelled successfully at provider and locally." 
                : "Booking cancelled locally. Provider API cancellation was unavailable or returned error."
        });
    }

    // 4. Search History Logs: GET /api/admin/hotel/search-history
    [HttpGet("search-history")]
    public async Task<IActionResult> GetSearchHistory([FromQuery] string? searchTerm)
    {
        _logger.LogInformation("Retrieving hotel search history for admin. SearchTerm: {SearchTerm}", searchTerm);
        
        var query = _context.HotelSearchLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLowerInvariant();
            query = query.Where(s => s.SearchQuery.ToLower().Contains(term) || (s.UserId != null && s.UserId.ToLower().Contains(term)));
        }

        var list = await query
            .OrderByDescending(s => s.SearchedAtUtc)
            .Select(s => new
            {
                SearchId = "sh-" + s.Id,
                SearchQuery = MapCityCodeToName(s.SearchQuery),
                CheckInDate = s.CheckInDate.ToString("yyyy-MM-dd"),
                CheckOutDate = s.CheckOutDate.ToString("yyyy-MM-dd"),
                Adults = s.Adults,
                Rooms = s.Rooms,
                UserId = s.UserId,
                SearchedAtUtc = DateTime.SpecifyKind(s.SearchedAtUtc, DateTimeKind.Utc)
            })
            .ToListAsync();

        return Ok(list);
    }

    private static string MapCityCodeToName(string code)
    {
        var upper = code.Trim().ToUpperInvariant();
        return upper switch
        {
            "DEL" => "New Delhi (DEL)",
            "HYD" => "Hyderabad (HYD)",
            "BOM" => "Mumbai (BOM)",
            "BLR" => "Bengaluru (BLR)",
            "MAA" => "Chennai (MAA)",
            "CCU" => "Kolkata (CCU)",
            "GOI" => "Goa (GOI)",
            "PNQ" => "Pune (PNQ)",
            _ => $"{upper} ({upper})"
        };
    }
}

public class AdminCancelHotelBookingRequestDto
{
    public string Reason { get; set; } = "Cancelled by admin";
    public decimal CancellationCharges { get; set; } = 0m;
}
