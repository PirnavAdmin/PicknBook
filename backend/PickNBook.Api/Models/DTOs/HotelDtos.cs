using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace PickNBook.Api.Models.DTOs
{
    public class HotelSearchRequestDto
    {
        [Required]
        public string CityCode { get; set; } = string.Empty;

        [Required]
        public DateTime CheckInDate { get; set; }

        [Required]
        public DateTime CheckOutDate { get; set; }

        public int Adults { get; set; } = 1;
        public int Rooms { get; set; } = 1;
    }

    public class HotelOfferDto
    {
        public string OfferId { get; set; } = string.Empty;
        public string HotelId { get; set; } = string.Empty;
        public string HotelName { get; set; } = string.Empty;
        public string CityCode { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string Address { get; set; } = string.Empty;
        public string CheckInDate { get; set; } = string.Empty;
        public string CheckOutDate { get; set; } = string.Empty;
        public int RoomQuantity { get; set; }
        public string RoomCategory { get; set; } = string.Empty;
        public string BedType { get; set; } = string.Empty;
        public int Beds { get; set; }
        public string RoomDescription { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
        public DateTime? CancellationDeadline { get; set; }
        public string CancellationPolicy { get; set; } = string.Empty;
        public string CheckInTime { get; set; } = string.Empty;
        public string CheckOutTime { get; set; } = string.Empty;
        public string PaymentType { get; set; } = string.Empty;
    }

    public class HotelSearchResponseDto
    {
        public string HotelId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string CityCode { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string Address { get; set; } = string.Empty;
        public double Rating { get; set; }
        public List<string> Images { get; set; } = new();
        public List<string> Amenities { get; set; } = new();
        public List<HotelOfferDto> Offers { get; set; } = new();
    }

    public class HotelBookingRequestDto
    {
        [Required]
        public string OfferId { get; set; } = string.Empty;

        [Required]
        public string GuestName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string GuestEmail { get; set; } = string.Empty;

        [Required]
        public string GuestPhone { get; set; } = string.Empty;

        public string? CouponCode { get; set; }
        public string? PaymentMethod { get; set; }
    }

    public class HotelBookingResponseDto
    {
        public string BookingId { get; set; } = string.Empty;
        public string BookingReference { get; set; } = string.Empty;
        public string? ProviderBookingId { get; set; }
        public string HotelId { get; set; } = string.Empty;
        public string HotelName { get; set; } = string.Empty;
        public string OfferId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string GuestName { get; set; } = string.Empty;
        public string GuestEmail { get; set; } = string.Empty;
        public string GuestPhone { get; set; } = string.Empty;
        public string CheckInDate { get; set; } = string.Empty;
        public string CheckOutDate { get; set; } = string.Empty;
        public int Adults { get; set; }
        public int Rooms { get; set; }
        public decimal Price { get; set; }
        public decimal NetPrice { get; set; }
        public decimal MarkupAmount { get; set; }
        public decimal BasePrice { get; set; }
        public decimal ConvenienceFee { get; set; }
        public decimal GstPercent { get; set; }
        public decimal GstAmount { get; set; }
        public decimal TotalPrice { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = "Booked";
        public DateTime CreatedAt { get; set; }
    }

    public class HotelBookingHistoryDto
    {
        public string BookingId { get; set; } = string.Empty;
        public string BookingReference { get; set; } = string.Empty;
        public string HotelId { get; set; } = string.Empty;
        public string HotelName { get; set; } = string.Empty;
        public string Dates { get; set; } = string.Empty; // e.g. "12 Jun 2026 - 15 Jun 2026"
        public string CheckInDate { get; set; } = string.Empty;
        public string CheckOutDate { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ProviderBookingId { get; set; }
        public string GuestName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class HotelCancellationDto
    {
        public string BookingId { get; set; } = string.Empty;
        public string BookingReference { get; set; } = string.Empty;
        public string Status { get; set; } = "Cancelled";
        public DateTime CancelledAt { get; set; }
        public string CancellationReason { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
