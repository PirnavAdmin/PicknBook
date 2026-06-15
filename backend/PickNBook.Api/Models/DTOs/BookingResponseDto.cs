namespace PickNBook.Api.Models.DTOs;

public class BookingResponseDto
{
    public int BookingId { get; set; }
    public string BookingReference { get; set; } = string.Empty;
    public string Pnr { get; set; } = string.Empty;
    public string TripType { get; set; } = string.Empty;
    public int TripId { get; set; }
    public string TripNumber { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public string FromCity { get; set; } = string.Empty;
    public string ToCity { get; set; } = string.Empty;
    public DateTime DepartureTimeUtc { get; set; }
    public DateTime ArrivalTimeUtc { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PassengerName { get; set; } = string.Empty;
    public string PassengerPhone { get; set; } = string.Empty;
    public string? PassengerEmail { get; set; }
    public string TravelClass { get; set; } = "Economy";
    public int Adults { get; set; }
    public int Children { get; set; }
    public int Infants { get; set; }
    public int SeatsBooked { get; set; }
    public decimal TotalPriceInr { get; set; }
    public DateTime BookedAtUtc { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
    public string? CancellationReason { get; set; }
}

public class CreateFlightBookingRequestDto
{
    public string PassengerName { get; set; } = string.Empty;
    public string PassengerPhone { get; set; } = string.Empty;
    public string? PassengerEmail { get; set; }
    public string? CouponCode { get; set; }
    public int? SelectedPromotionId { get; set; }
    public int Adults { get; set; } = 1;
    public int Children { get; set; }
    public int Infants { get; set; }
    public string TravelClass { get; set; } = "Economy";
    public List<CreateFlightPassengerDto> Passengers { get; set; } = [];
}

public class CreateFlightPassengerDto
{
    public string FullName { get; set; } = string.Empty;
    public string PassengerType { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
}

public class FlightPassengerResponseDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PassengerType { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public string? SeatNumber { get; set; }
    public bool IsCancelled { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
}

public class CreateBusBookingRequestDto
{
    public string PassengerName { get; set; } = string.Empty;
    public string PassengerPhone { get; set; } = string.Empty;
    public string? PassengerEmail { get; set; }
    public string? CouponCode { get; set; }
    public int Seats { get; set; } = 1; // legacy fallback
    public List<CreateBusPassengerDto> Passengers { get; set; } = [];
    public int? PromotionId { get; set; }
    public int? SelectedFeaturedOfferId { get; set; }
}

public class CreateBusPassengerDto
{
    public string FullName { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public string? SeatNumber { get; set; }
    public int Age { get; set; }
}

public class BusPassengerResponseDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public string SeatNumber { get; set; } = string.Empty;
    public int Age { get; set; }
    public bool IsCancelled { get; set; }
    public DateTime? CancelledAtUtc { get; set; }
}

public class CancelPassengersRequestDto
{
    public List<int> PassengerIds { get; set; } = new();
    public string? Reason { get; set; }
}
