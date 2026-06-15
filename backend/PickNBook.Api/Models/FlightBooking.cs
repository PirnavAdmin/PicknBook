namespace PickNBook.Api.Models
{
    public class FlightBooking
    {
        public int Id { get; set; }
        public string FlightNumber { get; set; } = string.Empty;
        public string Airline { get; set; } = string.Empty;
        public string FromCity { get; set; } = string.Empty;
        public string ToCity { get; set; } = string.Empty;
        public DateTime DepartureTime { get; set; }
        public DateTime ArrivalTime { get; set; }
        public decimal PriceInr { get; set; }
        public int AvailableSeats { get; set; }
        public int TotalSeats { get; set; }
        public string CabinClass { get; set; } = "Economy";
    }
}
