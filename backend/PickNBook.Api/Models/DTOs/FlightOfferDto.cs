public class FlightOfferDto
{
    public string Airline { get; set; }
    public string Origin { get; set; }
    public string Destination { get; set; }

    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }

    public decimal Price { get; set; }
    public string Currency { get; set; }

    public int AvailableSeats { get; set; }
    public bool IsLimitedSeats { get; set; }
    public int StopsCount { get; set; }

    public int DurationMinutes { get; set; }

    // Segment & fare details (parsed from travelerPricings)
    public string? Cabin { get; set; }
    public string? BrandedFare { get; set; }
    public string? BrandedFareLabel { get; set; }
    public decimal? CheckedBagsWeight { get; set; }
    public string? CheckedBagsUnit { get; set; }
    public int? CheckedBagsQuantity { get; set; }
    public decimal? CabinBagsWeight { get; set; }
    public string? CabinBagsUnit { get; set; }
    public int? CabinBagsQuantity { get; set; }
}

