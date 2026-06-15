using System;

namespace PickNBook.Api.Models
{
    public class HotelReservation
    {
        public int Id { get; set; }
        public string BookingReference { get; set; } = string.Empty;
        public string? ProviderBookingId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string HotelId { get; set; } = string.Empty;
        public string HotelName { get; set; } = string.Empty;
        public string OfferId { get; set; } = string.Empty;
        public string CityCode { get; set; } = string.Empty;
        public string GuestName { get; set; } = string.Empty;
        public string GuestEmail { get; set; } = string.Empty;
        public string GuestPhone { get; set; } = string.Empty;
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public int Adults { get; set; }
        public int Rooms { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = "Booked"; // Booked, Confirmed, Cancelled
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? CancellationReason { get; set; }
    }
}
