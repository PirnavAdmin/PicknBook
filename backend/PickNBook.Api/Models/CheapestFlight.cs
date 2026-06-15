namespace PickNBook.Api.Models
{
    public class CheapestFlight
    {
        public int Id { get; set; }

        public string Origin { get; set; }
        public string Destination { get; set; }
        public string Airline { get; set; }

        public decimal Price { get; set; }

        public DateTime DepartureDate { get; set; }
        public DateTime ArrivalDate { get; set; }
        public string Currency { get; set; } = "INR";
        public int AvailableSeats { get; set; }
        public bool IsLimitedSeats { get; set; }
        public int StopsCount { get; set; }
        public int DurationMinutes { get; set; }

        public DateTime RecordedAt { get; set; }
    }
}
