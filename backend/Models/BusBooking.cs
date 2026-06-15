namespace PickNBook.Api.Models
{
    public class BusBooking
    {
        public int Id { get; set; }
        public string BusNumber { get; set; } = string.Empty;
        public string OperatorName { get; set; } = string.Empty;
        public string BusType { get; set; } = string.Empty;
        public string GstCategory { get; set; } = "AC";
        public string FromCity { get; set; } = string.Empty;
        public string ToCity { get; set; } = string.Empty;
        public DateTime DepartureTime { get; set; }
        public DateTime ArrivalTime { get; set; }
        public decimal PriceInr { get; set; }
        public int AvailableSeats { get; set; }
        public int TotalSeats { get; set; }
        public string BoardingPoint { get; set; } = string.Empty;
        public string DroppingPoint { get; set; } = string.Empty;
        public string? BoardingPointsJson { get; set; }
        public string? DroppingPointsJson { get; set; }
    }
}
