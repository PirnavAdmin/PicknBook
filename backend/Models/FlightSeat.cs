namespace PickNBook.Api.Models
{
    public class FlightSeat
    {
        public int Id { get; set; }
        public int FlightBookingId { get; set; }
        public string TravelClass { get; set; } = string.Empty;
        public string SeatCode { get; set; } = string.Empty;
        public bool IsBooked { get; set; }
    }
}
