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
}
